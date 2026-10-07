import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtDur, person } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Label, SevBadge, StatusText, Timeline } from "@/components/ir";

export const Route = createFileRoute("/_workspace/incidents/$id/report")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} post-incident report — IncidentRoom` },
      { name: "description", content: `Summary, impact, root cause, timeline and follow-ups for ${params.id}.` },
      { property: "og:title", content: `${params.id} post-incident report` },
      { property: "og:description", content: "What happened, what fixed it, and what changes next." },
    ],
  }),
  component: Report,
});

function Report() {
  const { id } = Route.useParams();
  const { incidents, timeline, actions, now } = useStore();
  const [exporting, setExporting] = useState(false);
  const inc = incidents.find((i) => i.id === id);
  if (!inc) return null;
  const resolved = inc.status === "resolved";
  const done = actions.filter((a) => a.incidentId === id && a.status === "done");
  const end = inc.resolvedAt ?? now;
  const followUps = [
    { t: `Add alerting for the failure mode behind ${inc.id}`, o: inc.roles.tech, d: end + 5 * 86_400_000 },
    { t: "Review capacity planning and runbooks", o: inc.roles.commander, d: end + 8 * 86_400_000 },
  ];
  const exportIt = () => {
    setExporting(true);
    setTimeout(() => { setExporting(false); toast.success("Report prepared successfully.", { description: `${inc.id}-report.pdf (simulated)` }); }, 1000);
  };

  return (
    <article className="mx-auto max-w-3xl pb-16">
      {!resolved && (
        <div className="mb-6 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
          This incident is still <b className="font-mono">{inc.status.toUpperCase()}</b>. The report below is a live draft. <Link to="/incidents/$id" params={{ id }} className="text-primary underline">Back to room</Link>
        </div>
      )}
      <header className="border-b pb-8">
        <Label>Incident report</Label>
        <h1 className="font-display mt-3 text-5xl">{inc.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="font-mono text-muted-foreground">{inc.id}</span>
          <SevBadge sev={inc.sev} />
          <StatusText status={inc.status} />
          <span><span className="text-muted-foreground">Duration</span> <b>{fmtDur(end - inc.startedAt)}</b></span>
          <span><span className="text-muted-foreground">Commander</span> {person(inc.roles.commander).name}</span>
        </div>
      </header>

      {[
        ["Summary", inc.summary ?? `${inc.title} affected ${inc.impact.toLowerCase()}. Responders coordinated in IncidentRoom, identified the cause and applied a mitigation.`],
        ["Impact", `${inc.impact} experienced degraded service.${inc.id === "INC-2048" ? " Peak latency: 4.8 seconds." : ""}`],
        ["Root cause", inc.rootCause ?? "Under investigation."],
      ].map(([h, b]) => (
        <section key={h} className="border-b py-8">
          <Label>{h}</Label>
          <p className="mt-3 text-lg leading-relaxed">{b}</p>
        </section>
      ))}

      <section className="border-b py-8">
        <Label>Response timeline</Label>
        <div className="mt-5"><Timeline events={timeline.filter((e) => e.incidentId === id)} /></div>
      </section>

      <section className="border-b py-8">
        <Label>Actions taken</Label>
        <ul className="mt-3 space-y-2">
          {done.length === 0 && <li className="text-muted-foreground">No completed actions yet.</li>}
          {done.map((a) => <li key={a.id} className="flex items-center gap-2"><Check className="size-4 text-success" /> {a.title} <span className="text-xs text-muted-foreground">— {person(a.owner).name}</span></li>)}
        </ul>
      </section>

      <section className="border-b py-8">
        <Label>Follow-up actions</Label>
        <ol className="mt-4 space-y-4">
          {followUps.map((f, i) => (
            <li key={f.t} className="grid grid-cols-[2rem_1fr] gap-2">
              <span className="font-mono text-primary">{i + 1}.</span>
              <div><p className="font-medium">{f.t}</p><p className="text-sm text-muted-foreground">Owner: {person(f.o).name} · Due {fmtDate(f.d)}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8 flex gap-3">
        <button onClick={exportIt} disabled={exporting} className="btn-primary">{exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} {exporting ? "Preparing…" : "Export report"}</button>
        <Link to="/reports" className="btn-ghost">All reports</Link>
      </div>
    </article>
  );
}
