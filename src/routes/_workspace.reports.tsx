import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { fmtDate, fmtDur, person } from "@/lib/data";
import { useStore } from "@/lib/store";
import { EmptyState, SevBadge } from "@/components/ir";

export const Route = createFileRoute("/_workspace/reports")({
  head: () => ({
    meta: [
      { title: "Incident reports — IncidentRoom" },
      { name: "description", content: "Post-incident reports for every resolved incident." },
      { property: "og:title", content: "Incident reports — IncidentRoom" },
      { property: "og:description", content: "Learn from every incident." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { incidents } = useStore();
  const resolved = incidents.filter((i) => i.status === "resolved").sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0));
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-4xl">Incident reports</h1>
      <p className="text-sm text-muted-foreground">{resolved.length} resolved incidents</p>
      <div className="mt-6 divide-y rounded-lg border bg-card">
        {resolved.length === 0 && <div className="p-6"><EmptyState title="No reports yet." body="Reports appear here once incidents are resolved." /></div>}
        {resolved.map((i) => (
          <div key={i.id} className="animate-enter flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
            <span className="font-mono text-xs text-muted-foreground">{i.id}</span>
            <div className="min-w-48 flex-1">
              <p className="font-medium">{i.title}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(i.startedAt)} · {person(i.roles.commander).name}</p>
            </div>
            <SevBadge sev={i.sev} />
            <span className="w-16 font-mono text-sm">{fmtDur((i.resolvedAt ?? 0) - i.startedAt)}</span>
            <div className="flex gap-2">
              <Link to="/incidents/$id/report" params={{ id: i.id }} className="btn-ghost !min-h-8 !text-xs">View report</Link>
              <button onClick={() => toast.success("Report prepared successfully.", { description: `${i.id}-report.pdf (simulated)` })} className="btn-ghost !min-h-8 !text-xs">Export</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
