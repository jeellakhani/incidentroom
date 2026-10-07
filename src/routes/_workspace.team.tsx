import { createFileRoute, Link } from "@tanstack/react-router";
import { PEOPLE, ROLES } from "@/lib/data";
import { isActive, useStore } from "@/lib/store";
import { Avatar, Label, SevBadge } from "@/components/ir";

export const Route = createFileRoute("/_workspace/team")({
  head: () => ({
    meta: [
      { title: "Team — IncidentRoom" },
      { name: "description", content: "Responders, their roles and what they are working on right now." },
      { property: "og:title", content: "Team — IncidentRoom" },
      { property: "og:description", content: "Who is responding and where." },
    ],
  }),
  component: Team,
});

const PRIMARY_ROLE: Record<string, string> = { sarah: "Incident Commander", david: "Technical Lead", priya: "Communications", alex: "Observer" };

function Team() {
  const { incidents, presence, actions } = useStore();
  const active = incidents.filter(isActive);
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-4xl">Team</h1>
      <p className="text-sm text-muted-foreground">Acme Engineering · {PEOPLE.length} responders</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PEOPLE.map((p) => {
          const inRoom = active.find((i) => presence[i.id]?.includes(p.id));
          const open = actions.filter((a) => a.owner === p.id && a.status !== "done").length;
          return (
            <article key={p.id} className="rounded-lg border bg-card p-5">
              <Avatar id={p.id} size="lg" className="ring-0" />
              <h2 className="mt-4 font-semibold">{p.name}</h2>
              <p className="text-sm text-muted-foreground">{p.title}</p>
              <p className="mt-3 inline-block rounded border border-role/30 bg-role/10 px-2 py-0.5 text-xs text-role">{PRIMARY_ROLE[p.id]}</p>
              <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className={inRoom ? "text-primary" : "text-muted-foreground"}>{inRoom ? "Responding" : "Available"}</dd></div>
                <div className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">Incident</dt><dd>{inRoom ? <Link to="/incidents/$id" params={{ id: inRoom.id }} className="inline-flex items-center gap-1.5 font-mono text-xs hover:underline"><SevBadge sev={inRoom.sev} />{inRoom.id}</Link> : "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Open actions</dt><dd className="font-mono">{open}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>

      <section className="mt-12">
        <Label>Roles & permissions</Label>
        <div className="mt-3 divide-y rounded-lg border bg-card">
          {ROLES.map((r) => (
            <div key={r.key} className="grid gap-1 p-4 sm:grid-cols-[220px_1fr]">
              <p className="font-medium text-role">{r.label}</p>
              <p className="text-sm text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
