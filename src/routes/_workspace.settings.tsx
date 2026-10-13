import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { person } from "@/lib/data";
import { AI_LIMITS } from "@/lib/ai-shared";
import { useStore } from "@/lib/store";
import { Field } from "@/components/ir";

export const Route = createFileRoute("/_workspace/settings")({
  head: () => ({
    meta: [
      { title: "Settings — IncidentRoom" },
      { name: "description", content: "Profile, team and sample data settings." },
      { property: "og:title", content: "Settings — IncidentRoom" },
      { property: "og:description", content: "Configure your IncidentRoom workspace." },
    ],
  }),
  component: Settings,
});

function Section({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b py-8 md:grid-cols-[240px_1fr]">
      <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{desc}</p></div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SaveButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return <button disabled={busy} className="btn-primary">{busy && <Loader2 className="size-4 animate-spin" />}{children}</button>;
}

function Settings() {
  const { userId, team, teams, switchTeam, isOwner, incidents, renameTeam, updateProfile, loadSample, clearSample } = useStore();
  const me = person(userId);
  const [name, setName] = useState(me.name);
  const [title, setTitle] = useState(me.title);
  const [teamName, setTeamName] = useState(team?.name ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => setTeamName(team?.name ?? ""), [team?.name]);
  const samples = incidents.filter((i) => i.isSample).length;
  const wrap = (k: string, fn: () => Promise<unknown>) => async () => { setBusy(k); await fn(); setBusy(null); };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-4xl">Settings</h1>

      <Section title="Your profile" desc="How teammates see you.">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void wrap("profile", () => updateProfile(name.trim().slice(0, 80), title.trim().slice(0, 80)))(); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name"><input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
            <Field label="Job title"><input maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} className="input" /></Field>
          </div>
          <SaveButton busy={busy === "profile"}>Save profile</SaveButton>
        </form>
      </Section>

      <Section title="Team" desc="Each team's incidents are visible only to its members.">
        {teams.length > 1 && (
          <Field label="Active team">
            <select value={team?.id} onChange={(e) => switchTeam(e.target.value)} className="input">
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}
            </select>
          </Field>
        )}
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void wrap("team", () => renameTeam(teamName.trim().slice(0, 80)))(); }}>
          <Field label="Team name"><input required disabled={!isOwner} maxLength={80} value={teamName} onChange={(e) => setTeamName(e.target.value)} className="input disabled:opacity-60" /></Field>
          {isOwner ? <SaveButton busy={busy === "team"}>Rename team</SaveButton> : <p className="text-xs text-muted-foreground">Only team owners can rename the team.</p>}
        </form>
      </Section>

      <Section title="Sample data" desc="Sample incidents are labelled [Sample] and kept separate from real ones.">
        <p className="text-sm">{samples ? `${samples} sample incident${samples > 1 ? "s" : ""} in this team.` : "No sample incidents in this team."}</p>
        {isOwner ? (
          <div className="flex flex-wrap gap-2">
            <button onClick={wrap("load", loadSample)} disabled={!!busy} className="btn-ghost">{busy === "load" && <Loader2 className="size-4 animate-spin" />} Load sample incidents</button>
            <button onClick={() => { if (confirm("Delete all sample incidents?")) void wrap("clear", clearSample)(); }} disabled={!!busy || !samples} className="btn-ghost">{busy === "clear" && <Loader2 className="size-4 animate-spin" />} Remove sample incidents</button>
          </div>
        ) : <p className="text-xs text-muted-foreground">Only team owners can manage sample data.</p>}
      </Section>

      <Section title="AI assistant" desc="Suggestions only — nothing is changed without your approval.">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Answers use only this incident's recorded data, separating confirmed facts from possible explanations.</li>
          <li>Emails and account details are never sent to the AI provider; only first names are.</li>
          <li>Limit: {AI_LIMITS.perHour} requests per hour and {AI_LIMITS.perDay} per day for each person.</li>
        </ul>
      </Section>
    </div>
  );
}
