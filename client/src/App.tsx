import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Route, Switch } from "wouter";
import AppShell, { AuthGate } from "./components/AppShell";
import Home from "./pages/Home";
import ChatPage from "./pages/ChatPage";
import ExplorerPage from "./pages/ExplorerPage";
import DocumentsPage from "./pages/DocumentsPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

function Protected({ children, title }: { children: React.ReactNode; title: string }) {
  return <AuthGate title={title}>{children}</AuthGate>;
}

function Router() {
  return <AppShell><Switch>
    <Route path="/" component={Home} />
    <Route path="/chat" component={ChatPage} />
    <Route path="/explorer" component={ExplorerPage} />
    <Route path="/documents">{() => <Protected title="Sign in to manage documents"><DocumentsPage /></Protected>}</Route>
    <Route path="/admin">{() => <Protected title="Sign in to open the admin workspace"><AdminPage /></Protected>}</Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></AppShell>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
