"use client";

import type { MessageResponse } from "@agentstate/shared";
import type { BadgeVariant } from "@cloudflare/kumo/components/badge";
import { Badge } from "@cloudflare/kumo/components/badge";
import { ROLE_BADGE_VARIANTS } from "@/lib/constants";
import { formatDateTime } from "./_utils";

type Message = MessageResponse;

/**
 * Maps shadcn Badge variant strings (from ROLE_BADGE_VARIANTS in lib/constants)
 * to the Kumo Badge variant equivalents. lib/constants.ts is shared and cannot
 * be edited here, so the shim translates at the call site.
 */
const SHADCN_TO_KUMO_BADGE: Record<string, BadgeVariant> = {
  default: "primary",
  secondary: "neutral",
  outline: "outline",
  destructive: "error",
};

interface ConversationMessageProps {
  message: Message;
}

export function ConversationMessage({ message }: ConversationMessageProps) {
  const shadcnVariant = ROLE_BADGE_VARIANTS[message.role] ?? ROLE_BADGE_VARIANTS.system;

  return (
    <div className="flex gap-3">
      <Badge
        variant={SHADCN_TO_KUMO_BADGE[shadcnVariant] ?? "neutral"}
        className="shrink-0 font-mono text-xs"
      >
        {message.role}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDateTime(message.created_at)}
          {message.token_count > 0 && ` · ${message.token_count} tokens`}
        </p>
      </div>
    </div>
  );
}
