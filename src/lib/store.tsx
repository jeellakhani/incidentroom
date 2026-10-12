import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  setMe, setPeople, toPerson,
  type Action, type AuditEntry, type EventKind, type Incident, type Notification,
  type Person, type Priority, type RoleKey, type Sev, type Status, type TimelineEvent,
} from "./data";

export interface NewIncident {
  title: string;
  sev: Sev;
  commander: string;
  systems: string[];
}
export interface IncidentPatch {
  title?: string;
  sev?: Sev;
  impact?: string;
  roles?: Partial<Record<RoleKey, string>>;
  rootCause?: string;
  resolution?: string;
  summary?: string;
}
type TeamRole = "owner" | "responder" | "viewer";
interface Team { id: string; name: string; role: TeamRole }

interface Store {
  ready: boolean;
  loadError: string | null;
  userId: string;
  team: Team | null;
  teams: Team[];
  canEdit: boolean;
  isOwner: boolean;
  now: number;
  people: Person[];
  incidents: Incident[];
  timeline: TimelineEvent[];
  actions: Action[];
  audit: AuditEntry[];
  notifications: Notification[];
  refresh: () => Promise<void>;
  switchTeam: (id: string) => void;
  postEvent: (incidentRef: string, kind: EventKind, text: string) => Promise<boolean>;
  setStatus: (incidentRef: string, status: Status) => Promise<boolean>;
  updateCurrent: (incidentRef: string, text: string) => Promise<boolean>;
  updateIncident: (incidentRef: string, p: IncidentPatch) => Promise<boolean>;
  deleteIncident: (incidentRef: string) => Promise<boolean>;
  addAction: (incidentRef: string, a: { title: string; owner: string; priority: Priority; due?: string }) => Promise<boolean>;
  completeAction: (actionId: string) => Promise<boolean>;
  startAction: (actionId: string) => Promise<boolean>;
  createIncident: (d: NewIncident) => Promise<string | null>;
  markAllRead: () => Promise<void>;
  loadSample: () => Promise<boolean>;
  clearSample: () => Promise<boolean>;
  addMember: (email: string, role: TeamRole) => Promise<boolean>;
  removeMember: (userId: string) => Promise<boolean>;
  renameTeam: (name: string) => Promise<boolean>;
  updateProfile: (name: string, title: string) => Promise<boolean>;
}

const Ctx = createContext<Store | null>(null);
const TEAM_KEY = "incidentroom.team";
const ms = (t: string | null | undefined) => (t ? new Date(t).getTime() : 0);

