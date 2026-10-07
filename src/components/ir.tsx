import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Check, CircleDot, Flag, Info, MessageSquare, Plus, Radio, UserPlus, Users } from "lucide-react";
import {
  ME, PEOPLE, SEV_INFO, STATUSES, fmtTime, person,
  type Action, type EventKind, type Priority, type Sev, type Status, type TimelineEvent,
} from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const sevTone: Record<Sev, string> = {
  1: "text-critical border-critical/40 bg-critical/10",
  2: "text-high border-high/40 bg-high/10",
  3: "text-medium border-medium/30 bg-medium/10",
  4: "text-muted-foreground border-border bg-muted",
};

export function SevBadge({ sev, word, className }: { sev: Sev; word?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide", sevTone[sev], className)}>
      <span className={cn("size-1.5 rounded-full bg-current", sev === 1 && "animate-pulse")} aria-hidden />
      {word ? SEV_INFO[sev].word.toUpperCase() : SEV_INFO[sev].label}
    </span>
  );
}

const statusTone: Record<Status, string> = {
  detected: "text-critical",
  investigating: "text-high",
  mitigating: "text-primary",
  monitoring: "text-info",
  resolved: "text-success",
};

export function StatusText({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider", statusTone[status], className)}>
      {status === "resolved" ? <Check className="size-3.5" aria-hidden /> : <CircleDot className="size-3" aria-hidden />}
      {status.toUpperCase()}
    </span>
  );
}

const priTone: Record<Priority, string> = {
  critical: "text-critical",
  high: "text-high",
  medium: "text-medium",
  low: "text-muted-foreground",
};
export function PriorityText({ p }: { p: Priority }) {
  return <span className={cn("font-mono text-[11px] uppercase tracking-wider", priTone[p])}>{p}</span>;
}

const avatarTone: Record<string, string> = {
  sarah: "bg-primary/20 text-primary",
  david: "bg-info/20 text-info",
  priya: "bg-role/20 text-role",
  alex: "bg-success/15 text-success",
};
export function Avatar({ id, size = "md", className }: { id: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const p = person(id);
  return (
    <span
      title={p.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-mono font-semibold ring-2 ring-background",
        avatarTone[id] ?? "bg-muted text-muted-foreground",
        size === "sm" && "size-6 text-[9px]",
        size === "md" && "size-8 text-[11px]",
        size === "lg" && "size-12 text-sm",
        className,
      )}
    >
      {p.initials}
    </span>
  );
}

export function ownerName(id: string) {
  return id === ME ? "You" : person(id).name;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("eyebrow", className)}>{children}</div>;
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border bg-card", className)}>{children}</section>;
}

