import type { MessageResponse } from "@agentstate/shared";
import { Badge } from "@/components/ui/badge";
import { ROLE_BADGE_VARIANTS } from "@/lib/constants";

type Message = MessageResponse;

interface ConversationMessageProps {
  message: Message;
}

export function ConversationMessage({ message }: ConversationMessageProps) {
  return (
    <div className="flex gap-3">
      <Badge
        variant={ROLE_BADGE_VARIANTS[message.role] ?? ROLE_BADGE_VARIANTS.system}
        className="text-xs font-mono px-2 py-0.5 rounded shrink-0 mt-1"
      >
        {message.role}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(message.created_at).toLocaleString()}
          {message.token_count > 0 && ` · ${message.token_count} tokens`}
        </p>
      </div>
    </div>
  );
}
