import { ArrowRight, BookOpen, Check, FileText, LockKeyhole, MessageSquare, Search, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const features = [
  { icon: MessageSquare, title: "Ask naturally", text: "Get clear answers to everyday campus questions without digging through folders." },
  { icon: ShieldCheck, title: "Grounded by source", text: "Every answer traces back to indexed campus documents and visible excerpts." },
  { icon: Search, title: "Find the exact place", text: "Explore policy sections, page numbers, and the wording behind the answer." },
];

export default function Home() {
  const stats = trpc.workspace.stats.useQuery();
  return (
    <div className="page home-page">
      <section className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> The campus source of truth</div>
          <h1>Clarity for every<br /><em>campus question.</em></h1>
          <p className="hero-lead">Campus AI turns official university documents into answers that are clear, traceable, and ready when students need them.</p>
          <div className="hero-actions">
            <Link href="/chat" className="button-primary">Ask Campus AI <ArrowRight size={17} /></Link>
            <Link href="/explorer" className="button-secondary">Explore knowledge <Search size={16} /></Link>
          </div>
          <div className="trust-row"><div className="avatar-stack"><span>AR</span><span>MK</span><span>JD</span></div><span>Trusted by 86 campus users this week</span></div>
        </div>
        <div className="hero-art" aria-label="Preview of a grounded campus answer">
          <div className="art-glow" />
          <div className="answer-window">
            <div className="window-top"><div className="window-title"><span className="mini-mark"><Sparkles size={12} /></span> Campus AI <span className="live-tag">LIVE</span></div><span className="window-dots">•••</span></div>
            <div className="window-body">
              <div className="chat-question">What attendance do I need for exams?</div>
              <div className="chat-answer"><div className="answer-avatar"><Sparkles size={13} /></div><div><p>Students must maintain at least <strong>75% attendance</strong> in each registered course to be eligible for the end-semester examination.</p><div className="answer-source"><FileText size={12} /><span>Academic Rules & Regulations.pdf</span><span className="source-page">p. 12</span></div></div></div>
            </div>
            <div className="window-input"><span>Ask a follow-up question...</span><span className="send-orb"><ArrowRight size={14} /></span></div>
          </div>
          <div className="float-card float-card-top"><span className="float-icon green"><Check size={14} /></span><span><b>Source verified</b><small>Official document match</small></span></div>
          <div className="float-card float-card-bottom"><span className="float-icon purple"><BookOpen size={14} /></span><span><b>6 documents indexed</b><small>1,284 answers supported</small></span></div>
        </div>
      </section>

      <section className="metric-strip">
        <div><strong>{stats.data?.documents ?? 6}</strong><span>documents indexed</span></div>
        <div><strong>{stats.data?.chunks ?? 455}</strong><span>knowledge chunks</span></div>
        <div><strong>{stats.data?.helpfulRate ?? 94}%</strong><span>helpful answers</span></div>
        <div><strong>24/7</strong><span>student access</span></div>
      </section>

      <section className="section-block feature-section"><div className="section-kicker">WHY CAMPUS AI</div><h2>Not just answers.<br /><span>Answers you can trust.</span></h2><p className="section-intro">Campus AI is designed around one simple principle: institutional knowledge should stay tied to the document it came from.</p><div className="feature-grid">{features.map(({ icon: Icon, title, text }) => <div className="feature-card" key={title}><div className="feature-icon"><Icon size={19} /></div><h3>{title}</h3><p>{text}</p><ArrowRight size={17} className="feature-arrow" /></div>)}</div></section>

      <section className="how-section"><div className="how-copy"><div className="section-kicker">HOW IT WORKS</div><h2>From document<br /><span>to confidence.</span></h2><p>Each response moves through a transparent retrieval flow before it reaches you.</p><Link href="/chat" className="text-link">See it in action <ArrowRight size={15} /></Link></div><div className="steps"><div className="step"><span className="step-number">01</span><div><h3>Ask</h3><p>Type your question in everyday language.</p></div></div><div className="step"><span className="step-number">02</span><div><h3>Retrieve</h3><p>We find the most relevant official passages.</p></div></div><div className="step"><span className="step-number">03</span><div><h3>Answer</h3><p>Receive a concise explanation with sources.</p></div></div></div></section>

      <section className="cta-banner"><div><div className="section-kicker light">READY WHEN YOU ARE</div><h2>Stop searching.<br />Start knowing.</h2></div><Link href="/chat" className="button-light">Open the assistant <ArrowRight size={17} /></Link></section>
    </div>
  );
}
