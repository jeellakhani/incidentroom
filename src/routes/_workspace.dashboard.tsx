import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { fmtDur, fmtTime, person, SEV_INFO } from "@/lib/data";
import { isActive, useStore } from "@/lib/store";
import { ActionCard, Avatar, EmptyState, Label, SevBadge, StatusText, StatusTrack } from "@/components/ir";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_workspace/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — IncidentRoom" },
      { name: "description", content: "Active incidents and your next actions at a glance." },
      { property: "og:title", content: "Overview — IncidentRoom" },
      { property: "og:description", content: "Here is what needs your attention." },
    ],
  }),
  component: Dashboard,
});

const edge = { 1: "border-l-critical", 2: "border-l-high", 3: "border-l-medium", 4: "border-l-border" } as const;

function Dashboard() {
  const { incidents, actions, audit, now, demoMode, setDemoMode } = useStore();
  const active = incidents.filter(isActive).sort((a, b) => a.sev - b.sev);
  const mine = actions.filter((a) => a.owner === "sarah" && a.status !== "done" && active.some((i) => i.id === a.incidentId));
  const crit = active.filter((i) => i.sev === 1).length;
  const high = active.filter((i) => i.sev === 2).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">Good morning, Sarah.</h1>
          <p className="mt-1 text-muted-foreground">Here is what needs your attention.</p>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs" aria-label="Incident counts">
          <span><b className="text-base text-foreground">{active.length}</b> ACTIVE</span>
          <span className="text-critical"><b className="text-base">{crit}</b> CRITICAL</span>
          <span className="text-high"><b className="text-base">{high}</b> HIGH</span>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="active-h">
          <div className="flex items-center justify-between">
            <Label><span id="active-h">Active incidents</span></Label>
            <Link to="/incidents" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          <div className="mt-3 space-y-3">
            {active.length === 0 && <EmptyState title="Everything is quiet." body="No active incidents require your attention." />}
            {active.map((i) => {
              const openCount = actions.filter((a) => a.incidentId === i.id && a.status !== "done").length;
              return (
                <article key={i.id} className={cn("animate-enter rounded-lg border border-l-4 bg-card p-5", edge[i.sev])}>
                  <div className="flex flex-wrap items-center gap-3">
                    <SevBadge sev={i.sev} word />
                    <span className="font-mono text-xs text-muted-foreground">{i.id} · {SEV_INFO[i.sev].label}</span>
                    <StatusText status={i.status} className="ml-auto" />
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">{i.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{i.current.text}</p>
                  <div className="mt-4"><StatusTrack status={i.status} compact /></div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                    <span><span className="text-muted-foreground">Duration </span><span className="font-mono">{fmtDur(now - i.startedAt)}</span></span>
                    <span className="inline-flex items-center gap-2"><Avatar id={i.roles.commander} size="sm" className="ring-0" /><span className="text-muted-foreground">Commander</span> {person(i.roles.commander).name}</span>
                    <span className={openCount ? "text-primary" : "text-success"}>{openCount ? `${openCount} action${openCount > 1 ? "s" : ""} still open` : "All actions complete"}</span>
                    <Link to="/incidents/$id" params={{ id: i.id }} className="btn-primary ml-auto">Open room <ArrowRight className="size-4" /></Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="space-y-8">
          <section aria-labelledby="mine-h">
            <h2 id="mine-h" className="font-display text-2xl">Your next actions</h2>
            <p className="text-sm text-muted-foreground">{mine.length ? `${mine.length} open, owned by you` : "Nothing assigned"}</p>
            <div className="mt-3 space-y-2">
              {mine.length === 0 ? <EmptyState title="You're all clear." body="No actions are assigned to you." /> : mine.map((a) => <ActionCard key={a.id} a={a} showIncident />)}
            </div>
          </section>

          <section>
            <Label>Recent activity</Label>
            <ul className="mt-3 space-y-2.5 text-sm">
              {audit.slice(0, 6).map((e) => (
                <li key={e.id} className="animate-enter flex gap-3">
                  <time className="w-10 shrink-0 font-mono text-xs text-muted-foreground">{fmtTime(e.at)}</time>
                  <span><b className="font-medium">{person(e.user).name}</b> <span className="text-muted-foreground">{e.verb}</span></span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border bg-surface p-4">
            <Label>Presentation</Label>
            <p className="mt-2 text-sm text-muted-foreground">Walk through a full incident, from detection to report, step by step.</p>
            <button onClick={() => setDemoMode(!demoMode)} className="btn-ghost mt-3">{demoMode ? "Hide demo controls" : "Start demo mode"}</button>
          </section>
        </div>
      </div>
    </div>
  );
}
