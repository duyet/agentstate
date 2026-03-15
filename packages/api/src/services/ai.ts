// ---------------------------------------------------------------------------
// AI service — Workers AI helpers
// ---------------------------------------------------------------------------

type Message = { role: string; content: string };

// The Workers AI type system restricts `ai.run()` to a strict union of known
// model keys at compile time, but the runtime supports any valid model string.
// We cast through `unknown` to avoid the constraint while keeping the rest of
// the signature typed.
const MODEL = "@cf/meta/llama-3.1-8b-instruct" as unknown as keyof AiModels;

/**
 * Generate a short title (max 60 chars) summarising the conversation.
 */
export async function generateTitle(ai: Ai, messages: Message[]): Promise<string> {
  const systemPrompt =
    "Generate a brief title (max 6 words) for this conversation. Reply with ONLY the title, no quotes or punctuation.";

  // Feed up to the first 10 messages to keep the prompt focused.
  const contextMessages = messages.slice(0, 10);

  const result = await ai.run(MODEL, {
    messages: [
      { role: "system", content: systemPrompt },
      ...contextMessages,
      { role: "user", content: "Generate the title now." },
    ],
  });

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

/**
 * Suggest 3 follow-up questions the user might ask next.
 */
export async function generateFollowUps(ai: Ai, messages: Message[]): Promise<string[]> {
  const systemPrompt =
    "Based on this conversation, suggest exactly 3 follow-up questions the user might ask. Reply with ONLY the questions, one per line, no numbering.";

  // Use the most recent 20 messages for context.
  const contextMessages = messages.slice(-20);

  const result = await ai.run(MODEL, {
    messages: [
      { role: "system", content: systemPrompt },
      ...contextMessages,
      { role: "user", content: "Suggest 3 follow-up questions now." },
    ],
  });

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
