"use client";

import { ChatCentered } from "@phosphor-icons/react";
import { MethodTag } from "@/components/brand/bits";
import { Card } from "@/components/ui/card";

export function _ConversationsEmptyState() {
  return (
    <Card>
      <div className="grid min-h-72 place-items-center px-4">
        <div className="flex flex-col items-center gap-component text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-4">
              <ChatCentered className="size-6" aria-hidden />
            </div>
            <div className="flex max-w-xs flex-col gap-1">
              <p className="text-[14px] font-medium text-fg">No conversations yet</p>
              <p className="text-[12.5px] leading-5 text-fg-4">
                Use your API key to start storing conversations.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2">
            <MethodTag>POST</MethodTag>
            <code className="num font-mono text-xs text-fg-3">/api/v1/conversations</code>
          </span>
        </div>
      </div>
    </Card>
  );
}
