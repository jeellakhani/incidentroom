import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { fmtDate, fmtTime, person } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/ir";

export const Route = createFileRoute("/_workspace/audit")({
  head: () => ({
    meta: [
      { title: "Audit trail — IncidentRoom" },
      { name: "description", content: "Every important action, with timestamp, user, action and object." },
      { property: "og:title", content: "Audit trail — IncidentRoom" },
      { property: "og:description", content: "Every decision leaves a trail." },
    ],
  }),
  component: Audit,
});

function Audit() {
  const { audit, incidents } = useStore();
  const [inc, setInc] = useState("");
  const rows = audit.filter((a) => !inc || a.incidentId === inc).sort((a, b) => b.at - a.at);
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Audit trail</h1>
          <p className="text-sm text-muted-foreground">Append-only record of incident activity</p>
        </div>
        <select aria-label="Filter by incident" value={inc} onChange={(e) => setInc(e.target.value)} className="input !w-auto !min-h-9 !text-xs">
          <option value="">All incidents</option>
          {incidents.map((i) => <option key={i.id} value={i.id}>{i.id}</option>)}
        </select>
      </div>
      <div className="mt-6 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="hidden bg-surface text-left sm:table-header-group">
            <tr className="eyebrow">{["Time", "User", "Action", "Object", "Incident"].map((h) => <th key={h} className="px-4 py-2.5 font-normal">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y bg-card">
            {rows.map((a) => (
              <tr key={a.id} className="animate-enter grid grid-cols-[4rem_1fr] gap-x-3 gap-y-1 px-4 py-3 sm:table-row sm:p-0">
                <td className="font-mono text-xs text-muted-foreground sm:px-4 sm:py-3"><span title={fmtDate(a.at)}>{fmtTime(a.at)}</span></td>
                <td className="sm:px-4 sm:py-3"><span className="inline-flex items-center gap-2"><Avatar id={a.user} size="sm" className="ring-0" /><b className="font-medium">{person(a.user).name}</b></span></td>
                <td className="col-start-2 text-muted-foreground sm:px-4 sm:py-3">{a.verb}</td>
                <td className="col-start-2 font-mono text-xs sm:px-4 sm:py-3"><b className="font-semibold text-foreground">{a.object}</b></td>
                <td className="col-start-2 sm:px-4 sm:py-3">{a.incidentId && <Link to="/incidents/$id" params={{ id: a.incidentId }} className="font-mono text-xs text-primary hover:underline">{a.incidentId}</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
