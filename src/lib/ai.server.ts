import { describeProviderError } from "./ai-shared";

export type ProviderName = "gemini" | "groq";
export interface ChatMsg { role: "system" | "user" | "assistant"; content: string }

interface ProviderConfig {
  name: ProviderName;
  label: string;
  url: string;
  model: string;
  headers: Record<string, string>;
}

/** Provider + model are configured with environment variables; no code changes needed to switch. */
export function getProviders(): ProviderConfig[] {
  const env = process.env;
  const all: ProviderConfig[] = [];
  if (env["LOVABLE_API_KEY"]) {
    all.push({
      name: "gemini", label: "Gemini",
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: env["AI_GEMINI_MODEL"] || "google/gemini-3-flash-preview",
      headers: { Authorization: `Bearer ${env["LOVABLE_API_KEY"]}`, "X-Lovable-AIG-SDK": "fetch" },
    });
  }
  if (env["GROQ_API_KEY"]) {
    all.push({
      name: "groq", label: "Groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: env["AI_GROQ_MODEL"] || "llama-3.3-70b-versatile",
      headers: { Authorization: `Bearer ${env["GROQ_API_KEY"]}` },
    });
  }
  const primary = (env["AI_PROVIDER"] || "gemini").toLowerCase();
  return all.sort((a, b) => (a.name === primary ? -1 : b.name === primary ? 1 : 0));
}

export class AiError extends Error {
  constructor(message: string, public retryable: boolean) { super(message); }
}

/** Streams an OpenAI-compatible chat completion and returns the accumulated text. */
async function callProvider(p: ProviderConfig, messages: ChatMsg[]): Promise<string> {
  let res: Response;
  try {
    res = await fetch(p.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...p.headers },
      body: JSON.stringify({ model: p.model, messages, stream: true, max_tokens: 1500 }),
    });
  } catch {
    throw new AiError(`Couldn't reach ${p.label}. Check the network and try again.`, true);
  }
  if (!res.ok || !res.body) {
    const { message, retryable } = describeProviderError(res.status, p.label);
    throw new AiError(message, retryable);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const j = JSON.parse(data) as { choices?: { delta?: { content?: string } }[]; error?: { message?: string } };
        if (j.error) throw new AiError(`${p.label} error: ${j.error.message ?? "unknown"}`, true);
        text += j.choices?.[0]?.delta?.content ?? "";
      } catch (e) {
        if (e instanceof AiError) throw e;
        // ignore malformed keep-alive fragments
      }
    }
  }
  if (!text.trim()) throw new AiError(`${p.label} returned an empty response.`, true);
  return text.trim();
}

/** Tries the primary provider, then falls back to the other one on retryable failures. */
export async function completeWithFallback(messages: ChatMsg[]): Promise<{ text: string; provider: string; model: string }> {
  const providers = getProviders();
  if (!providers.length) throw new AiError("No AI provider is configured.", false);
  const errors: string[] = [];
  for (const p of providers) {
    try {
      return { text: await callProvider(p, messages), provider: p.label, model: p.model };
    } catch (e) {
      const err = e instanceof AiError ? e : new AiError(`${p.label} failed unexpectedly.`, true);
      errors.push(err.message);
      if (!err.retryable) break;
    }
  }
  throw new AiError(errors.join(" "), false);
}
