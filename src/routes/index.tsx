import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/AppShell";
import { Avatar, SevBadge, StatusTrack } from "@/components/ir";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IncidentRoom — When things go wrong, clarity matters" },
      { name: "description", content: "IncidentRoom gives teams one shared place to coordinate, communicate, act, and document what happened." },
      { property: "og:title", content: "IncidentRoom — When things go wrong, clarity matters" },
      { property: "og:description", content: "One shared room for live incident coordination: timeline, owners and next actions." },
    ],
  }),
  component: Landing,
});

const HERO_TL = [
  ["09:51", "Monitoring recovery", "info"],
  ["09:48", "Mitigation deployed", "success"],
  ["09:45", "Database latency identified", "primary"],
  ["09:43", "Sarah assigned as Incident Commander", "role"],
  ["09:41", "Incident detected", "critical"],
] as const;

const dot: Record<string, string> = {
  info: "bg-info", success: "bg-success", primary: "bg-primary", role: "bg-role", critical: "bg-critical",
};

function HeroVisual() {
  return (
    <div className="relative rounded-xl border bg-card shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <span className="size-2 rounded-full bg-critical" aria-hidden />
        <span className="font-mono text-xs text-muted-foreground">INCIDENT #INC-2048</span>
        <span className="ml-auto flex -space-x-2"><Avatar id="sarah" size="sm" /><Avatar id="david" size="sm" /><Avatar id="priya" size="sm" /></span>
      </div>
      <div className="grid gap-0 sm:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4 border-b p-5 sm:border-b-0 sm:border-r">
          <div>
            <SevBadge sev={1} word />
            <h3 className="mt-2 text-lg font-semibold leading-snug">API latency affecting checkout</h3>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="eyebrow">Status</dt><dd className="mt-1 font-mono font-semibold text-primary">MITIGATING</dd></div>
            <div><dt className="eyebrow">Commander</dt><dd className="mt-1">Sarah Chen</dd></div>
            <div className="col-span-2"><dt className="eyebrow">Impact</dt><dd className="mt-1">~28% checkout requests</dd></div>
          </dl>
          <StatusTrack status="mitigating" compact />
          <div className="rounded-md border-l-2 border-primary bg-primary/5 p-3 text-sm">
            <p className="eyebrow !text-primary">Currently happening</p>
            <p className="mt-1 text-foreground/90">Connection pool saturation causing elevated API latency.</p>
          </div>
        </div>
        <div className="p-5">
          <p className="eyebrow flex items-center gap-2"><span className="size-1.5 animate-pulse rounded-full bg-primary" /> Live timeline</p>
          <ol className="mt-4 space-y-3.5">
            {HERO_TL.map(([t, label, tone]) => (
              <li key={t} className="flex items-start gap-3 text-sm">
                <time className="w-10 shrink-0 font-mono text-xs text-muted-foreground">{t}</time>
                <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dot[tone]}`} aria-hidden />
                <span>{label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

const STORY = [
  { n: "01", h: "One room. Everyone aligned.", p: "A single shared incident workspace. Status, impact, people and decisions in one place — no hunting across chat threads, dashboards and docs while the clock runs.", side: "Shared workspace" },
  { n: "02", h: "Every action has an owner.", p: "Nothing is “someone should look at this.” Each action carries a name, a priority and a due time, so there is no ambiguity during critical moments.", side: "Owner: David Lee · Critical · due 10 min" },
  { n: "03", h: "Every decision leaves a trail.", p: "Updates, decisions and status changes are written to a reliable timeline and audit history — so the post-incident report almost writes itself.", side: "09:51 · David Lee changed status · INVESTIGATING → MITIGATING" },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          <a href="#how" className="hidden px-3 py-2 text-muted-foreground hover:text-foreground sm:block">How it works</a>
          <Link to="/login" className="px-3 py-2 text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/dashboard" className="btn-primary">Open IncidentRoom <ArrowRight className="size-4" /></Link>
        </nav>
      </header>

      <section className="grid-paper border-y">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_1.1fr] lg:py-24">
          <div>
            <p className="eyebrow">Real-time incident coordination</p>
            <h1 className="font-display mt-4 text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">When things go wrong, clarity matters.</h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">IncidentRoom gives teams one shared place to coordinate, communicate, act, and document what happened.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/dashboard" className="btn-primary !min-h-11 !px-5 !text-base">Open IncidentRoom <ArrowRight className="size-4" /></Link>
              <a href="#how" className="btn-ghost !min-h-11 !px-5 !text-base">See how it works</a>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t pt-6 text-sm">
              {[["What happened?", "Timeline"], ["Who's handling it?", "Owners"], ["What's next?", "Actions"]].map(([q, a]) => (
                <div key={q}><dt className="text-muted-foreground">{q}</dt><dd className="mt-1 font-mono text-primary">{a}</dd></div>
              ))}
            </dl>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6">
        {STORY.map((s, i) => (
          <article key={s.n} className="grid gap-8 border-b py-20 lg:grid-cols-12 lg:py-28">
            <span className="font-mono text-sm text-primary lg:col-span-2">{s.n}</span>
            <div className={i % 2 ? "lg:col-span-6 lg:col-start-6" : "lg:col-span-7"}>
              <h2 className="font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">{s.h}</h2>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">{s.p}</p>
              <p className="mt-8 inline-block rounded border bg-card px-3 py-2 font-mono text-xs text-foreground/80">{s.side}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="font-display text-4xl sm:text-5xl">Be ready before the next page.</h2>
        <Link to="/login" className="btn-primary mt-8 !min-h-11 !px-5">Enter IncidentRoom <ArrowRight className="size-4" /></Link>
      </section>
      <footer className="border-t py-8 text-center text-xs text-muted-foreground">IncidentRoom · Interactive prototype with simulated data</footer>
    </div>
  );
}
