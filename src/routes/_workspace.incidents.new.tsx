import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { PEOPLE, SEV_INFO, SYSTEMS, type Sev } from "@/lib/data";
import { useStore } from "@/lib/store";
import { sevTone } from "@/components/ir";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_workspace/incidents/new")({
  head: () => ({
    meta: [
      { title: "Declare an incident — IncidentRoom" },
      { name: "description", content: "Open a new incident room in four quick questions." },
      { property: "og:title", content: "Declare an incident — IncidentRoom" },
      { property: "og:description", content: "Something went wrong? Open an incident room in seconds." },
    ],
  }),
  component: NewIncident,
});

function NewIncident() {
  const { createIncident } = useStore();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [sev, setSev] = useState<Sev>(2);
  const [commander, setCommander] = useState("sarah");
  const [systems, setSystems] = useState<string[]>([]);
  const [phase, setPhase] = useState<"form" | "creating" | "ready">("form");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setPhase("creating");
    setTimeout(() => {
      const id = createIncident({ title: title.trim(), sev, commander, systems });
      setPhase("ready");
      setTimeout(() => navigate({ to: "/incidents/$id", params: { id } }), 800);
    }, 1100);
  };

  if (phase !== "form") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center" role="status" aria-live="polite">
        {phase === "creating" ? <Loader2 className="size-8 animate-spin text-primary" /> : <span className="flex size-10 items-center justify-center rounded-full bg-success text-background"><Check className="size-5" /></span>}
        <p className="font-display mt-4 text-3xl">{phase === "creating" ? "Creating incident room…" : "Incident room ready."}</p>
        <p className="mt-1 text-sm text-muted-foreground">{phase === "creating" ? "Paging responders and starting the timeline." : "Taking you there now."}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-10 pb-10">
      <div>
        <p className="eyebrow">Declare incident</p>
        <h1 className="font-display mt-2 text-5xl">Something went wrong.</h1>
      </div>

      <fieldset>
        <legend className="text-lg font-semibold"><span className="mr-2 font-mono text-sm text-primary">1</span>What happened?</legend>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Checkout API returning 500s" className="input mt-3 !min-h-12 !text-base" required autoFocus aria-label="Incident title" />
      </fieldset>

      <fieldset>
        <legend className="text-lg font-semibold"><span className="mr-2 font-mono text-sm text-primary">2</span>How severe is it?</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup">
          {([1, 2, 3, 4] as Sev[]).map((s) => (
            <button type="button" role="radio" aria-checked={sev === s} key={s} onClick={() => setSev(s)}
              className={cn("rounded-lg border p-3 text-left transition-colors", sev === s ? sevTone[s] : "bg-card hover:bg-accent")}>
              <span className="flex items-center justify-between font-mono text-sm font-semibold">{SEV_INFO[s].label} {sev === s && <Check className="size-4" />}</span>
              <span className="mt-1 block text-xs text-foreground/75">{SEV_INFO[s].desc}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-semibold"><span className="mr-2 font-mono text-sm text-primary">3</span>Who is responding?</legend>
        <label className="mt-3 block text-xs text-muted-foreground">Incident Commander
          <select value={commander} onChange={(e) => setCommander(e.target.value)} className="input mt-1.5">
            {PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-semibold"><span className="mr-2 font-mono text-sm text-primary">4</span>What systems are affected?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {SYSTEMS.map((s) => {
            const on = systems.includes(s);
            return (
              <button type="button" key={s} aria-pressed={on} onClick={() => setSystems(on ? systems.filter((x) => x !== s) : [...systems, s])}
                className={cn("rounded-full border px-3.5 py-1.5 text-sm", on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                {on && "✓ "}{s}
              </button>
            );
          })}
        </div>
      </fieldset>

      <button type="submit" disabled={!title.trim()} className="btn-primary !min-h-12 !px-6 !text-base">Create incident <ArrowRight className="size-4" /></button>
    </form>
  );
}
