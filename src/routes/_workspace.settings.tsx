import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PEOPLE, ROLES } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ir";

export const Route = createFileRoute("/_workspace/settings")({
  head: () => ({
    meta: [
      { title: "Settings — IncidentRoom" },
      { name: "description", content: "Workspace, notification, incident default and demo settings." },
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

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border bg-card p-3">
      <span><span className="block text-sm font-medium">{label}</span>{desc && <span className="block text-xs text-muted-foreground">{desc}</span>}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function Settings() {
  const { live, setLive, demoMode, setDemoMode } = useStore();
  const [n, setN] = useState({ mentions: true, assignments: true, updates: true, system: false });
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-4xl">Settings</h1>

      <Section title="Presentation" desc="Prototype controls for demos.">
        <Toggle label="Demo Mode" desc="Step through a full incident from detection to report." checked={demoMode} onChange={setDemoMode} />
        <Toggle label="Live simulation" desc="Teammates post updates every few seconds in INC-2048." checked={live} onChange={setLive} />
      </Section>

      <Section title="Workspace" desc="How your organisation appears.">
        <Field label="Workspace name"><input className="input" defaultValue="Acme Engineering" /></Field>
        <Field label="Time zone"><select className="input" defaultValue="UTC"><option>UTC</option><option>Asia/Kolkata</option><option>America/New_York</option></select></Field>
      </Section>

      <Section title="Notifications" desc="What reaches you, and what doesn't.">
        <Toggle label="Mentions" checked={n.mentions} onChange={(v) => setN({ ...n, mentions: v })} />
        <Toggle label="Assignments" checked={n.assignments} onChange={(v) => setN({ ...n, assignments: v })} />
        <Toggle label="Incident updates" checked={n.updates} onChange={(v) => setN({ ...n, updates: v })} />
        <Toggle label="System events" checked={n.system} onChange={(v) => setN({ ...n, system: v })} />
      </Section>

      <Section title="Incident defaults" desc="Pre-filled when declaring an incident.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default severity"><select className="input" defaultValue="2">{[1, 2, 3, 4].map((s) => <option key={s} value={s}>SEV-{s}</option>)}</select></Field>
          <Field label="Default incident commander"><select className="input" defaultValue="sarah">{PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        </div>
      </Section>

      <Section title="Roles & permissions" desc="What each incident role can do.">
        <div className="divide-y rounded-md border bg-card">
          {ROLES.map((r) => <div key={r.key} className="p-3"><p className="text-sm font-medium text-role">{r.label}</p><p className="text-xs text-muted-foreground">{r.desc}</p></div>)}
        </div>
      </Section>

      <Section title="Appearance" desc="Built for long, high-stress sessions.">
        <div className="flex gap-2">
          <button className="btn-ghost !border-primary !text-primary" aria-pressed="true">Graphite (dark)</button>
          <button className="btn-ghost" disabled title="Not available in prototype">Light</button>
        </div>
      </Section>

      <div className="py-8"><button onClick={() => toast.success("Settings saved")} className="btn-primary">Save changes</button></div>
    </div>
  );
}
