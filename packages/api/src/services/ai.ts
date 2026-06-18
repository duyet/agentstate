// ---------------------------------------------------------------------------
// AI service — Workers AI helpers
//
// These exported functions delegate to WorkersAIProvider so call sites
// continue to pass `ai: Ai` directly. The seam lives in ai-provider.ts.
// ---------------------------------------------------------------------------

import type { TitleAndFollowUps } from "./ai-provider";
import { WorkersAIProvider } from "./ai-provider";

export type { TitleAndFollowUps } from "./ai-provider";

type Message = { role: string; content: string };

/**
 * Generate a short title (max 60 chars) summarising the conversation.
 */
export async function generateTitle(ai: Ai, messages: Message[]): Promise<string> {
  return new WorkersAIProvider(ai).generateTitle(messages);
}

/**
 * Suggest 3 follow-up questions the user might ask next.
 */
export async function generateFollowUps(ai: Ai, messages: Message[]): Promise<string[]> {
  return new WorkersAIProvider(ai).generateFollowUps(messages);
}

/**
 * Generate both title and follow-ups in a single AI call.
 * This reduces API calls by 50% and input tokens by ~30%.
 */
export async function generateTitleAndFollowUps(
  ai: Ai,
  messages: Message[],
): Promise<TitleAndFollowUps> {
  return new WorkersAIProvider(ai).generateTitleAndFollowUps(messages);
}
