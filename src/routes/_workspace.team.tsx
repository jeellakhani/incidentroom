import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, UserMinus } from "lucide-react";
import { ROLES } from "@/lib/data";
import { isActive, useStore } from "@/lib/store";
import { Avatar, Field, Label, SevBadge } from "@/components/ir";

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

const TEAM_ROLE_DESC = {
  owner: "Manages members, can delete incidents and sample data.",
  responder: "Declares and updates incidents, assigns and completes actions.",
  viewer: "Read-only access to incidents, timeline and reports.",
} as const;

function Team() {
  const { incidents, actions, people, team, isOwner, userId, addMember, removeMember } = useStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"responder" | "viewer" | "owner">("responder");
  const [busy, setBusy] = useState(false);
  const active = incidents.filter(isActive);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-4xl">Team</h1>
      <p className="text-sm text-muted-foreground">{team?.name} · {people.length} member{people.length === 1 ? "" : "s"}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {people.map((p) => {
          const leading = active.find((i) => Object.values(i.roles).includes(p.id));
          const open = actions.filter((a) => a.owner === p.id && a.status !== "done").length;
          return (
            <article key={p.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-start justify-between">
                <Avatar id={p.id} size="lg" className="ring-0" />
                {isOwner && p.id !== userId && (
                  <button onClick={() => { if (confirm(`Remove ${p.name} from the team?`)) void removeMember(p.id); }} aria-label={`Remove ${p.name}`} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"><UserMinus className="size-4" /></button>
                )}
              </div>
              <h2 className="mt-4 font-semibold">{p.name}{p.id === userId && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</h2>
              <p className="text-sm text-muted-foreground">{p.title || "—"}</p>
              <p className="mt-3 inline-block rounded border border-role/30 bg-role/10 px-2 py-0.5 text-xs capitalize text-role">{p.teamRole}</p>
              <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className={leading ? "text-primary" : "text-muted-foreground"}>{leading ? "Responding" : "Available"}</dd></div>
                <div className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">Incident</dt><dd>{leading ? <Link to="/incidents/$id" params={{ id: leading.id }} className="inline-flex items-center gap-1.5 font-mono text-xs hover:underline"><SevBadge sev={leading.sev} />{leading.id}</Link> : "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Open actions</dt><dd className="font-mono">{open}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>

      {isOwner && (
        <section className="mt-10 rounded-lg border bg-card p-5">
          <Label>Add a member</Label>
          <p className="mt-1 text-sm text-muted-foreground">They need an IncidentRoom account first.</p>
          <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end" onSubmit={async (e) => {
            e.preventDefault(); setBusy(true);
            if (await addMember(email.trim(), role)) setEmail("");
            setBusy(false);
          }}>
            <Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></Field>
            <Field label="Team role">
              <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="input">
                <option value="responder">Responder</option><option value="viewer">Viewer</option><option value="owner">Owner</option>
              </select>
            </Field>
            <button disabled={busy} className="btn-primary">{busy && <Loader2 className="size-4 animate-spin" />} Add member</button>
          </form>
        </section>
      )}

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <Label>Team roles</Label>
          <div className="mt-3 divide-y rounded-lg border bg-card">
            {Object.entries(TEAM_ROLE_DESC).map(([k, d]) => (
              <div key={k} className="p-4"><p className="font-medium capitalize text-role">{k}</p><p className="text-sm text-muted-foreground">{d}</p></div>
            ))}
          </div>
        </div>
        <div>
          <Label>Incident roles</Label>
          <div className="mt-3 divide-y rounded-lg border bg-card">
            {ROLES.map((r) => (
              <div key={r.key} className="p-4"><p className="font-medium text-role">{r.label}</p><p className="text-sm text-muted-foreground">{r.desc}</p></div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
