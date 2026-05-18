import { MessageSquareIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card } from "@/components/ui/card";

export function _ConversationsEmptyState() {
  return (
    <Card className="border-dashed">
      <EmptyState
        icon={<MessageSquareIcon aria-hidden="true" />}
        title="No conversations yet"
        description="Use your API key to start storing conversations."
      />
      <div className="flex justify-center pb-8">
        <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
          POST /api/v1/conversations
        </span>
      </div>
    </Card>
  );
}
