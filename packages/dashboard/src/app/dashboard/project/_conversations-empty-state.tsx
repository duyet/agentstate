"use client";

import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { ChatCentered } from "@phosphor-icons/react";
import { MethodTag } from "@/components/brand/bits";
import { EmptyState } from "@/components/dashboard/empty-state";

export function _ConversationsEmptyState() {
  return (
    <LayerCard className="border-dashed">
      <div className="grid min-h-72 place-items-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <EmptyState
            icon={<ChatCentered aria-hidden />}
            title="No conversations yet"
            description="Use your API key to start storing conversations."
          />
          <span className="inline-flex items-center gap-2">
            <MethodTag>POST</MethodTag>
            <code className="font-mono text-xs text-muted-foreground">/api/v1/conversations</code>
          </span>
        </div>
      </div>
    </LayerCard>
  );
}
