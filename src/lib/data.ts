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
}

export const PEOPLE: Person[] = [
  { id: "sarah", name: "Sarah Chen", short: "Sarah", title: "Site Reliability Lead", initials: "SC" },
  { id: "david", name: "David Lee", short: "David", title: "Senior Backend Engineer", initials: "DL" },
  { id: "priya", name: "Priya Shah", short: "Priya", title: "Engineering Manager", initials: "PS" },
  { id: "alex", name: "Alex Johnson", short: "Alex", title: "Frontend Engineer", initials: "AJ" },
];
export const ME = "sarah";
export const SYSTEM = "system";
export const person = (id: string): Person =>
  PEOPLE.find((p) => p.id === id) ?? { id, name: "Monitoring system", short: "System", title: "Automated", initials: "⚙" };

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
  resolvedAt?: number;
  impact: string;
  systems: string[];
  roles: Record<RoleKey, string>;
  current: { text: string; by: string; at: number };
  resolution?: string;
  rootCause?: string;
  summary?: string;
}

export interface TimelineEvent {
  id: string;
  incidentId: string;
  at: number;
  kind: EventKind;
  title: string;
  by: string;
  note?: string;
}

export interface Action {
  id: string;
  incidentId: string;
  title: string;
  owner: string;
  priority: Priority;
  status: ActionStatus;
  due?: string;
}

export interface AuditEntry {
  id: string;
  at: number;
  user: string;
  verb: string;
  object: string;
  incidentId?: string;
}

export interface Notification {
  id: string;
  at: number;
  category: NotifCategory;
  title: string;
  body: string;
  read: boolean;
}

/** Fixed simulated clock so server and browser render identically. */
export const BASE = Date.UTC(2026, 9, 7, 9, 41, 0);
export const m = (min: number) => BASE + min * 60_000;
export const START_NOW = BASE + (18 * 60 + 42) * 1000;

const team2048 = { commander: "sarah", tech: "david", comms: "priya", observer: "alex" };

export const SEED_INCIDENTS: Incident[] = [
  {
    id: "INC-2048", title: "Checkout API latency", sev: 1, status: "mitigating", team: "Payments",
    startedAt: m(0), impact: "28% of checkout requests", systems: ["API", "Database"], roles: team2048,
    current: { text: "Database connection pool saturation is causing elevated API latency.", by: "david", at: m(16.5) },
    rootCause: "Database connection pool saturation.",
    resolution: "Database connection pool increased to 250.",
    summary: "A traffic spike exhausted the primary database connection pool, causing checkout API requests to queue. Latency rose to a peak of 4.8 seconds until the pool was enlarged and traffic stabilised.",
  },
  {
    id: "INC-2045", title: "Authentication failures", sev: 2, status: "investigating", team: "Identity",
    startedAt: m(-24), impact: "~6% of sign-in attempts failing", systems: ["Authentication"],
    roles: { commander: "david", tech: "alex", comms: "priya", observer: "sarah" },
    current: { text: "Token refresh errors correlate with yesterday's auth SDK rollout.", by: "alex", at: m(14) },
  },
  {
    id: "INC-2039", title: "Delayed analytics events", sev: 3, status: "monitoring", team: "Data",
    startedAt: m(-54), impact: "Dashboards delayed by ~15 min", systems: ["Infrastructure"],
    roles: { commander: "priya", tech: "david", comms: "priya", observer: "alex" },
    current: { text: "Queue consumers scaled up; backlog draining steadily.", by: "priya", at: m(10) },
  },
  {
    id: "INC-2042", title: "Authentication failures", sev: 2, status: "resolved", team: "Identity",
    startedAt: m(-60 * 26), resolvedAt: m(-60 * 26 + 41), impact: "11% of sign-ins failed", systems: ["Authentication"],
    roles: { commander: "david", tech: "alex", comms: "priya", observer: "sarah" },
    current: { text: "Expired signing certificate replaced.", by: "david", at: m(-60 * 26 + 38) },
    rootCause: "Expired SAML signing certificate.", resolution: "Certificate rotated and cached sessions invalidated.",
  },
  {
    id: "INC-2038", title: "Analytics delay", sev: 3, status: "resolved", team: "Data",
    startedAt: m(-60 * 72), resolvedAt: m(-60 * 72 + 72), impact: "Reports delayed up to 2h", systems: ["Infrastructure"],
    roles: { commander: "priya", tech: "david", comms: "priya", observer: "alex" },
    current: { text: "Consumers restored.", by: "priya", at: m(-60 * 72 + 70) },
    rootCause: "Consumer group stuck after broker upgrade.", resolution: "Consumer group reset and autoscaling limits raised.",
  },
];

