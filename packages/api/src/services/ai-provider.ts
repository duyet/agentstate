// ---------------------------------------------------------------------------
// AIProvider — minimal interface for AI operations used across this API
//
// The default implementation delegates to Workers AI. Swap by constructing a
// different AIProvider where callers currently pass `c.env.AI`.
// ---------------------------------------------------------------------------

type Message = { role: string; content: string };

/** Result of batch AI generation */
export interface TitleAndFollowUps {
  /** Generated title (max 60 chars) */
  title: string;
  /** Up to 3 follow-up questions */
  followUps: string[];
}

/** Minimal interface covering all AI operations used in this API */
export interface AIProvider {
  /** Generate a short title (max 60 chars) summarising the conversation */
  generateTitle(messages: Message[]): Promise<string>;

  /** Suggest up to 3 follow-up questions */
  generateFollowUps(messages: Message[]): Promise<string[]>;

  /** Generate both title and follow-ups in a single model call */
  generateTitleAndFollowUps(messages: Message[]): Promise<TitleAndFollowUps>;
}

// The Workers AI type system restricts `ai.run()` to a strict union of known
// model keys at compile time, but the runtime supports any valid model string.
// We cast through `unknown` to avoid the constraint while keeping the rest of
// the signature typed.
const LLM_MODEL = "@cf/meta/llama-3.1-8b-instruct" as unknown as keyof AiModels;

/** Default implementation backed by Cloudflare Workers AI */
export class WorkersAIProvider implements AIProvider {
  constructor(private readonly ai: Ai) {}

  async generateTitle(messages: Message[]): Promise<string> {
    const systemPrompt =
      "Generate a brief title (max 6 words) for this conversation. Reply with ONLY the title, no quotes or punctuation.";

    // Feed up to the first 10 messages to keep the prompt focused.
    const contextMessages = messages.slice(0, 10);

    let result: unknown;
    try {
      result = await this.ai.run(LLM_MODEL, {
        messages: [
          { role: "system", content: systemPrompt },
          ...contextMessages,
          { role: "user", content: "Generate the title now." },
        ],
      });
    } catch (err) {
      console.error("[ai] generateTitle failed:", err);
      return "Untitled conversation";
    }

    const raw =
      typeof result === "object" && result !== null && "response" in result
        ? String((result as { response: unknown }).response ?? "")
        : String(result ?? "");

    // Trim whitespace, strip surrounding quotes, enforce 60-char limit.
    const title = raw
      .trim()
      .replace(/^["']|["']$/g, "")
      .slice(0, 60);

    return title || "Untitled conversation";
  }

  async generateFollowUps(messages: Message[]): Promise<string[]> {
    const systemPrompt =
      "Based on this conversation, suggest exactly 3 follow-up questions the user might ask. Reply with ONLY the questions, one per line, no numbering.";

    // Use the most recent 20 messages for context.
    const contextMessages = messages.slice(-20);

    let result: unknown;
    try {
      result = await this.ai.run(LLM_MODEL, {
        messages: [
          { role: "system", content: systemPrompt },
          ...contextMessages,
          { role: "user", content: "Suggest 3 follow-up questions now." },
        ],
      });
    } catch (err) {
      console.error("[ai] generateFollowUps failed:", err);
      return [];
    }

    const raw =
      typeof result === "object" && result !== null && "response" in result
        ? String((result as { response: unknown }).response ?? "")
        : String(result ?? "");

    // Split on newlines, filter empty lines, keep at most 3 items.
    const questions = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 3);

    return questions;
  }

  async generateTitleAndFollowUps(messages: Message[]): Promise<TitleAndFollowUps> {
    const BATCH_SYSTEM_PROMPT = `You are a helpful assistant that analyzes conversations.

Analyze the conversation and provide:
1. A brief title (max 6 words) summarizing the conversation
2. Exactly 3 follow-up questions the user might ask next

Respond ONLY with valid JSON in this exact format:
{
  "title": "Your brief title here",
  "followUps": [
    "First follow-up question?",
    "Second follow-up question?",
    "Third follow-up question?"
  ]
}

Do not include any text before or after the JSON.`;

    // Use up to 20 messages (balance between title context and follow-up relevance)
    const contextMessages = messages.slice(-20);

    let result: unknown;
    try {
      result = await this.ai.run(LLM_MODEL, {
        messages: [
          { role: "system", content: BATCH_SYSTEM_PROMPT },
          ...contextMessages,
          {
            role: "user",
            content: "Analyze this conversation and provide the title and follow-ups.",
          },
        ],
      });
    } catch (err) {
      console.error("[ai] generateTitleAndFollowUps failed:", err);
      return { title: "Untitled conversation", followUps: [] };
    }

    const raw =
      typeof result === "object" && result !== null && "response" in result
        ? String((result as { response: unknown }).response ?? "")
        : String(result ?? "");

    // Try JSON parsing first
    try {
      const parsed = JSON.parse(raw.trim());

      // Validate structure
      const title =
        typeof parsed.title === "string"
          ? parsed.title.trim().slice(0, 60) || "Untitled conversation"
          : "Untitled conversation";

      const followUps = Array.isArray(parsed.followUps)
        ? (parsed.followUps as unknown[])
            .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
            .map((q) => q.trim())
            .slice(0, 3)
        : [];

      return { title, followUps };
    } catch (_parseErr) {
      // Fallback: try delimiter-based parsing
      console.warn("[ai] JSON parse failed, using delimiter fallback");
      return parseWithDelimiters(raw);
    }
  }
}

/** Factory: construct the default Workers AI provider from the env binding */
export function createAIProvider(ai: Ai): AIProvider {
  return new WorkersAIProvider(ai);
}

// ---------------------------------------------------------------------------
// Internal helpers (shared with ai.ts thin wrappers via same logic)
// ---------------------------------------------------------------------------

/**
 * Fallback parser for non-JSON responses.
 * Attempts to extract title and follow-ups from plain text.
 */
function parseWithDelimiters(raw: string): TitleAndFollowUps {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let title = "Untitled conversation";
  const followUps: string[] = [];

  for (const line of lines) {
    // Look for title pattern
    if (line.toLowerCase().startsWith("title:") || line.startsWith('"title"')) {
      title = line
        .replace(/^(title:|"title":\s*")/i, "")
        .replace(/["\]]/g, "")
        .trim()
        .slice(0, 60);
      continue;
    }

    // Look for question patterns
    if (line.includes("?") && followUps.length < 3) {
      followUps.push(line.replace(/^[\d\-*.]+\s*/, "").trim()); // Strip leading numbers/bullets
    }
  }

  return { title: title || "Untitled conversation", followUps };
}
