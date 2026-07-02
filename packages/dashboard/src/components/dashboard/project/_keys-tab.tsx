"use client";

import type { ApiKeyResponse } from "@agentstate/shared";
import { Plus, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SCOPE_GROUPS } from "@/lib/scopes";
import { ApiKeysTable } from "./_api-keys-table";

interface KeysTabProps {
  showCreateKey: boolean;
  newKeyName: string;
  apiKeys: ApiKeyResponse[];
  onCreateKey: (scopes?: string[]) => void;
  onChangeKeyName: (value: string) => void;
  onShowCreateKey: () => void;
  onCancelCreateKey: () => void;
  onRevokeKey: (keyId: string) => void;
}

/**
 * Permission selector: "Full access" (default) or a custom subset of scopes.
 * Custom mode reveals a grouped checklist mirroring the API scope taxonomy.
 */
function ScopeSelector({
  mode,
  selected,
  onModeChange,
  onToggle,
}: {
  mode: "full" | "custom";
  selected: Set<string>;
  onModeChange: (m: "full" | "custom") => void;
  onToggle: (scope: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="as-label text-fg-3">Permissions</span>
        <div className="flex gap-2">
          {(["full", "custom"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`rounded-[var(--radius)] border px-3 py-1.5 text-[12.5px] font-medium transition-[background-color,color,border-color] ${
                mode === m
                  ? "border-accent/50 bg-accent/10 text-fg"
                  : "border-edge bg-panel2 text-fg-3 hover:text-fg"
              }`}
            >
              {m === "full" ? "Full access" : "Custom"}
            </button>
          ))}
        </div>
      </div>
      {mode === "custom" && (
        <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-edge-soft bg-panel2 p-3">
          {SCOPE_GROUPS.map((group) => (
            <div key={group.resource} className="flex flex-col gap-1.5">
              <span className="as-label-sm text-fg-4">{group.label}</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {group.scopes.map((s) => (
                  <label
                    key={s.value}
                    className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-fg-2"
                    title={s.description}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(s.value)}
                      onChange={() => onToggle(s.value)}
                      className="size-3.5 accent-[var(--color-accent)]"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Local inline key-name + permissions form — plain Tailwind on the design tokens.
 */
function KeyNameForm({
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (scopes?: string[]) => void;
  onCancel: () => void;
}) {
  const [local, setLocal] = useState(value);
  const [mode, setMode] = useState<"full" | "custom">("full");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sync = (v: string) => {
    setLocal(v);
    onChange(v);
  };
  const toggle = (scope: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  };
  const customEmpty = mode === "custom" && selected.size === 0;
  const submit = () => {
    if (!local.trim() || customEmpty) return;
    onSubmit(mode === "custom" ? Array.from(selected) : undefined);
  };

  return (
    <div className="flex flex-col gap-component rounded-[var(--radius-lg)] border border-edge bg-panel card-padding-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          id="key-name"
          value={local}
          onChange={(e) => sync(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && mode === "full") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="e.g. Production"
          autoFocus
          mono
          className="min-w-0 flex-1"
        />
        <div className="flex gap-2">
          <Button variant="primary" onClick={submit} disabled={!local.trim() || customEmpty}>
            Create
          </Button>
          <Button variant="ghost" onClick={onCancel} aria-label="Cancel" className="px-2.5">
            <X size={16} aria-hidden />
          </Button>
        </div>
      </div>
      <ScopeSelector mode={mode} selected={selected} onModeChange={setMode} onToggle={toggle} />
      {customEmpty && (
        <p className="text-[12px] text-warn">
          Select at least one permission, or choose Full access.
        </p>
      )}
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
    <div className="flex flex-col gap-component">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg-3">
          Manage API keys and their permissions for this project.
        </p>
        <Button variant="secondary" size="sm" onClick={onShowCreateKey}>
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
