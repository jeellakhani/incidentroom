import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/AppShell";
import { Field } from "@/components/ir";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — IncidentRoom" },
      { name: "description", content: "Sign in to your IncidentRoom workspace and coordinate incidents without losing context." },
      { property: "og:title", content: "Sign in — IncidentRoom" },
      { property: "og:description", content: "Be ready when things go wrong." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const go = (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setTimeout(() => navigate({ to: "/dashboard" }), 700);
  };
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="grid-paper flex flex-col justify-between border-b p-8 lg:border-b-0 lg:border-r lg:p-12">
        <Logo />
        <div className="py-12">
          <h1 className="font-display text-5xl leading-[1.02] sm:text-6xl">Be ready when things go wrong.</h1>
          <p className="mt-4 text-lg text-muted-foreground">Coordinate incidents without losing context.</p>
        </div>
        <p className="hidden font-mono text-xs text-muted-foreground lg:block">Acme Engineering · 3 active incidents</p>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={go} className="w-full max-w-sm space-y-4">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <Field label="Email"><input type="email" defaultValue="sarah@acme.dev" className="input" required /></Field>
          <Field label="Password"><input type="password" defaultValue="prototype" className="input" required /></Field>
          <button type="submit" disabled={busy} className="btn-primary w-full justify-center !min-h-11">
            {busy ? <><Loader2 className="size-4 animate-spin" /> Entering…</> : <>Enter IncidentRoom <ArrowRight className="size-4" /></>}
          </button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <button type="button" onClick={() => go()} className="btn-ghost w-full justify-center !min-h-11">Continue with Google</button>
          <p className="text-center text-xs text-muted-foreground">Prototype — any credentials work.</p>
        </form>
      </div>
    </div>
  );
}
