import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/AppShell";
import { Field } from "@/components/ir";

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — IncidentRoom" },
      { name: "description", content: "Sign in or create your IncidentRoom account to coordinate incidents with your team." },
      { property: "og:title", content: "Sign in — IncidentRoom" },
      { property: "og:description", content: "Be ready when things go wrong." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const target = safeNext(next);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: target }); });
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) navigate({ to: target }); });
    return () => sub.subscription.unsubscribe();
  }, [navigate, target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/login`, data: { full_name: name.trim() } },
      });
      if (error) setError(error.message);
      else if (!data.session) setInfo("Check your inbox to confirm your email, then sign in.");
    }
    setBusy(false);
  };

  const google = async () => {
    setError(null);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/login" });
    if (r.error) setError(r.error instanceof Error ? r.error.message : "Google sign-in failed.");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="grid-paper flex flex-col justify-between border-b p-8 lg:border-b-0 lg:border-r lg:p-12">
        <Logo />
        <div className="py-12">
          <h1 className="font-display text-5xl leading-[1.02] sm:text-6xl">Be ready when things go wrong.</h1>
          <p className="mt-4 text-lg text-muted-foreground">Coordinate incidents without losing context.</p>
        </div>
        <span />
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="text-xl font-semibold">{mode === "signin" ? "Sign in" : "Create your account"}</h2>
          {mode === "signup" && <Field label="Your name"><input value={name} onChange={(e) => setName(e.target.value)} className="input" required maxLength={80} autoComplete="name" /></Field>}
          <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required autoComplete="email" /></Field>
          <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </Field>
          {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          {info && <p role="status" className="rounded-md border border-success/40 bg-success/10 p-2 text-sm text-success">{info}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full justify-center !min-h-11">
            {busy ? <><Loader2 className="size-4 animate-spin" /> Please wait…</> : <>{mode === "signin" ? "Enter IncidentRoom" : "Create account"} <ArrowRight className="size-4" /></>}
          </button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <button type="button" onClick={google} className="btn-ghost w-full justify-center !min-h-11">Continue with Google</button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to IncidentRoom?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }} className="text-primary hover:underline">
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
