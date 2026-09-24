import { BookOpen, ChevronDown, LayoutDashboard, LogIn, MessageSquare, Search, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Search }) {
  const [location] = useLocation();
  const active = href === "/" ? location === "/" : location.startsWith(href);
  return <Link href={href} className={`nav-item ${active ? "nav-item-active" : ""}`}><Icon size={17} strokeWidth={active ? 2.4 : 1.9} /><span>{label}</span></Link>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  return <div className="app-frame">
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Campus Knowledge AI home"><span className="brand-mark"><Sparkles size={17} /></span><span>campus<span className="brand-accent">ai</span></span></Link>
      <nav className="main-nav" aria-label="Primary navigation"><NavItem href="/chat" label="Ask AI" icon={MessageSquare} /><NavItem href="/explorer" label="Explore" icon={Search} /><NavItem href="/documents" label="Documents" icon={BookOpen} /><NavItem href="/admin" label="Admin" icon={LayoutDashboard} /></nav>
      <div className="topbar-actions"><span className="status-pill"><span className="status-dot" /> Knowledge base live</span>{isAuthenticated ? <button className="user-chip" onClick={() => void logout()} title="Sign out"><span className="avatar">{(user?.name || "U").slice(0, 1).toUpperCase()}</span><span className="user-name">{user?.name || "Student"}</span><ChevronDown size={15} /></button> : <button className="login-button" onClick={() => window.location.assign("/api/oauth/login")}><LogIn size={15} /> Sign in</button>}</div>
    </header>
    <main className="app-main">{children}</main>
    <footer className="site-footer"><div><span className="footer-logo">campus<span className="brand-accent">ai</span></span> <span className="footer-muted">/ Grounded campus intelligence</span></div><div className="footer-links"><span>Official documents only</span><span>•</span><span>Built for clarity</span></div></footer>
  </div>;
}
