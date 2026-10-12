export type Sev = 1 | 2 | 3 | 4;
export type Status = "detected" | "investigating" | "mitigating" | "monitoring" | "resolved";
export type Priority = "critical" | "high" | "medium" | "low";
export type ActionStatus = "pending" | "in_progress" | "done";
export type EventKind = "update" | "decision" | "system" | "status" | "people";
export type NotifCategory = "mentions" | "assignments" | "updates" | "system";

export const STATUSES: Status[] = ["detected", "investigating", "mitigating", "monitoring", "resolved"];

export interface Person {
  id: string;
  name: string;
  short: string;
  title: string;
  initials: string;
  teamRole?: "owner" | "responder" | "viewer";
}

/** Live bindings: updated by the store when the signed-in team loads. */
export let PEOPLE: Person[] = [];
export let ME = "";
export function setPeople(p: Person[]) { PEOPLE = p; }
export function setMe(id: string) { ME = id; }
export const SYSTEM = "system";
export const toPerson = (id: string, name: string, title = "", teamRole?: Person["teamRole"]): Person => {
  const clean = name.trim() || "Teammate";
  const parts = clean.split(/\s+/);
  return {
    id, name: clean, short: parts[0] ?? clean, title,
    initials: ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?",
    teamRole,
  };
};
export const person = (id: string | null | undefined): Person => {
  if (!id) return { id: "", name: "Unassigned", short: "Unassigned", title: "", initials: "—" };
  return PEOPLE.find((p) => p.id === id) ?? { id, name: "Former member", short: "Former", title: "", initials: "?" };
};

export const ROLES = [
  { key: "commander", label: "Incident Commander", desc: "Controls incident status and coordination. Can resolve the incident." },
  { key: "tech", label: "Technical Lead", desc: "Owns technical investigation and mitigation decisions." },
  { key: "comms", label: "Communications", desc: "Handles stakeholder and customer communication." },
  { key: "observer", label: "Observer", desc: "Read-only participation. Can follow along, cannot change state." },
] as const;
export type RoleKey = (typeof ROLES)[number]["key"];

export interface Incident {
  id: string;
  title: string;
  sev: Sev;
  status: Status;
  team: string;
  startedAt: number;
  resolvedAt?: number | undefined;
  impact: string;
  systems: string[];
  roles: Record<RoleKey, string>;
  uuid: string;
  isSample: boolean;
  current: { text: string; by: string; at: number };
  resolution?: string | undefined;
  rootCause?: string | undefined;
  summary?: string | undefined;
}

export interface TimelineEvent {
  id: string;
  incidentId: string;
  at: number;
  kind: EventKind;
  title: string;
  by: string;
  note?: string | undefined;
}

export interface Action {
  id: string;
  incidentId: string;
  title: string;
  owner: string;
  priority: Priority;
  status: ActionStatus;
  due?: string | undefined;
}

export interface AuditEntry {
  id: string;
  at: number;
  user: string;
  verb: string;
  object: string;
  incidentId?: string | undefined;
}

export interface Notification {
  id: string;
  at: number;
  category: NotifCategory;
  title: string;
  body: string;
  read: boolean;
}

export const SEV_INFO: Record<Sev, { label: string; word: string; desc: string }> = {
  1: { label: "SEV-1", word: "Critical", desc: "Critical business impact or major outage." },
  2: { label: "SEV-2", word: "High", desc: "Significant degradation for many users." },
  3: { label: "SEV-3", word: "Medium", desc: "Partial impact, workaround available." },
  4: { label: "SEV-4", word: "Low", desc: "Minor issue, no customer impact." },
};

export const SYSTEMS = ["API", "Database", "Authentication", "Payments", "Frontend", "Infrastructure"];

export const pad = (x: number) => String(x).padStart(2, "0");
export const fmtTime = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};
export const fmtDur = (ms: number) => {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${pad(min % 60)}m`;
};
export const fmtAgo = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 45) return "just now";
  const min = Math.round(s / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};
export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
