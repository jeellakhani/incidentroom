import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PEOPLE, STATUSES, fmtAgo, fmtDur, person } from "@/lib/data";
import { isActive, useStore } from "@/lib/store";
import { EmptyState, SevBadge, StatusText } from "@/components/ir";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_workspace/incidents/")({
  head: () => ({
    meta: [
      { title: "Incidents — IncidentRoom" },
      { name: "description", content: "All active and resolved incidents with severity, status and commander." },
      { property: "og:title", content: "Incidents — IncidentRoom" },
      { property: "og:description", content: "Every incident, filterable by severity, status, team and owner." },
    ],
  }),
  component: Incidents,
});

type Tab = "active" | "resolved" | "all";

function Incidents() {
  const { incidents, timeline, now } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("active");
  const [sev, setSev] = useState("");
  const [status, setStatus] = useState("");
  const [team, setTeam] = useState("");
  const [owner, setOwner] = useState("");
  const [date, setDate] = useState("");
  const teams = Array.from(new Set(incidents.map((i) => i.team)));

  const rows = useMemo(() => incidents
    .filter((i) => (tab === "all" ? true : tab === "active" ? isActive(i) : !isActive(i)))
    .filter((i) => !sev || String(i.sev) === sev)
    .filter((i) => !status || i.status === status)
    .filter((i) => !team || i.team === team)
    .filter((i) => !owner || i.roles.commander === owner)
    .filter((i) => !date || (date === "today" ? now - i.startedAt < 86_400_000 : now - i.startedAt < 7 * 86_400_000))
    .sort((a, b) => (isActive(a) === isActive(b) ? a.sev - b.sev || b.startedAt - a.startedAt : isActive(a) ? -1 : 1)),
  [incidents, tab, sev, status, team, owner, date, now]);

  const lastUpdate = (id: string) => Math.max(...timeline.filter((e) => e.incidentId === id).map((e) => e.at), 0);
  const sel = "input !min-h-9 !w-auto !text-xs";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Incidents</h1>
        <Link to="/incidents/new" className="btn-primary"><Plus className="size-4" /> Declare incident</Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 border-b">
        {(["active", "resolved", "all"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("-mb-px border-b-2 px-1 pb-2.5 text-sm capitalize", tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")} aria-pressed={tab === t}>
            {t} <span className="font-mono text-xs text-muted-foreground">{incidents.filter((i) => (t === "all" ? true : t === "active" ? isActive(i) : !isActive(i))).length}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Filters">
        <select aria-label="Severity" value={sev} onChange={(e) => setSev(e.target.value)} className={sel}><option value="">Severity: any</option>{[1, 2, 3, 4].map((s) => <option key={s} value={s}>SEV-{s}</option>)}</select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={sel}><option value="">Status: any</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select aria-label="Team" value={team} onChange={(e) => setTeam(e.target.value)} className={sel}><option value="">Team: any</option>{teams.map((t) => <option key={t}>{t}</option>)}</select>
        <select aria-label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} className={sel}><option value="">Owner: any</option>{PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} className={sel}><option value="">Date: any</option><option value="today">Last 24 hours</option><option value="week">Last 7 days</option></select>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border">
        {rows.length === 0 ? (
          <div className="p-6"><EmptyState title={tab === "active" ? "Everything is quiet." : "No incidents match."} body={tab === "active" ? "No active incidents require your attention." : "Try clearing a filter."} /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="hidden bg-surface text-left md:table-header-group">
              <tr className="eyebrow">
                {["Severity", "Incident", "Title", "Status", "Commander", "Duration", "Updated"].map((h) => <th key={h} className="px-4 py-2.5 font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((i) => (
                <tr
                  key={i.id}
                  tabIndex={0}
                  onClick={() => navigate({ to: "/incidents/$id", params: { id: i.id } })}
                  onKeyDown={(e) => e.key === "Enter" && navigate({ to: "/incidents/$id", params: { id: i.id } })}
                  className="grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-1 bg-card px-4 py-3 hover:bg-accent focus:bg-accent focus:outline-none md:table-row md:p-0"
                >
                  <td className="md:px-4 md:py-3"><SevBadge sev={i.sev} /></td>
                  <td className="font-mono text-xs text-muted-foreground md:px-4 md:py-3">{i.id}</td>
                  <td className="col-span-2 font-medium md:px-4 md:py-3">{i.title}</td>
                  <td className="md:px-4 md:py-3"><StatusText status={i.status} /></td>
                  <td className="text-muted-foreground md:px-4 md:py-3">{person(i.roles.commander).name}</td>
                  <td className="font-mono text-xs md:px-4 md:py-3">{fmtDur((i.resolvedAt ?? now) - i.startedAt)}</td>
                  <td className="text-xs text-muted-foreground md:px-4 md:py-3">{fmtAgo(now - lastUpdate(i.id))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
