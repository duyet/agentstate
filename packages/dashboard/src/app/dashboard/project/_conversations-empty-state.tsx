import { MessageSquareIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function _ConversationsEmptyState() {
  return (
    <Card className="border-dashed">
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/60 mb-3">
          <MessageSquareIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No conversations yet</p>
        <p className="text-xs text-muted-foreground max-w-xs mb-3">
          Use your API key to start storing conversations.
        </p>
        <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
          POST /api/v1/conversations
        </span>
      </div>
    </Card>
  );
}
