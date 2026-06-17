"use client";

import type { ApiKeyResponse } from "@agentstate/shared";
import { Plus, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiKeysTable } from "./_api-keys-table";

interface KeysTabProps {
  showCreateKey: boolean;
  newKeyName: string;
  apiKeys: ApiKeyResponse[];
  onCreateKey: () => void;
  onChangeKeyName: (value: string) => void;
  onShowCreateKey: () => void;
  onCancelCreateKey: () => void;
  onRevokeKey: (keyId: string) => void;
}

/**
 * Local inline key-name form — plain Tailwind on the design-system tokens.
 * Self-contained so this tab has no shared-form dependency.
 */
function KeyNameForm({
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const [local, setLocal] = useState(value);
  const sync = (v: string) => {
    setLocal(v);
    onChange(v);
  };
  const submit = () => {
    if (local.trim()) onSubmit();
  };
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-edge bg-panel p-5 sm:flex-row sm:items-center">
      <Input
        id="key-name"
        value={local}
        onChange={(e) => sync(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="e.g. Production"
        // biome-ignore lint/a11y/noAutofocus: inline create form should focus on open
        autoFocus
        mono
        className="min-w-0 flex-1"
      />
      <div className="flex gap-2">
        <Button variant="primary" onClick={submit} disabled={!local.trim()}>
          Create
        </Button>
        <Button variant="ghost" onClick={onCancel} aria-label="Cancel" className="px-2.5">
          <X size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export function KeysTab({
  showCreateKey,
  newKeyName,
  apiKeys,
  onCreateKey,
  onChangeKeyName,
  onShowCreateKey,
  onCancelCreateKey,
  onRevokeKey,
}: KeysTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg-3">Manage API keys for this project.</p>
        <Button variant="secondary" onClick={onShowCreateKey}>
          <Plus size={16} aria-hidden />
          New Key
        </Button>
      </div>
      {showCreateKey && (
        <KeyNameForm
          value={newKeyName}
          onChange={onChangeKeyName}
          onSubmit={onCreateKey}
          onCancel={onCancelCreateKey}
        />
      )}
      <ApiKeysTable keys={apiKeys} onRevoke={onRevokeKey} />
    </div>
  );
}
