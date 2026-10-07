import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { ActionCard, AddActionButton, EmptyState, Label } from "@/components/ir";

export const Route = createFileRoute("/_workspace/incidents/$id/actions")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} actions — IncidentRoom` },
      { name: "description", content: `Every action in ${params.id}, each with a clear owner.` },
      { property: "og:title", content: `${params.id} actions — IncidentRoom` },
      { property: "og:description", content: "Who is doing what, right now." },
    ],
  }),
  component: ActionsPage,
});

function ActionsPage() {
  const { id } = Route.useParams();
  const { actions, incidents } = useStore();
  const inc = incidents.find((i) => i.id === id);
  const list = actions.filter((a) => a.incidentId === id);
  const open = list.filter((a) => a.status !== "done");
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Action items</h1>
          <p className={open.length ? "text-sm text-primary" : "text-sm text-success"}>{open.length ? `${open.length} action${open.length > 1 ? "s" : ""} still open` : "All actions complete"}</p>
        </div>
        {inc?.status !== "resolved" && <div className="w-40"><AddActionButton incidentId={id} /></div>}
      </div>
      <div className="mt-6 space-y-8">
        {list.length === 0 && <EmptyState title="No actions yet." body="Assign the first action to a clear owner." />}
        {(["in_progress", "pending", "done"] as const).map((st) => {
          const l = list.filter((a) => a.status === st);
          if (!l.length) return null;
          return (
            <section key={st}>
              <Label className="mb-2">{st === "in_progress" ? "In progress" : st === "pending" ? "Pending" : "Completed"} · {l.length}</Label>
              <div className="space-y-2">{l.map((a) => <ActionCard key={a.id} a={a} />)}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