/** Show a real failure message — never pretend an operation succeeded. */
function fail(e: unknown, what: string): false {
  const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);
  const friendly = /row-level security|permission denied/i.test(msg)
    ? "You don't have permission to do that in this team."
    : msg;
  toast.error(`Couldn't ${what}`, { description: friendly });
  return false;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now());
  const [userId, setUserId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [people, setPeopleState] = useState<Person[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [notifications, setNotifs] = useState<Notification[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const refByUuid = useRef(new Map<string, string>());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Track auth user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        setUserId(session?.user?.id ?? "");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadTeams = useCallback(async (uid: string) => {
    const { data, error } = await supabase.from("team_members").select("role, team_id, teams(id, name)").eq("user_id", uid);
    if (error) throw error;
    const list: Team[] = (data ?? []).flatMap((r) => (r.teams ? [{ id: r.teams.id, name: r.teams.name, role: r.role as TeamRole }] : []));
    setTeams(list);
    const saved = typeof window !== "undefined" ? localStorage.getItem(TEAM_KEY) : null;
    const pick = list.find((t) => t.id === saved) ?? list.find((t) => t.role === "owner") ?? list[0];
    setTeamId(pick?.id ?? null);
    return pick?.id ?? null;
  }, []);

  const loadTeamData = useCallback(async (tid: string, uid: string) => {
    const [mem, inc, ev, act, au, no] = await Promise.all([
      supabase.from("team_members").select("user_id, role").eq("team_id", tid),
      supabase.from("incidents").select("*").eq("team_id", tid).order("started_at", { ascending: false }),
      supabase.from("incident_events").select("*").eq("team_id", tid).order("created_at", { ascending: false }).limit(1000),
      supabase.from("incident_actions").select("*").eq("team_id", tid).order("created_at", { ascending: false }),
      supabase.from("audit_log").select("*").eq("team_id", tid).order("created_at", { ascending: false }).limit(300),
      supabase.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
    ]);
    const err = mem.error ?? inc.error ?? ev.error ?? act.error ?? au.error ?? no.error;
    if (err) throw err;
    const ids = (mem.data ?? []).map((m) => m.user_id);
    const prof = ids.length ? await supabase.from("profiles").select("id, display_name, email, title").in("id", ids) : { data: [], error: null };
    if (prof.error) throw prof.error;
    const ppl = (mem.data ?? []).map((m) => {
      const p = prof.data?.find((x) => x.id === m.user_id);
      return toPerson(m.user_id, p?.display_name || p?.email?.split("@")[0] || "Teammate", p?.title ?? "", m.role as TeamRole);
    });
    setPeople(ppl);
    setPeopleState(ppl);

    const map = new Map<string, string>();
    const incs: Incident[] = (inc.data ?? []).map((r) => {
      map.set(r.id, r.ref);
      return {
        id: r.ref, uuid: r.id, title: r.title, sev: r.sev as Sev, status: r.status as Status, team: r.team_label,
        startedAt: ms(r.started_at), resolvedAt: r.resolved_at ? ms(r.resolved_at) : undefined,
        impact: r.impact, systems: r.systems ?? [],
        roles: { commander: r.commander_id ?? "", tech: r.tech_id ?? "", comms: r.comms_id ?? "", observer: r.observer_id ?? "" },
        current: { text: r.current_text, by: r.current_by ?? "", at: ms(r.current_at) },
        rootCause: r.root_cause ?? undefined, resolution: r.resolution ?? undefined, summary: r.summary ?? undefined,
        isSample: r.is_sample,
      };
    });
    refByUuid.current = map;
    setIncidents(incs);
    setTimeline((ev.data ?? []).map((r) => ({
      id: r.id, incidentId: map.get(r.incident_id) ?? "", at: ms(r.created_at), kind: r.kind as EventKind,
      title: r.title, by: r.actor_id ?? "", note: r.note ?? undefined,
    })));
    setActions((act.data ?? []).map((r) => ({
      id: r.id, incidentId: map.get(r.incident_id) ?? "", title: r.title, owner: r.owner_id,
      priority: r.priority as Priority, status: r.status as Action["status"], due: r.due_label ?? undefined,
    })));
    setAudit((au.data ?? []).map((r) => ({
      id: r.id, at: ms(r.created_at), user: r.actor_id ?? "system", verb: r.verb, object: r.object,
      incidentId: r.incident_id ? map.get(r.incident_id) ?? r.incident_ref ?? undefined : r.incident_ref ?? undefined,
    })));
    setNotifs((no.data ?? []).map((r) => ({
      id: r.id, at: ms(r.created_at), category: r.category, title: r.title, body: r.body, read: r.read,
    })));
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      setLoadError(null);
      setMe(userId);
      const tid = teamId ?? (await loadTeams(userId));
      if (tid) await loadTeamData(tid, userId);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load your workspace.");
    } finally {
      setReady(true);
    }
  }, [userId, teamId, loadTeams, loadTeamData]);

  useEffect(() => {
    if (!userId) { setReady(false); setTeamId(null); return; }
    setMe(userId);
    loadTeams(userId).catch((e) => { setLoadError(e.message); setReady(true); });
  }, [userId, loadTeams]);

  useEffect(() => { if (userId && teamId) void refresh(); }, [userId, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: refetch (debounced) when anything in this team changes.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    if (!teamId || !userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bump = () => { clearTimeout(timer); timer = setTimeout(() => void refreshRef.current(), 400); };
    const ch = supabase.channel(`team-${teamId}`);
    for (const table of ["incidents", "incident_events", "incident_actions"] as const) {
      ch.on("postgres_changes", { event: "*", schema: "public", table, filter: `team_id=eq.${teamId}` }, bump);
    }
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p) => {
      const n = p.new as { title?: string; body?: string };
      if (n.title) toast(n.title, { description: n.body });
      bump();
    });
    ch.subscribe();
    return () => { clearTimeout(timer); void supabase.removeChannel(ch); };
  }, [teamId, userId]);

  const team = teams.find((t) => t.id === teamId) ?? null;
  const uuidOf = (ref: string) => incidents.find((i) => i.id === ref)?.uuid;

  const addEvent = async (incUuid: string, kind: EventKind, title: string, note?: string) => {
    const { error } = await supabase.from("incident_events").insert({
      incident_id: incUuid, team_id: teamId!, kind, title, note: note ?? null, actor_id: userId,
    });
    if (error) throw error;
  };

  const api = useMemo(() => {
    const run = async (what: string, fn: () => Promise<void>) => {
      try { await fn(); await refresh(); return true; } catch (e) { return fail(e, what); }
    };
    return {
      postEvent: (ref: string, kind: EventKind, text: string) => run("post the update", async () => {
        const id = uuidOf(ref); if (!id) throw new Error("Incident not found");
        const title = kind === "decision" ? "Decision recorded" : kind === "system" ? "System event" : "Update posted";
        await addEvent(id, kind, title, text);
      }),
      setStatus: (ref: string, status: Status) => run("change the status", async () => {
        const id = uuidOf(ref); if (!id) throw new Error("Incident not found");
        const { error } = await supabase.from("incidents").update({ status }).eq("id", id);
        if (error) throw error;
        await addEvent(id, "status", status === "resolved" ? "Incident resolved" : `Status changed to ${status.toUpperCase()}`);
      }),
      updateCurrent: (ref: string, text: string) => run("update the current status", async () => {
        const id = uuidOf(ref); if (!id) throw new Error("Incident not found");
        const { error } = await supabase.from("incidents").update({ current_text: text, current_by: userId, current_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        await addEvent(id, "update", "Current status updated", text);
      }),
      updateIncident: (ref: string, p: IncidentPatch) => run("save the incident", async () => {
        const id = uuidOf(ref); if (!id) throw new Error("Incident not found");
        const row: Record<string, unknown> = {};
        if (p.title !== undefined) row.title = p.title;
        if (p.sev !== undefined) row.sev = p.sev;
        if (p.impact !== undefined) row.impact = p.impact;
        if (p.rootCause !== undefined) row.root_cause = p.rootCause;
        if (p.resolution !== undefined) row.resolution = p.resolution;
        if (p.summary !== undefined) row.summary = p.summary;
        if (p.roles) {
          const map = { commander: "commander_id", tech: "tech_id", comms: "comms_id", observer: "observer_id" } as const;
          for (const [k, v] of Object.entries(p.roles)) row[map[k as RoleKey]] = v || null;
        }
        const { error } = await supabase.from("incidents").update(row).eq("id", id);
        if (error) throw error;
      }),
      deleteIncident: (ref: string) => run("delete the incident", async () => {
        const id = uuidOf(ref); if (!id) throw new Error("Incident not found");
        const { error, count } = await supabase.from("incidents").delete({ count: "exact" }).eq("id", id);
        if (error) throw error;
        if (!count) throw new Error("Only team owners can delete incidents.");
      }),
      addAction: (ref: string, a: { title: string; owner: string; priority: Priority; due?: string }) => run("assign the action", async () => {
        const id = uuidOf(ref); if (!id) throw new Error("Incident not found");
        const { error } = await supabase.from("incident_actions").insert({
          incident_id: id, team_id: teamId!, title: a.title, owner_id: a.owner, priority: a.priority, due_label: a.due ?? null,
        });
        if (error) throw error;
      }),
      completeAction: (actionId: string) => run("complete the action", async () => {
        const { error } = await supabase.from("incident_actions").update({ status: "done" }).eq("id", actionId);
        if (error) throw error;
      }),
      startAction: (actionId: string) => run("start the action", async () => {
        const { error } = await supabase.from("incident_actions").update({ status: "in_progress" }).eq("id", actionId);
        if (error) throw error;
      }),
      markAllRead: async () => {
        const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
        if (error) fail(error, "mark notifications read"); else await refresh();
      },
      loadSample: () => run("load sample incidents", async () => {
        const { error } = await supabase.rpc("load_sample_incidents", { _team: teamId! });
        if (error) throw error;
      }),
      clearSample: () => run("remove sample incidents", async () => {
        const { error } = await supabase.rpc("clear_sample_incidents", { _team: teamId! });
        if (error) throw error;
      }),
      addMember: (email: string, role: TeamRole) => run("add the member", async () => {
        const { error } = await supabase.rpc("add_team_member", { _team: teamId!, _email: email, _role: role });
        if (error) throw error;
      }),
      removeMember: (uid: string) => run("remove the member", async () => {
        const { error } = await supabase.rpc("remove_team_member", { _team: teamId!, _user: uid });
        if (error) throw error;
      }),
      renameTeam: (name: string) => run("rename the team", async () => {
        const { error } = await supabase.from("teams").update({ name }).eq("id", teamId!);
        if (error) throw error;
        setTeams((ts) => ts.map((t) => (t.id === teamId ? { ...t, name } : t)));
      }),
      updateProfile: (name: string, title: string) => run("save your profile", async () => {
        const { error } = await supabase.from("profiles").update({ display_name: name, title }).eq("id", userId);
        if (error) throw error;
      }),
    };
  }, [incidents, teamId, userId, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const createIncident = async (d: NewIncident): Promise<string | null> => {
    try {
      if (!teamId) throw new Error("No team selected");
      const { data, error } = await supabase.from("incidents").insert({
        team_id: teamId, title: d.title, sev: d.sev, systems: d.systems, commander_id: d.commander || null,
        current_text: "Incident declared. Responders are being notified.", current_by: userId, created_by: userId,
      }).select("id, ref").single();
      if (error) throw error;
      await addEvent(data.id, "system", "Incident declared", d.title);
      await addEvent(data.id, "people", "Incident Commander assigned", d.commander ? undefined : "No commander assigned yet.");
      await refresh();
      return data.ref;
    } catch (e) {
      fail(e, "create the incident");
      return null;
    }
  };

  const switchTeam = (id: string) => {
    localStorage.setItem(TEAM_KEY, id);
    setTeamId(id);
  };

  return (
    <Ctx.Provider value={{
      ready, loadError, userId, team, teams, now, people, incidents, timeline, actions, audit, notifications,
      canEdit: team?.role === "owner" || team?.role === "responder", isOwner: team?.role === "owner",
      refresh, switchTeam, createIncident, ...api,
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
