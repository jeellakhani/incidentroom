import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Pencil } from "lucide-react";
import { ROLES, SEV_INFO, fmtAgo, fmtClock, fmtDur, fmtTime, person, type Incident, type Status } from "@/lib/data";
import { useStore } from "@/lib/store";
import {
  ActionCard, AddActionButton, Avatar, Composer, Label, Panel, SevBadge, StatusText, StatusTrack, Timeline,
} from "@/components/ir";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_workspace/incidents/$id/")({
  component: Room,
});

function Room() {
  const { id } = Route.useParams();
  const { incidents, timeline, actions, now, setStatus } = useStore();
  const inc = incidents.find((i) => i.id === id)!;
  const [pending, setPending] = useState<Status | null>(null);
  if (!inc) return null;
  const events = timeline.filter((e) => e.incidentId === id);
  const acts = actions.filter((a) => a.incidentId === id);
  const openActs = acts.filter((a) => a.status !== "done");
  const resolved = inc.status === "resolved";

  const pick = (s: Status) => (s === "resolved" ? setPending(s) : setStatus(id, s));

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_300px] xl:grid-cols-[250px_1fr_320px]">
      {/* LEFT — context (xl only) */}
      <aside className="hidden space-y-4 xl:block"><Context inc={inc} /></aside>

      {/* CENTER */}
      <div className="min-w-0 space-y-6">
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">{inc.id}</span>
            <SevBadge sev={inc.sev} />
            <StatusText status={inc.status} />
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{inc.title}</h1>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><dt className="eyebrow">Duration</dt><dd className="mt-1 font-mono text-lg tabular-nums">{fmtClock((inc.resolvedAt ?? now) - inc.startedAt)}</dd></div>
            <div><dt className="eyebrow">Affected</dt><dd className="mt-1 text-sm font-medium">{inc.impact}</dd></div>
            <div><dt className="eyebrow">Commander</dt><dd className="mt-1 text-sm font-medium">{person(inc.roles.commander).name}</dd></div>
            <div><dt className="eyebrow">Open actions</dt><dd className={openActs.length ? "mt-1 text-sm font-medium text-primary" : "mt-1 text-sm font-medium text-success"}>{openActs.length ? `${openActs.length} still open` : "None"}</dd></div>
          </dl>
        </header>

        <Panel className="p-4">
          <div className="flex items-center justify-between"><Label>Incident progress</Label><span className="text-xs text-muted-foreground">Select a stage to update</span></div>
          <StatusTrack status={inc.status} onPick={pick} />
        </Panel>

        {resolved ? <Resolution inc={inc} /> : <CurrentBanner inc={inc} />}

        <section aria-labelledby="tl-h">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="tl-h" className="font-display text-3xl">Timeline</h2>
            <Link to="/incidents/$id/timeline" params={{ id }} className="text-xs text-muted-foreground hover:text-foreground">Full timeline →</Link>
          </div>
          {!resolved && <div className="mb-6"><Composer incidentId={id} /></div>}
          <Timeline events={events} limit={8} />
        </section>
      </div>

      {/* RIGHT — actions (+ context below xl) */}
      <aside className="space-y-6">
        <Panel className="p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Action items</h2>
            <span className={openActs.length ? "font-mono text-xs text-primary" : "font-mono text-xs text-success"}>{openActs.length} open</span>
          </div>
          <div className="mt-3 space-y-4">
            {(["in_progress", "pending", "done"] as const).map((st) => {
              const list = acts.filter((a) => a.status === st);
              if (!list.length) return null;
              return (
                <div key={st}>
                  <Label className="mb-2">{st === "in_progress" ? "In progress" : st === "pending" ? "Pending" : "Completed"}</Label>
                  <div className="space-y-2">{list.map((a) => <ActionCard key={a.id} a={a} />)}</div>
                </div>
              );
            })}
            {!resolved && <AddActionButton incidentId={id} />}
          </div>
        </Panel>
        <div className="space-y-4 xl:hidden"><Context inc={inc} /></div>
      </aside>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-3xl font-normal">Resolve incident?</AlertDialogTitle>
            <AlertDialogDescription>
              Make sure active actions are complete before closing.
              {openActs.length > 0 && <span className="mt-2 block text-primary">{openActs.length} action{openActs.length > 1 ? "s are" : " is"} still open.</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-success text-background hover:bg-success/90" onClick={() => { setStatus(id, "resolved"); setPending(null); }}>Resolve incident</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CurrentBanner({ inc }: { inc: Incident }) {
  const { now, updateCurrent } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(inc.current.text);
  return (
    <section className="animate-enter rounded-lg border border-l-4 border-l-primary bg-primary/[0.06] p-5" aria-live="polite" key={inc.current.at}>
      <p className="eyebrow !text-primary">Currently happening</p>
      <p className="mt-2 text-lg leading-snug">“{inc.current.text}”</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>Last updated {fmtAgo(now - inc.current.at)}</span>
        <span>by <b className="font-medium text-foreground">{person(inc.current.by).name}</b></span>
        <button onClick={() => { setText(inc.current.text); setOpen(true); }} className="btn-ghost ml-auto !min-h-8 !text-xs"><Pencil className="size-3.5" /> Update status</button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>What is happening right now?</DialogTitle></DialogHeader>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="input !py-2" aria-label="Current status" />
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={() => { if (text.trim()) updateCurrent(inc.id, text.trim()); setOpen(false); }} className="btn-primary">Publish update</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Resolution({ inc }: { inc: Incident }) {
  return (
    <section className="animate-enter overflow-hidden rounded-lg border border-success/40 bg-success/[0.06]">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-success text-background"><Check className="size-5" /></span>
          <div>
            <p className="font-display text-3xl leading-none">Incident resolved.</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{inc.id}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div><dt className="eyebrow">Total duration</dt><dd className="mt-1 font-semibold">{fmtDur((inc.resolvedAt ?? 0) - inc.startedAt)}</dd></div>
          <div><dt className="eyebrow">Impact</dt><dd className="mt-1 font-semibold">{inc.impact}</dd></div>
          <div><dt className="eyebrow">Resolution</dt><dd className="mt-1 font-semibold">{inc.resolution ?? "Mitigation confirmed by responders."}</dd></div>
        </dl>
      </div>
      <div className="grid gap-px border-t border-success/20 bg-success/20 sm:grid-cols-3">
        {[
          ["What happened?", inc.rootCause ? `${inc.rootCause.replace(/\.$/, "")} caused ${inc.title.toLowerCase()}.` : inc.current.text],
          ["What fixed it?", inc.resolution ?? "Mitigation applied and verified."],
          ["What remains?", "Monitor utilisation for 30 minutes and complete follow-ups."],
        ].map(([q, a]) => (
          <div key={q} className="bg-card p-4"><p className="text-sm font-semibold">{q}</p><p className="mt-1 text-sm text-muted-foreground">{a}</p></div>
        ))}
      </div>
      <div className="p-4"><Link to="/incidents/$id/report" params={{ id: inc.id }} className="btn-primary">Create post-incident report <ArrowRight className="size-4" /></Link></div>
    </section>
  );
}

function Context({ inc }: { inc: Incident }) {
  const { presence } = useStore();
  const online = presence[inc.id] ?? [];
  const [rolesOpen, setRolesOpen] = useState(false);
  return (
    <>
      <Panel className="p-4">
        <Label>Incident</Label>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{inc.id}</p>
        <p className="font-semibold">{inc.title}</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Severity</dt><dd><SevBadge sev={inc.sev} /> <span className="sr-only">{SEV_INFO[inc.sev].word}</span></dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><StatusText status={inc.status} /></dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Started</dt><dd className="font-mono">{fmtTime(inc.startedAt)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Systems</dt><dd className="text-right">{inc.systems.join(", ") || "—"}</dd></div>
        </dl>
      </Panel>

      <Panel className="p-4">
        <Label>Response team</Label>
        <ul className="mt-3 space-y-3">
          {ROLES.map((r) => (
            <li key={r.key} className="flex items-center gap-3">
              <Avatar id={inc.roles[r.key]} className="ring-0" />
              <div className="leading-tight"><p className="text-xs text-muted-foreground">{r.label}</p><p className="text-sm font-medium">{person(inc.roles[r.key]).name}</p></div>
            </li>
          ))}
        </ul>
        <button onClick={() => setRolesOpen(!rolesOpen)} className="mt-4 flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground" aria-expanded={rolesOpen}>
          Roles & permissions <ChevronDown className={`size-3.5 transition-transform ${rolesOpen ? "rotate-180" : ""}`} />
        </button>
        {rolesOpen && (
          <dl className="animate-enter mt-3 space-y-2.5 border-t pt-3">
            {ROLES.map((r) => <div key={r.key}><dt className="text-xs font-medium text-role">{r.label}</dt><dd className="text-xs text-muted-foreground">{r.desc}</dd></div>)}
          </dl>
        )}
      </Panel>

      <Panel className="p-4">
        <Label>Active now</Label>
        <div className="mt-3 flex -space-x-2">{online.map((p) => <span key={p} className="animate-enter"><Avatar id={p} /></span>)}</div>
        <p className="mt-2 text-sm">{online.length} responder{online.length === 1 ? "" : "s"} online</p>
        <p className="text-xs text-muted-foreground">{online.map((p) => person(p).short).join(", ")}</p>
      </Panel>
    </>
  );
}
