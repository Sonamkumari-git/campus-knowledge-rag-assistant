import { useMemo, useState } from "react";
import { ArrowUp, BookOpen, Check, Clipboard, FileText, Loader2, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Streamdown } from "streamdown";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type Message = { role: "user" | "assistant"; content: string; sources?: Array<{ documentName: string; page: number; section: string; excerpt: string; score: number }>; grounded?: boolean; latencyMs?: number };

const suggested = ["What are the attendance requirements?", "When are the semester examinations?", "What are the hostel rules?", "How can I apply for a scholarship?"];

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const ask = trpc.chat.ask.useMutation();
  const feedback = trpc.feedback.submit.useMutation();
  const hasConversation = messages.length > 0;
  const latestAssistant = useMemo(() => [...messages].reverse().find(message => message.role === "assistant"), [messages]);

  const submit = async (value = question) => {
    const clean = value.trim();
    if (!clean || ask.isPending) return;
    setQuestion("");
    setMessages(current => [...current, { role: "user", content: clean }]);
    try {
      const result = await ask.mutateAsync({ question: clean, history: messages.map(message => ({ role: message.role, content: message.content })) });
      setMessages(current => [...current, { role: "assistant", content: result.answer, sources: result.sources, grounded: result.grounded, latencyMs: result.latencyMs }]);
    } catch {
      setMessages(current => [...current, { role: "assistant", content: "I’m unable to reach the knowledge service right now. Please try again in a moment.", grounded: false }]);
    }
  };

  return (
    <div className="page chat-page">
      <div className="chat-header"><div><div className="eyebrow"><span className="eyebrow-dot" /> Campus Knowledge Assistant</div><h1>Ask anything about your campus.</h1><p>Answers are generated from official documents in your knowledge base.</p></div><div className="chat-header-meta"><span className="secure-label"><Check size={14} /> Grounded responses</span><Link href="/explorer" className="small-outline"><BookOpen size={14} /> Browse sources</Link></div></div>
      <div className={`chat-canvas ${hasConversation ? "has-messages" : ""}`}>
        {!hasConversation ? <div className="chat-empty"><div className="empty-orb"><Sparkles size={25} /></div><h2>Where should we start?</h2><p>Ask about academics, exams, housing, scholarships, admissions, or library services.</p><div className="suggested-grid">{suggested.map(item => <button key={item} onClick={() => void submit(item)}>{item}<ArrowUp size={14} /></button>)}</div></div> : <div className="message-list">{messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}>{message.role === "assistant" && <div className="message-avatar"><Sparkles size={14} /></div>}<div className="message-bubble">{message.role === "assistant" ? <Streamdown>{message.content}</Streamdown> : <p>{message.content}</p>}{message.role === "assistant" && message.sources && message.sources.length > 0 && <div className="sources-box"><div className="sources-title"><span><BookOpen size={14} /> Sources</span><span className="verified-source"><Check size={12} /> Verified context</span></div>{message.sources.map(source => <div className="source-row" key={`${source.documentName}-${source.page}`}><div className="source-doc-icon"><FileText size={15} /></div><div className="source-detail"><strong>{source.documentName}</strong><span>{source.section} · Page {source.page}</span><small>{source.excerpt}</small></div><span className="source-match">{source.score}% match</span></div>)}</div>}{message.role === "assistant" && <div className="message-actions"><button onClick={() => navigator.clipboard?.writeText(message.content)}><Clipboard size={13} /> Copy</button><button onClick={() => latestAssistant && void submit(messages[index - 1]?.content || "")}><RefreshCw size={13} /> Regenerate</button><span className="action-spacer" />{message.grounded && <span className="latency">{message.latencyMs}ms</span>}<button aria-label="Helpful" onClick={() => void feedback.mutateAsync({ value: "positive", question: message.content })}><ThumbsUp size={13} /></button><button aria-label="Not helpful" onClick={() => void feedback.mutateAsync({ value: "negative", question: message.content })}><ThumbsDown size={13} /></button></div>}</div></div>)}</div>}
        {ask.isPending && <div className="typing-row"><div className="message-avatar"><Sparkles size={14} /></div><div className="typing-bubble"><span /><span /><span /> <em>Checking the knowledge base</em></div></div>}
        <div className="composer-wrap"><div className="composer"><textarea value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Ask about your campus..." rows={1} aria-label="Ask a campus question" /><button className="send-button" onClick={() => void submit()} disabled={!question.trim() || ask.isPending} aria-label="Send question">{ask.isPending ? <Loader2 size={16} className="spin" /> : <ArrowUp size={17} />}</button></div><div className="composer-hint"><span>AI can make mistakes. Verify important information with the original document.</span><span>Press <kbd>Enter</kbd> to send</span></div></div>
      </div>
      {hasConversation && <button className="clear-chat" onClick={() => setMessages([])}><X size={13} /> Clear conversation</button>}
    </div>
  );
}