export function EmptyState({ title, body, icon }: { title: string; body: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center">
      <div className="mb-3 text-success">{icon ?? <Check className="size-6" />}</div>
      <p className="font-display text-2xl">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

/** Goal-gradient progress track. */
export function StatusTrack({ status, onPick, compact }: { status: Status; onPick?: (s: Status) => void; compact?: boolean }) {
  const idx = STATUSES.indexOf(status);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Incident progress">
      {STATUSES.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        const content = (
          <>
            <span
              className={cn(
                "block h-1 rounded-full transition-colors duration-500",
                done ? "bg-success" : current ? (s === "resolved" ? "bg-success" : "bg-primary") : "bg-muted",
              )}
            />
            {!compact && (
              <span className={cn("mt-2 flex items-center gap-1 font-mono text-[10px] tracking-wider sm:text-[11px]", current ? "text-foreground" : done ? "text-success" : "text-muted-foreground")}>
                {done && <Check className="size-3" aria-hidden />}
                {s.toUpperCase()}
              </span>
            )}
          </>
        );
        return (
          <li key={s} aria-current={current ? "step" : undefined}>
            {onPick ? (
              <button
                type="button"
                disabled={current}
                onClick={() => onPick(s)}
                className="w-full rounded px-0.5 pb-1 pt-2 text-left hover:bg-accent/50 disabled:cursor-default disabled:hover:bg-transparent"
                aria-label={`Set status to ${s}`}
              >
                {content}
              </button>
            ) : (
              <div className="pt-2">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const kindIcon: Record<EventKind, ReactNode> = {
  update: <MessageSquare className="size-3.5" />,
  decision: <Flag className="size-3.5" />,
  system: <Radio className="size-3.5" />,
  status: <CircleDot className="size-3.5" />,
  people: <Users className="size-3.5" />,
};
const kindTone: Record<EventKind, string> = {
  update: "text-foreground border-border",
  decision: "text-primary border-primary/40",
  system: "text-info border-info/40",
  status: "text-success border-success/40",
  people: "text-role border-role/40",
};
const kindLabel: Record<EventKind, string> = {
  update: "Update", decision: "Decision", system: "System", status: "Status", people: "People",
};

export function Timeline({ events, limit }: { events: TimelineEvent[]; limit?: number }) {
  const sorted = [...events].sort((a, b) => b.at - a.at);
  const shown = limit ? sorted.slice(0, limit) : sorted;
  if (!shown.length) return <p className="py-6 text-sm text-muted-foreground">No events yet.</p>;
  return (
    <ol className="relative">
      {shown.map((e, i) => (
        <li key={e.id} className="animate-enter relative grid grid-cols-[3.25rem_1.75rem_1fr] gap-x-2 pb-6 last:pb-0">
          <time className="pt-0.5 text-right font-mono text-xs text-muted-foreground">{fmtTime(e.at)}</time>
          <div className="relative flex justify-center">
            {i < shown.length - 1 && <span className="absolute top-7 bottom-[-1.5rem] w-px bg-border" aria-hidden />}
            <span className={cn("relative z-10 flex size-6 items-center justify-center rounded-full border bg-card", kindTone[e.kind])} aria-label={kindLabel[e.kind]}>
              {kindIcon[e.kind]}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug">{e.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{person(e.by).name} · <span className="font-mono">{kindLabel[e.kind]}</span></p>
            {e.note && <p className="mt-1.5 text-sm text-foreground/80">“{e.note}”</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Composer({ incidentId, disabled }: { incidentId: string; disabled?: boolean }) {
  const { postEvent } = useStore();
  const [text, setText] = useState("");
  const send = (kind: EventKind) => {
    if (!text.trim()) return;
    postEvent(incidentId, kind, text.trim());
    setText("");
  };
  return (
    <div className="rounded-lg border bg-surface p-3">
      <label htmlFor={`composer-${incidentId}`} className="text-sm font-medium">What happened?</label>
      <textarea
        id={`composer-${incidentId}`}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send("update"); }}
        placeholder="Share an update with the incident team…"
        rows={3}
        className="mt-2 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={() => send("update")} disabled={!text.trim()} className="btn-primary">Post update</button>
        <button onClick={() => send("decision")} disabled={!text.trim()} className="btn-ghost"><Flag className="size-3.5" /> Add decision</button>
        <button onClick={() => send("system")} disabled={!text.trim()} className="btn-ghost"><Info className="size-3.5" /> Add system event</button>
        <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground sm:inline">⌘↵ to post</span>
      </div>
    </div>
  );
}

export function ActionCard({ a, showIncident }: { a: Action; showIncident?: boolean }) {
  const { completeAction, startAction } = useStore();
  const done = a.status === "done";
  return (
    <div className={cn("animate-enter rounded-md border bg-surface p-3 transition-opacity", done && "opacity-60")}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => !done && completeAction(a.id)}
          disabled={done}
          aria-label={done ? "Completed" : `Mark “${a.title}” complete`}
          className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors", done ? "border-success bg-success text-background" : "hover:border-success")}
        >
          {done && <Check className="size-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium leading-snug", done && "line-through")}>{a.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Avatar id={a.owner} size="sm" className="ring-0" /> Owner: <b className="font-medium text-foreground">{ownerName(a.owner)}</b></span>
            <PriorityText p={a.priority} />
            {a.due && !done && <span className="font-mono">due {a.due}</span>}
            {showIncident && (
              <Link to="/incidents/$id" params={{ id: a.incidentId }} className="font-mono text-primary hover:underline">{a.incidentId}</Link>
            )}
          </div>
          {!done && a.status === "pending" && a.owner === ME && (
            <button onClick={() => startAction(a.id)} className="mt-2 text-xs text-primary hover:underline">Start working →</button>
          )}
        </div>
        <span className={cn("shrink-0 font-mono text-[10px] uppercase tracking-wider", done ? "text-success" : a.status === "in_progress" ? "text-primary" : "text-muted-foreground")}>
          {done ? "✓ Done" : a.status === "in_progress" ? "In progress" : "Pending"}
        </span>
      </div>
    </div>
  );
}

export function AddActionDialog({ incidentId, open, onOpenChange }: { incidentId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { addAction } = useStore();
  const [title, setTitle] = useState("Verify database recovery");
  const [owner, setOwner] = useState("sarah");
  const [priority, setPriority] = useState<Priority>("high");
  const [due, setDue] = useState("10 min");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="size-4 text-primary" /> Assign an action</DialogTitle>
          <DialogDescription>Every action needs a single, clear owner.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            addAction(incidentId, { title: title.trim(), owner, priority, due });
            onOpenChange(false);
            setTitle("");
          }}
        >
          <Field label="Action">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" required autoFocus />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Owner">
              <select value={owner} onChange={(e) => setOwner(e.target.value)} className="input">
                {PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="input">
                {(["critical", "high", "medium", "low"] as Priority[]).map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Due">
              <select value={due} onChange={(e) => setDue(e.target.value)} className="input">
                {["5 min", "10 min", "15 min", "30 min", "1 hour"].map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => onOpenChange(false)} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary">Assign action</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function AddActionButton({ incidentId }: { incidentId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost w-full justify-center"><Plus className="size-4" /> Add action</button>
      <AddActionDialog incidentId={incidentId} open={open} onOpenChange={setOpen} />
    </>
  );
}
