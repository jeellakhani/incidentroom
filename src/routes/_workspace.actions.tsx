import { createFileRoute } from "@tanstack/react-router";
import { ME } from "@/lib/data";
import { useStore } from "@/lib/store";
import { ActionCard, EmptyState, Label } from "@/components/ir";

export const Route = createFileRoute("/_workspace/actions")({
  head: () => ({
    meta: [
      { title: "My actions — IncidentRoom" },
      { name: "description", content: "Every incident action you own, in priority order." },
      { property: "og:title", content: "My actions — IncidentRoom" },
      { property: "og:description", content: "What you need to do next." },
    ],
  }),
  component: MyActions,
});

const rank = { critical: 0, high: 1, medium: 2, low: 3 };

function MyActions() {
  const { actions } = useStore();
  const mine = actions.filter((a) => a.owner === ME);
  const open = mine.filter((a) => a.status !== "done").sort((a, b) => rank[a.priority] - rank[b.priority]);
  const done = mine.filter((a) => a.status === "done");
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl">Your next actions</h1>
      <p className={open.length ? "text-sm text-primary" : "text-sm text-success"}>{open.length ? `${open.length} action${open.length > 1 ? "s" : ""} still open` : "Nothing waiting on you"}</p>
      <div className="mt-6 space-y-2">
        {open.length === 0 ? <EmptyState title="You're all clear." body="No open actions are assigned to you." /> : open.map((a) => <ActionCard key={a.id} a={a} showIncident />)}
      </div>
      {done.length > 0 && (
        <section className="mt-10">
          <Label className="mb-2">Completed · {done.length}</Label>
          <div className="space-y-2">{done.map((a) => <ActionCard key={a.id} a={a} showIncident />)}</div>
        </section>
      )}
    </div>
  );
}
