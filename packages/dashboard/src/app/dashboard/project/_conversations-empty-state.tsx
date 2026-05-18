import { MessageSquareIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card } from "@/components/ui/card";

export function _ConversationsEmptyState() {
  return (
    <Card className="border-dashed bg-card/80">
      <div className="grid min-h-72 place-items-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <EmptyState
            icon={<MessageSquareIcon aria-hidden="true" />}
            title="No conversations yet"
            description="Use your API key to start storing conversations."
          />
          <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
            POST /api/v1/conversations
          </span>
        </div>
      </div>
    </Card>
  );
}
