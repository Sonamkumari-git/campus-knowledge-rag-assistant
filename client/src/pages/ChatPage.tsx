import { useMemo, useRef, useState } from "react";
import { ArrowUp, BookOpen, Check, Clipboard, FileText, Loader2, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, UploadCloud, X } from "lucide-react";
import { Streamdown } from "streamdown";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type Message = { role: "user" | "assistant"; content: string; sources?: Array<{ documentName: string; page: number; section: string; excerpt: string; score: number }>; grounded?: boolean; latencyMs?: number };
const suggested = ["What are the attendance requirements?", "When are the semester examinations?", "What are the hostel rules?", "How can I apply for a scholarship?"];

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const ask = trpc.chat.ask.useMutation();
  const upload = trpc.documents.uploadPdf.useMutation({
    onSuccess: result => setUploadStatus(`${result.documentName} indexed. You can ask questions about it now.`),
    onError: error => setUploadStatus(error.message || "PDF could not be indexed."),
  });
  const feedback = trpc.feedback.submit.useMutation();
  const hasConversation = messages.length > 0;
  const latestAssistant = useMemo(() => [...messages].reverse().find(message => message.role === "assistant"), [messages]);
  const handleUpload = (file?: File) => {
    if (!file) return;
    setUploadStatus("");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadStatus("Please choose a PDF file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setUploadStatus("This PDF is larger than 12 MB. Please choose a smaller file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => upload.mutate({ fileName: file.name, data: String(reader.result).split(",")[1] || "" });
    reader.onerror = () => setUploadStatus("The file could not be read. Please try again.");
    reader.readAsDataURL(file);
  };
  const submit = async (value = question) => {
    const clean = value.trim();
    if (!clean || ask.isPending) return;
    setQuestion("");
    setMessages(current => [...current, { role: "user", content: clean }]);
    try {
      const result = await ask.mutateAsync({ question: clean, history: messages.map(message => ({ role: message.role, content: message.content })) });
      setMessages(current => [...current, { role: "assistant", content: result.answer, sources: result.sources, grounded: result.grounded, latencyMs: result.latencyMs }]);
    } catch { setMessages(current => [...current, { role: "assistant", content: "I’m unable to reach the knowledge service right now. Please try again in a moment.", grounded: false }]); }
  };
  return <div className="page chat-page">
    <div className="chat-header"><div><div className="eyebrow"><span className="eyebrow-dot" /> Campus Knowledge Assistant</div><h1>Ask anything about your campus.</h1><p>Upload a PDF here, wait for indexing, then ask questions grounded in that document.</p></div><div className="chat-header-meta"><span className="secure-label"><Check size={14} /> Grounded responses</span><input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={event => { handleUpload(event.target.files?.[0]); event.currentTarget.value = ""; }} /><button className="small-outline" onClick={() => inputRef.current?.click()} disabled={upload.isPending}><UploadCloud size={14} /> {upload.isPending ? "Indexing..." : "Upload PDF"}</button><Link href="/explorer" className="small-outline"><BookOpen size={14} /> Browse sources</Link></div></div>
    {uploadStatus && <div className={`upload-status ${uploadStatus.includes("indexed") ? "success" : "error"}`}><FileText size={15} /> {uploadStatus}</div>}
    <div className={`chat-canvas ${hasConversation ? "has-messages" : ""}`}>
      {!hasConversation ? <div className="chat-empty"><div className="empty-orb"><Sparkles size={25} /></div><h2>Where should we start?</h2><p>Ask about academics, exams, housing, scholarships, admissions, or your uploaded PDF.</p><div className="suggested-grid">{suggested.map(item => <button key={item} onClick={() => void submit(item)}>{item}<ArrowUp size={14} /></button>)}</div><button className="upload-chat-cta" onClick={() => inputRef.current?.click()} disabled={upload.isPending}><UploadCloud size={15} /> Upload a PDF to ask document-specific questions</button></div> : <div className="message-list">{messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}>{message.role === "assistant" && <div className="message-avatar"><Sparkles size={14} /></div>}<div className="message-bubble">{message.role === "assistant" ? <Streamdown>{message.content}</Streamdown> : <p>{message.content}</p>}{message.role === "assistant" && message.sources && message.sources.length > 0 && <div className="sources-box"><div className="sources-title"><span><BookOpen size={14} /> Sources</span><span className="verified-source"><Check size={12} /> Verified context</span></div>{message.sources.map(source => <div className="source-row" key={`${source.documentName}-${source.page}`}><div className="source-doc-icon"><FileText size={15} /></div><div className="source-detail"><strong>{source.documentName}</strong><span>{source.section} · Page {source.page}</span><small>{source.excerpt}</small></div><span className="source-match">{source.score}% match</span></div>)}</div>}{message.role === "assistant" && <div className="message-actions"><button onClick={() => navigator.clipboard?.writeText(message.content)}><Clipboard size={13} /> Copy</button><button onClick={() => latestAssistant && void submit(messages[index - 1]?.content || "")}><RefreshCw size={13} /> Regenerate</button><span className="action-spacer" />{message.grounded && <span className="latency">{message.latencyMs}ms</span>}<button aria-label="Helpful" onClick={() => void feedback.mutateAsync({ value: "positive", question: message.content })}><ThumbsUp size={13} /></button><button aria-label="Not helpful" onClick={() => void feedback.mutateAsync({ value: "negative", question: message.content })}><ThumbsDown size={13} /></button></div>}</div></div>)}</div>}
      {ask.isPending && <div className="typing-row"><div className="message-avatar"><Sparkles size={14} /></div><div className="typing-bubble"><span /><span /><span /> <em>Checking the knowledge base</em></div></div>}
      <div className="composer-wrap"><div className="composer"><textarea value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Ask about your campus or uploaded PDF..." rows={1} aria-label="Ask a campus question" /><button className="send-button" onClick={() => void submit()} disabled={!question.trim() || ask.isPending} aria-label="Send question">{ask.isPending ? <Loader2 size={16} className="spin" /> : <ArrowUp size={17} />}</button></div><div className="composer-hint"><span>Answers cite the matching official document passages.</span><span>Press <kbd>Enter</kbd> to send</span></div></div>
    </div>{hasConversation && <button className="clear-chat" onClick={() => setMessages([])}><X size={13} /> Clear conversation</button>}
  </div>;
}
