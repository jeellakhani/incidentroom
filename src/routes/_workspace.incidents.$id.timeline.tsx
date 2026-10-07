import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { EventKind } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Composer, Timeline } from "@/components/ir";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_workspace/incidents/$id/timeline")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} timeline — IncidentRoom` },
      { name: "description", content: `Chronological record of every update and decision in ${params.id}.` },
      { property: "og:title", content: `${params.id} timeline — IncidentRoom` },
      { property: "og:description", content: "What happened, in order." },
    ],
  }),
  component: TimelinePage,
});

const FILTERS: { k: EventKind | "all"; l: string }[] = [
  { k: "all", l: "All" }, { k: "update", l: "Updates" }, { k: "decision", l: "Decisions" },
  { k: "status", l: "Status" }, { k: "system", l: "System" }, { k: "people", l: "People" },
];

function TimelinePage() {
  const { id } = Route.useParams();
  const { timeline, incidents } = useStore();
  const [f, setF] = useState<EventKind | "all">("all");
  const inc = incidents.find((i) => i.id === id);
  const events = timeline.filter((e) => e.incidentId === id && (f === "all" || e.kind === f));
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl">Timeline</h1>
      <p className="text-sm text-muted-foreground">{inc?.title} · newest first</p>
      <div className="mt-4 flex flex-wrap gap-1">
        {FILTERS.map((x) => (
          <button key={x.k} onClick={() => setF(x.k)} aria-pressed={f === x.k} className={cn("rounded-full border px-3 py-1 text-xs", f === x.k ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>{x.l}</button>
        ))}
      </div>
      {inc?.status !== "resolved" && <div className="mt-6"><Composer incidentId={id} /></div>}
      <div className="mt-8"><Timeline events={events} /></div>
    </div>
  );
}
