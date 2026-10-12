import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AI_LIMITS, AI_TASKS, type AiTask } from "./ai-shared";

const Input = z.object({
  incidentId: z.string().uuid(),
  task: z.enum(AI_TASKS),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(AI_LIMITS.maxMessageChars) }))
    .max(AI_LIMITS.maxChatTurns)
    .optional(),
});

const TASK_PROMPTS: Record<AiTask, string> = {
  summary: "Write a concise incident summary (5-8 sentences): what is happening, impact, current status, and what is being done.",
  root_cause: "Analyse likely root causes. Rank hypotheses by how well the evidence supports them and say what evidence would confirm or rule out each.",
  mitigation: "Recommend mitigation steps in priority order. Then list each concrete proposed action on its own line exactly as `ACTION: <short imperative title> | <critical|high|medium|low>`.",
  report: "Draft a post-incident report with sections: Summary, Impact, Timeline highlights, Root cause, Resolution, Follow-up actions. Then list follow-ups as `ACTION: <title> | <priority>` lines.",
  chat: "Answer the responder's question about this incident.",
};

const SYSTEM = `You are IncidentRoom's incident assistant for on-call engineers.
Rules:
- Use ONLY the incident data provided. Never invent metrics, timestamps, people, or events.
- Structure answers with two clearly labelled parts when relevant: "**Confirmed facts**" (directly stated in the data) and "**Possible explanations (unverified)**".
- If the data is insufficient, say so plainly and say what information is missing.
- You cannot execute anything. Phrase operational or destructive steps as proposals that a human must approve.
- Be concise and use short markdown bullet lists.`;

export const runIncidentAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { completeWithFallback, AiError } = await import("./ai.server");

    // Rate limits (per user)
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
    const [h, d] = await Promise.all([
      supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", hourAgo),
      supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", dayAgo),
    ]);
    if ((h.count ?? 0) >= AI_LIMITS.perHour) return { ok: false as const, error: `AI limit reached (${AI_LIMITS.perHour} requests per hour). Try again later.` };
    if ((d.count ?? 0) >= AI_LIMITS.perDay) return { ok: false as const, error: `Daily AI limit reached (${AI_LIMITS.perDay} requests). Try again tomorrow.` };

    // Load incident data under the caller's permissions (RLS)
    const { data: inc, error: incErr } = await supabase.from("incidents").select("*").eq("id", data.incidentId).maybeSingle();
    if (incErr || !inc) return { ok: false as const, error: "Incident not found or you don't have access to it." };
    const [ev, act, mem] = await Promise.all([
      supabase.from("incident_events").select("kind, title, note, actor_id, created_at").eq("incident_id", inc.id).order("created_at").limit(80),
      supabase.from("incident_actions").select("title, owner_id, priority, status").eq("incident_id", inc.id),
      supabase.from("team_members").select("user_id").eq("team_id", inc.team_id),
    ]);
    const ids = (mem.data ?? []).map((m) => m.user_id);
    const prof = ids.length ? await supabase.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
    // Only first names are sent to the AI provider — no emails or account identifiers.
    const name = (id: string | null) => {
      const n = prof.data?.find((p) => p.id === id)?.display_name?.trim();
      return n ? n.split(/\s+/)[0] : "a responder";
    };

    const context_ = [
      `Incident ${inc.ref}: ${inc.title}`,
      `Severity: SEV-${inc.sev}. Status: ${inc.status.toUpperCase()}. Started: ${inc.started_at}${inc.resolved_at ? `. Resolved: ${inc.resolved_at}` : ""}.`,
      `Impact: ${inc.impact}. Systems: ${(inc.systems ?? []).join(", ") || "not specified"}.`,
      `Incident commander: ${inc.commander_id ? name(inc.commander_id) : "unassigned"}.`,
      `Current situation (by ${name(inc.current_by)}): ${inc.current_text}`,
      inc.root_cause ? `Recorded root cause: ${inc.root_cause}` : "Recorded root cause: none yet.",
      inc.resolution ? `Recorded resolution: ${inc.resolution}` : "",
      "",
      "Timeline (oldest first):",
      ...(ev.data ?? []).map((e) => `- ${e.created_at} [${e.kind}] ${e.title}${e.note ? `: ${e.note}` : ""} (${name(e.actor_id)})`),
      "",
      "Action items:",
      ...((act.data ?? []).length ? (act.data ?? []).map((a) => `- [${a.status}] ${a.title} (owner ${name(a.owner_id)}, ${a.priority})`) : ["- none"]),
    ].filter(Boolean).join("\n").slice(0, 14000);

    const messages = [
      { role: "system" as const, content: SYSTEM },
      { role: "user" as const, content: `INCIDENT DATA\n${context_}\n\nTASK: ${TASK_PROMPTS[data.task]}` },
      ...(data.task === "chat" ? data.messages ?? [] : []),
    ];
    if (data.task === "chat" && !(data.messages ?? []).some((m) => m.role === "user")) {
      return { ok: false as const, error: "Ask a question first." };
    }

    try {
      const out = await completeWithFallback(messages);
      await supabase.from("ai_usage").insert({ user_id: userId, task: data.task, provider: out.provider, ok: true });
      return { ok: true as const, text: out.text, provider: out.provider, model: out.model };
    } catch (e) {
      await supabase.from("ai_usage").insert({ user_id: userId, task: data.task, provider: "none", ok: false });
      const msg = e instanceof AiError ? e.message : "The AI request failed unexpectedly.";
      console.error("AI request failed:", data.task, msg);
      return { ok: false as const, error: msg };
    }
  });
