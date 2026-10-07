import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ME, SEED_ACTIONS, SEED_AUDIT, SEED_INCIDENTS, SEED_NOTIFS, SEED_TIMELINE, START_NOW, SYSTEM, person,
  type Action, type AuditEntry, type EventKind, type Incident, type Notification, type NotifCategory,
  type Priority, type RoleKey, type Sev, type Status, type TimelineEvent,
} from "./data";

let seq = 1000;
const uid = (p: string) => `${p}-${++seq}`;

export interface NewIncident {
  title: string;
  sev: Sev;
  commander: string;
  systems: string[];
}

interface Store {
  now: number;
  incidents: Incident[];
  timeline: TimelineEvent[];
  actions: Action[];
  audit: AuditEntry[];
  notifications: Notification[];
  presence: Record<string, string[]>;
  live: boolean;
  demoMode: boolean;
  demoStep: number;
  setLive: (v: boolean) => void;
  setDemoMode: (v: boolean) => void;
  demoNext: () => string | null;
  postEvent: (incidentId: string, kind: EventKind, text: string, by?: string) => void;
  setStatus: (incidentId: string, status: Status, by?: string) => void;
  updateCurrent: (incidentId: string, text: string, by?: string) => void;
  addAction: (incidentId: string, a: { title: string; owner: string; priority: Priority; due?: string }, by?: string) => void;
  completeAction: (actionId: string, by?: string) => void;
  startAction: (actionId: string) => void;
  createIncident: (d: NewIncident, by?: string) => string;
  markAllRead: () => void;
}

