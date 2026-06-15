"use client";

import type { MessageResponse } from "@agentstate/shared";
import type { Tone } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { ROLE_BADGE_VARIANTS } from "@/lib/constants";
import { formatDateTime } from "./_utils";

type Message = MessageResponse;

/**
 * Maps the shared shadcn Badge variant strings (ROLE_BADGE_VARIANTS in
 * lib/constants) to the local Badge tone equivalents. lib/constants.ts is
 * shared and cannot be edited here, so the shim translates at the call site.
 */
const SHADCN_TO_TONE: Record<string, Tone> = {
  default: "live",
  secondary: "default",
  outline: "idle",
  destructive: "warn",
};

interface ConversationMessageProps {
  message: Message;
}

export function ConversationMessage({ message }: ConversationMessageProps) {
  const shadcnVariant = ROLE_BADGE_VARIANTS[message.role] ?? ROLE_BADGE_VARIANTS.system;

  return (
    <div className="flex gap-3">
      <Badge tone={SHADCN_TO_TONE[shadcnVariant] ?? "default"} className="shrink-0">
        {message.role}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-fg-2">
          {message.content}
        </p>
        <p className="num mt-1 font-mono text-[11px] text-fg-4">
          {formatDateTime(message.created_at)}
          {message.token_count > 0 && ` · ${message.token_count} tokens`}
        </p>
      </div>
    </div>
  );
}
