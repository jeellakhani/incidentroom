/** Pure helpers shared by the AI server function and the UI (no secrets here). */

export const AI_TASKS = ["summary", "root_cause", "mitigation", "report", "chat"] as const;
export type AiTask = (typeof AI_TASKS)[number];

export const AI_LIMITS = { perHour: 30, perDay: 150, maxChatTurns: 12, maxMessageChars: 2000 } as const;

export interface SuggestedAction {
  title: string;
  priority: "critical" | "high" | "medium" | "low";
}

/** Extracts `ACTION: title | priority` lines that the model proposes. Nothing is executed automatically. */
export function parseSuggestedActions(text: string): SuggestedAction[] {
  const out: SuggestedAction[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*[-*]?\s*ACTION:\s*(.+?)\s*(?:\|\s*(critical|high|medium|low))?\s*$/i);
    if (!m) continue;
    const title = m[1]!.replace(/\*\*/g, "").trim().slice(0, 200);
    if (title.length < 2) continue;
    out.push({ title, priority: (m[2]?.toLowerCase() as SuggestedAction["priority"]) ?? "medium" });
  }
  return out.slice(0, 8);
}

/** Removes ACTION lines from text shown to the user (they render as buttons instead). */
export function stripActionLines(text: string): string {
  return text.split("\n").filter((l) => !/^\s*[-*]?\s*ACTION:/i.test(l)).join("\n").trim();
}

/** Maps a provider HTTP status to a user-facing message and whether another provider may be tried. */
export function describeProviderError(status: number, provider: string): { message: string; retryable: boolean } {
  if (status === 429) return { message: `${provider} is rate-limited or its free quota is used up. Try again shortly.`, retryable: true };
  if (status === 402) return { message: `${provider} has run out of AI credits.`, retryable: true };
  if (status === 401) return { message: `${provider} rejected the API key. Check the key in your secrets.`, retryable: true };
  if (status === 403) return { message: `${provider} denied access to this model.`, retryable: true };
  if (status === 404) return { message: `${provider} does not offer the configured model.`, retryable: true };
  if (status >= 500) return { message: `${provider} is temporarily unavailable.`, retryable: true };
  return { message: `${provider} rejected the request (HTTP ${status}).`, retryable: false };
}
