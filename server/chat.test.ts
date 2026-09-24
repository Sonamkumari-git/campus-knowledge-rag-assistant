import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

process.env.CAMPUS_ENABLE_LLM = "false";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("chat.ask", () => {
  it("returns source metadata for a grounded campus question", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.chat.ask({ question: "What attendance percentage is required for exams?" });
    expect(result.grounded).toBe(true);
    expect(result.answer).toContain("75%");
    expect(result.sources[0]?.documentName).toContain("Academic Rules");
  });

  it("does not invent an answer when no source is relevant", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.chat.ask({ question: "What is the fee for a new marine biology course?" });
    expect(result.grounded).toBe(false);
    expect(result.sources).toHaveLength(0);
    expect(result.answer).toContain("couldn't find reliable information");
  });
});
