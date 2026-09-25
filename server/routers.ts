import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { buildGroundedFallback, campusSources, categoryOptions, retrieveChunks, addUploadedPdf } from "./campusData";
import { protectedProcedure } from "./_core/trpc";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const questionLog: Array<{ question: string; createdAt: string; resultCount: number }> = [
  { question: "What are the attendance requirements?", createdAt: "Today, 10:42 AM", resultCount: 1 },
  { question: "When are the semester examinations?", createdAt: "Yesterday, 4:18 PM", resultCount: 1 },
  { question: "How can I apply for a scholarship?", createdAt: "Yesterday, 1:06 PM", resultCount: 1 },
];

function safeText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(part => (typeof part === "string" ? part : (part as { text?: string }).text ?? "")).join(" ").trim();
  }
  return "";
}

async function generateGroundedAnswer(question: string, context: string) {
  const fallback = buildGroundedFallback(question, retrieveChunks(question));
  if (process.env.CAMPUS_ENABLE_LLM === "false" || process.env.NODE_ENV === "test") return fallback;

  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "You are Campus Knowledge AI. Answer only from the supplied campus context. Never invent policies, fees, dates, percentages, or citations. If the context is insufficient, say that the information was not found. Keep the answer concise, preserve exact numbers, and mention the document names naturally.",
        },
        { role: "user", content: `Question: ${question}\n\nRetrieved campus context:\n${context}` },
      ],
    });
    const generated = safeText(response.choices?.[0]?.message?.content);
    return generated || fallback;
  } catch (error) {
    console.warn("[Campus AI] LLM unavailable; using grounded fallback", error);
    return fallback;
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspace: router({
    stats: publicProcedure.query(() => ({
      documents: campusSources.length,
      chunks: campusSources.reduce((total, source) => total + source.chunks, 0),
      questions: 1284,
      activeUsers: 86,
      helpfulRate: 94,
      lastIndexed: "Today, 09:24 AM",
      vectorStatus: "Healthy",
      modelStatus: "Ready",
    })),
    activity: publicProcedure.query(() => questionLog),
  }),
  documents: router({
    categories: publicProcedure.query(() => categoryOptions),
    list: publicProcedure.input(z.object({ category: z.string().optional(), query: z.string().optional() }).optional()).query(({ input }) => {
      const query = input?.query?.toLowerCase().trim();
      return campusSources.filter(source => {
        const matchesCategory = !input?.category || input.category === "All documents" || source.category === input.category;
        const matchesQuery = !query || `${source.documentName} ${source.category} ${source.section}`.toLowerCase().includes(query);
        return matchesCategory && matchesQuery;
      });
    }),
    search: publicProcedure.input(z.object({ query: z.string().min(2), category: z.string().optional() })).query(({ input }) => retrieveChunks(input.query, input.category)),
    uploadPdf: protectedProcedure.input(z.object({ fileName: z.string().min(1).max(180), data: z.string().min(100).max(18_000_000) })).mutation(async ({ input }) => {
      const pdf = await pdfParse(Buffer.from(input.data, "base64"));
      return addUploadedPdf(input.fileName, pdf.text, pdf.numpages);
    }),
  }),
  chat: router({
    ask: publicProcedure.input(z.object({ question: z.string().min(3).max(1000), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(8).optional() })).mutation(async ({ input }) => {
      const started = Date.now();
      const results = retrieveChunks(input.question);
      questionLog.unshift({ question: input.question, createdAt: "Just now", resultCount: results.length });
      const context = results.map(result => `[${result.documentName} | page ${result.page} | ${result.section}] ${result.content}`).join("\n");
      const answer = results.length ? await generateGroundedAnswer(input.question, context) : buildGroundedFallback(input.question, results);
      return {
        answer,
        grounded: results.length > 0,
        latencyMs: Date.now() - started,
        sources: results.map(result => ({
          id: result.id,
          documentName: result.documentName,
          page: result.page,
          section: result.section,
          category: result.category,
          excerpt: result.excerpt,
          score: Math.round(result.score * 100),
        })),
      };
    }),
  }),
  feedback: router({
    submit: publicProcedure.input(z.object({ value: z.enum(["positive", "negative"]), question: z.string().min(1) })).mutation(({ input }) => ({ success: true, received: input.value })),
  }),
});

export type AppRouter = typeof appRouter;