const Ctx = createContext<Store | null>(null);
export const DEMO_ID = "INC-2050";
export const DEMO_STEPS = [
  "Incident detected",
  "Sarah becomes Incident Commander",
  "David joins",
  "Root cause identified",
  "Action assigned",
  "Mitigation deployed",
  "Impact decreases",
  "Incident resolved",
  "Post-incident report",
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(START_NOW);
  const [incidents, setIncidents] = useState(SEED_INCIDENTS);
  const [timeline, setTimeline] = useState(SEED_TIMELINE);
  const [actions, setActions] = useState(SEED_ACTIONS);
  const [audit, setAudit] = useState(SEED_AUDIT);
  const [notifications, setNotifs] = useState(SEED_NOTIFS);
  const [presence, setPresence] = useState<Record<string, string[]>>({
    "INC-2048": ["sarah", "david", "priya"],
    "INC-2045": ["david", "alex"],
    "INC-2039": ["priya"],
  });
  const [live, setLiveState] = useState(false);
  const [demoMode, setDemoModeState] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const created = useRef(0);
  const nowRef = useRef(now);
  nowRef.current = now;

  useEffect(() => {
    const t = setInterval(() => setNow((n) => n + 1000), 1000);
    return () => clearInterval(t);
  }, []);

  const at = () => nowRef.current;

  const log = useCallback((user: string, verb: string, object: string, incidentId?: string) => {
    setAudit((a) => [{ id: uid("au"), at: at(), user, verb, object, incidentId }, ...a]);
  }, []);

  const notify = useCallback((category: NotifCategory, title: string, body: string, toastIt = true) => {
    setNotifs((ns) => [{ id: uid("n"), at: at(), category, title, body, read: false }, ...ns]);
    if (toastIt) toast(title, { description: body });
  }, []);

  const addEvent = useCallback((incidentId: string, kind: EventKind, title: string, by: string, note?: string) => {
    setTimeline((t) => [...t, { id: uid("ev"), incidentId, at: at(), kind, title, by, note }]);
  }, []);

  const patchIncident = useCallback((incidentId: string, p: Partial<Incident> | ((i: Incident) => Partial<Incident>)) => {
    setIncidents((list) => list.map((i) => (i.id === incidentId ? { ...i, ...(typeof p === "function" ? p(i) : p) } : i)));
  }, []);

  const postEvent: Store["postEvent"] = useCallback((incidentId, kind, text, by = ME) => {
    const title = kind === "decision" ? "Decision recorded" : kind === "system" ? "System event" : `${person(by).short} posted an update`;
    addEvent(incidentId, kind, title, by, text);
    log(by, kind === "decision" ? "recorded decision" : "posted update", text.slice(0, 60), incidentId);
  }, [addEvent, log]);

  const setStatus: Store["setStatus"] = useCallback((incidentId, status, by = ME) => {
    let prev: Status | undefined;
    setIncidents((list) => list.map((i) => {
      if (i.id !== incidentId) return i;
      prev = i.status;
      return { ...i, status, resolvedAt: status === "resolved" ? at() : undefined };
    }));
    const label = status === "resolved" ? "Incident resolved" : `Status changed to ${status.toUpperCase()}`;
    addEvent(incidentId, "status", label, by);
    log(by, "changed status", `${(prev ?? "").toUpperCase() || "—"} → ${status.toUpperCase()}`, incidentId);
  }, [addEvent, log]);

  const updateCurrent: Store["updateCurrent"] = useCallback((incidentId, text, by = ME) => {
    patchIncident(incidentId, { current: { text, by, at: at() } });
    addEvent(incidentId, "update", "Current status updated", by, text);
    log(by, "updated current status", text.slice(0, 60), incidentId);
  }, [patchIncident, addEvent, log]);

  const addAction: Store["addAction"] = useCallback((incidentId, a, by = ME) => {
    setActions((list) => [{ id: uid("act"), incidentId, status: "pending", ...a }, ...list]);
    addEvent(incidentId, "people", "Action assigned", by, `${a.title} → ${person(a.owner).name}`);
    log(by, `assigned action to ${person(a.owner).name}`, a.title, incidentId);
    if (a.owner === ME && by !== ME) notify("assignments", "You were assigned an action", a.title);
  }, [addEvent, log, notify]);

  const completeAction: Store["completeAction"] = useCallback((actionId, by = ME) => {
    const found = actionsRef.current.find((a) => a.id === actionId);
    if (!found || found.status === "done") return;
    setActions((list) => list.map((a) => (a.id === actionId ? { ...a, status: "done" } : a)));
    addEvent(found.incidentId, "people", `${person(by).short} completed an action`, by, found.title);
    log(by, "completed action", found.title, found.incidentId);
  }, [addEvent, log]);

  const startAction: Store["startAction"] = useCallback((actionId) => {
    setActions((list) => list.map((a) => (a.id === actionId ? { ...a, status: "in_progress" } : a)));
  }, []);

  const createIncident: Store["createIncident"] = useCallback((d, by = ME) => {
    const id = `INC-${2051 + created.current++}`;
    const roles: Record<RoleKey, string> = { commander: d.commander, tech: "david", comms: "priya", observer: "alex" };
    const inc: Incident = {
      id, title: d.title, sev: d.sev, status: "detected", team: "Platform", startedAt: at(),
      impact: "Impact being assessed", systems: d.systems, roles,
      current: { text: "Incident declared. Responders are being paged.", by, at: at() },
    };
    setIncidents((l) => [inc, ...l]);
    setPresence((p) => ({ ...p, [id]: [by] }));
    addEvent(id, "system", "Incident declared", by, d.title);
    addEvent(id, "people", "Incident Commander assigned", by, `${person(d.commander).name} took command.`);
    log(by, "created incident", `${id} · ${d.title}`, id);
    return id;
  }, [addEvent, log]);

  const markAllRead = useCallback(() => setNotifs((ns) => ns.map((n) => ({ ...n, read: true }))), []);

  // ---------- Live simulation ----------
  const simIdx = useRef(0);
  const liveScript = useRef<(() => void)[]>([]);
  liveScript.current = [
    () => {
      setPresence((p) => ({ ...p, "INC-2048": Array.from(new Set([...(p["INC-2048"] ?? []), "alex"])) }));
      addEvent("INC-2048", "people", "Alex Johnson joined the incident room", "alex");
      notify("updates", "Alex Johnson joined INC-2048", "Now 4 responders online.");
    },
    () => {
      postEvent("INC-2048", "update", "p95 latency down from 4.8s to 1.9s after pool change.", "david");
      notify("updates", "David updated INC-2048", "p95 latency down to 1.9s.");
    },
    () => {
      const a = SEED_ACTIONS.find((x) => x.title === "Notify customer support");
      if (a) completeAction(a.id, "priya");
      notify("updates", "Priya completed “Notify customer support”", "INC-2048");
    },
    () => {
      addEvent("INC-2048", "system", "Monitoring detected recovery", SYSTEM, "Checkout error rate back under 1%.");
      notify("system", "Monitoring detected recovery", "INC-2048 error rate under 1%.");
    },
    () => addAction("INC-2048", { title: "Verify database recovery", owner: "sarah", priority: "high", due: "10 min" }, "david"),
    () => {
      setStatus("INC-2048", "monitoring", "sarah");
      notify("updates", "Incident status updated", "INC-2048 is now MONITORING.");
    },
  ];

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      const fn = liveScript.current[simIdx.current];
      if (!fn) {
        setLiveState(false);
        toast("Simulation finished", { description: "All scripted teammate activity has played." });
        return;
      }
      fn();
      simIdx.current += 1;
    }, 5000);
    return () => clearInterval(t);
  }, [live]);

  // ---------- Demo mode ----------
  const demoNext = useCallback((): string | null => {
    const s = demoStep;
    const id = DEMO_ID;
    switch (s) {
      case 0: {
        const inc: Incident = {
          id, title: "Payment webhook failures", sev: 2, status: "detected", team: "Payments", startedAt: at(),
          impact: "~40% of payment confirmations delayed", systems: ["Payments", "API"],
          roles: { commander: "sarah", tech: "david", comms: "priya", observer: "alex" },
          current: { text: "Webhook delivery errors spiking from payment provider.", by: SYSTEM, at: at() },
          rootCause: "Webhook signing secret expired on the gateway.",
          resolution: "Signing secret rotated and failed webhooks replayed.",
          summary: "Payment confirmations were delayed because the webhook gateway rejected signed payloads after its signing secret expired.",
        };
        setIncidents((l) => [inc, ...l.filter((i) => i.id !== id)]);
        setPresence((p) => ({ ...p, [id]: [] }));
        addEvent(id, "system", "Incident detected", SYSTEM, "Webhook 401 rate above 30%.");
        log(SYSTEM, "created incident", `${id} · Payment webhook failures`, id);
        notify("system", "New incident: INC-2050", "Payment webhook failures · SEV-2");
        break;
      }
      case 1:
        setPresence((p) => ({ ...p, [id]: ["sarah"] }));
        addEvent(id, "people", "Sarah Chen assigned as Incident Commander", "sarah");
        log("sarah", "became Incident Commander", id, id);
        break;
      case 2:
        setPresence((p) => ({ ...p, [id]: ["sarah", "david", "priya"] }));
        addEvent(id, "people", "David Lee and Priya Shah joined", "david");
        break;
      case 3:
        setStatus(id, "investigating", "sarah");
        patchIncident(id, { sev: 1, current: { text: "Webhook signing secret expired — gateway rejecting all signed payloads.", by: "david", at: at() } });
        addEvent(id, "decision", "Root cause identified · severity raised to SEV-1", "david", "Signing secret expired at 09:30.");
        log("sarah", "changed severity", "SEV-2 → SEV-1", id);
        break;
      case 4:
        addAction(id, { title: "Rotate webhook signing secret", owner: "david", priority: "critical", due: "5 min" }, "sarah");
        addAction(id, { title: "Post customer status update", owner: "priya", priority: "high", due: "10 min" }, "sarah");
        break;
      case 5:
        setStatus(id, "mitigating", "sarah");
        setActions((l) => l.map((a) => (a.incidentId === id && a.owner === "david" ? { ...a, status: "done" } : a)));
        addEvent(id, "update", "Mitigation deployed", "david", "New secret live; replaying failed webhooks.");
        break;
      case 6:
        setStatus(id, "monitoring", "sarah");
        patchIncident(id, { impact: "Under 2% of confirmations delayed", current: { text: "Replay complete. Failure rate down to 2% and falling.", by: "david", at: at() } });
        setActions((l) => l.map((a) => (a.incidentId === id ? { ...a, status: "done" } : a)));
        break;
      case 7:
        setStatus(id, "resolved", "sarah");
        notify("updates", "INC-2050 resolved", "Payment webhook failures resolved.");
        break;
      default:
        break;
    }
    setDemoStep(Math.min(s + 1, DEMO_STEPS.length));
    return id;
  }, [demoStep, addEvent, log, notify, setStatus, patchIncident, addAction]);

  const setDemoMode = (v: boolean) => {
    setDemoModeState(v);
    if (!v) setDemoStep(0);
  };
  const setLive = (v: boolean) => {
    if (v && !liveScript.current[simIdx.current]) simIdx.current = 0;
    setLiveState(v);
  };

  return (
    <Ctx.Provider value={{
      now, incidents, timeline, actions, audit, notifications, presence, live, demoMode, demoStep,
      setLive, setDemoMode, demoNext, postEvent, setStatus, updateCurrent, addAction, completeAction,
      startAction, createIncident, markAllRead,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

export const isActive = (i: Incident) => i.status !== "resolved";
