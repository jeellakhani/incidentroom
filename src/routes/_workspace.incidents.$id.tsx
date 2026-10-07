import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_workspace/incidents/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — Incident room · IncidentRoom` },
      { name: "description", content: `Live coordination room for ${params.id}: status, timeline, owners and actions.` },
      { property: "og:title", content: `${params.id} — Incident room` },
      { property: "og:description", content: "What happened, who is handling it, and what happens next." },
    ],
  }),
  component: IncidentLayout,
});

function IncidentLayout() {
  const { id } = Route.useParams();
  const { incidents, actions } = useStore();
  const [connecting, setConnecting] = useState(true);
  useEffect(() => {
    setConnecting(true);
    const t = setTimeout(() => setConnecting(false), 550);
    return () => clearTimeout(t);
  }, [id]);
  const inc = incidents.find((i) => i.id === id);

  if (connecting) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground" role="status">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="font-mono text-sm">Connecting to incident room…</p>
      </div>
    );
  }
  if (!inc) {
    return (
      <div className="py-24 text-center">
        <p className="font-display text-3xl">Incident not found.</p>
        <Link to="/incidents" className="btn-ghost mt-4">Back to incidents</Link>
      </div>
    );
  }
  const open = actions.filter((a) => a.incidentId === id && a.status !== "done").length;
  const tab = "-mb-px border-b-2 border-transparent px-1 pb-2.5 text-sm text-muted-foreground hover:text-foreground";
  const activeTab = { className: "!border-primary !text-foreground" };
  return (
    <div className="mx-auto max-w-[1440px]">
      <nav className="mb-6 flex items-center gap-5 overflow-x-auto border-b" aria-label="Incident sections">
        <Link to="/incidents" className="pb-2.5 font-mono text-xs text-muted-foreground hover:text-foreground">← Incidents</Link>
        <Link to="/incidents/$id" params={{ id }} activeOptions={{ exact: true }} className={tab} activeProps={activeTab}>Room</Link>
        <Link to="/incidents/$id/timeline" params={{ id }} className={tab} activeProps={activeTab}>Timeline</Link>
        <Link to="/incidents/$id/actions" params={{ id }} className={tab} activeProps={activeTab}>Actions {open > 0 && <span className="font-mono text-xs text-primary">{open}</span>}</Link>
        <Link to="/incidents/$id/report" params={{ id }} className={tab} activeProps={activeTab}>Report</Link>
      </nav>
      <Outlet />
    </div>
  );
}