let n = 0;
const id = (p: string) => `${p}-${++n}`;
const ev = (incidentId: string, min: number, kind: EventKind, title: string, by: string, note?: string): TimelineEvent => ({
  id: id("ev"), incidentId, at: m(min), kind, title, by, note,
});

export const SEED_TIMELINE: TimelineEvent[] = [
  ev("INC-2048", 0, "system", "Incident detected", SYSTEM, "Checkout p95 latency above 2s for 3 minutes."),
  ev("INC-2048", 2, "people", "Incident Commander assigned", "sarah", "Sarah Chen took command."),
  ev("INC-2048", 4, "update", "Investigation started", "sarah", "API latency appears correlated with database load."),
  ev("INC-2048", 7, "decision", "Database issue identified", "david", "Primary database showing connection saturation."),
  ev("INC-2048", 10, "status", "Mitigation deployed", "david", "Connection pool increased from 100 → 250."),
  ev("INC-2045", -24, "system", "Incident detected", SYSTEM, "Auth error rate above 5%."),
  ev("INC-2045", -20, "people", "Incident Commander assigned", "david"),
  ev("INC-2045", 14, "update", "SDK rollout suspected", "alex", "Token refresh errors began 14:02 yesterday."),
  ev("INC-2039", -54, "system", "Incident detected", SYSTEM, "Event lag above 10 minutes."),
  ev("INC-2039", -30, "status", "Consumers scaled", "priya", "Scaled from 4 → 12 consumers."),
  ev("INC-2039", 10, "status", "Monitoring backlog", "priya"),
  ev("INC-2042", -60 * 26, "system", "Incident detected", SYSTEM),
  ev("INC-2042", -60 * 26 + 18, "decision", "Root cause identified", "david", "SAML signing certificate expired."),
  ev("INC-2042", -60 * 26 + 41, "status", "Incident resolved", "david"),
  ev("INC-2038", -60 * 72, "system", "Incident detected", SYSTEM),
  ev("INC-2038", -60 * 72 + 72, "status", "Incident resolved", "priya"),
];

const act = (incidentId: string, title: string, owner: string, priority: Priority, status: ActionStatus, due?: string): Action => ({
  id: id("act"), incidentId, title, owner, priority, status, due,
});

export const SEED_ACTIONS: Action[] = [
  act("INC-2048", "Investigate database connection pool", "sarah", "critical", "in_progress", "10 min"),
  act("INC-2048", "Increase database connection pool", "david", "critical", "in_progress"),
  act("INC-2048", "Verify checkout recovery", "sarah", "high", "pending", "15 min"),
  act("INC-2048", "Notify customer support", "priya", "medium", "pending"),
  act("INC-2048", "Identify source of latency", "david", "critical", "done"),
  act("INC-2045", "Confirm rollback metrics", "sarah", "high", "pending", "20 min"),
  act("INC-2045", "Review auth provider error logs", "alex", "high", "in_progress"),
  act("INC-2039", "Watch event queue backlog", "priya", "medium", "in_progress"),
  act("INC-2042", "Rotate signing certificate", "david", "critical", "done"),
  act("INC-2038", "Reset consumer group", "priya", "high", "done"),
];

const au = (min: number, user: string, verb: string, object: string, incidentId?: string): AuditEntry => ({
  id: id("au"), at: m(min), user, verb, object, incidentId,
});

export const SEED_AUDIT: AuditEntry[] = [
  au(10, "david", "changed status", "INVESTIGATING → MITIGATING", "INC-2048"),
  au(7, "david", "posted update", "Database issue identified", "INC-2048"),
  au(5, "sarah", "assigned action to David Lee", "Increase database connection pool", "INC-2048"),
  au(2, "sarah", "became Incident Commander", "INC-2048", "INC-2048"),
  au(0, SYSTEM, "created incident", "INC-2048 · Checkout API latency", "INC-2048"),
  au(-20, "david", "became Incident Commander", "INC-2045", "INC-2045"),
  au(-24, SYSTEM, "created incident", "INC-2045 · Authentication failures", "INC-2045"),
  au(-30, "priya", "changed status", "INVESTIGATING → MONITORING", "INC-2039"),
].sort((a, b) => b.at - a.at);

export const SEED_NOTIFS: Notification[] = [
  { id: id("n"), at: m(16.5), category: "updates", title: "David updated INC-2048", body: "Database connection pool increased.", read: false },
  { id: id("n"), at: m(13.5), category: "assignments", title: "You were assigned an action", body: "Verify checkout recovery.", read: false },
  { id: id("n"), at: m(10.5), category: "system", title: "Incident severity changed", body: "INC-2045 raised to SEV-2.", read: true },
  { id: id("n"), at: m(6), category: "mentions", title: "Priya mentioned you", body: "“@Sarah can you confirm customer comms wording?”", read: true },
];

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
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
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
  new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
