"use client";

import type { ApiKeyResponse } from "@agentstate/shared";
import { Key, Trash } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { scopeLabel } from "@/lib/scopes";
import { formatDate } from "./_utils";

/** Render a key's scopes as compact badges, or a "Full access" pill when unscoped. */
function ScopeBadges({ scopes }: { scopes: string[] | null }) {
  if (!scopes || scopes.length === 0 || scopes.includes("*")) {
    return (
      <span className="inline-flex items-center rounded-full border border-edge bg-panel2 px-2 py-0.5 text-[11px] text-fg-3">
        Full access
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {scopes.map((s) => (
        <span
          key={s}
          className="inline-flex items-center rounded-full border border-edge bg-panel2 px-2 py-0.5 font-mono text-[10.5px] text-fg-3"
        >
          {scopeLabel(s)}
        </span>
      ))}
    </div>
  );
}

interface ApiKeysTableProps {
  keys: ApiKeyResponse[];
  onRevoke: (keyId: string) => void;
}

export function ApiKeysTable({ keys, onRevoke }: ApiKeysTableProps) {
  const activeKeys = keys.filter((k) => !k.revoked_at);

  if (activeKeys.length === 0) {
    return (
      <Card className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-4">
            <Key className="size-6" aria-hidden />
          </div>
          <div className="flex max-w-xs flex-col gap-1">
            <p className="text-[14px] font-medium text-fg">No active API keys</p>
            <p className="text-[12.5px] leading-5 text-fg-4">
              Create a key to start using the API.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <Table responsive>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key</TableHead>
            <TableHead className="hidden md:table-cell">Permissions</TableHead>
            <TableHead className="hidden sm:table-cell">Last used</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeKeys.map((key) => (
            <TableRow key={key.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-3">
                    <Key className="size-4" aria-hidden />
                  </span>
                  <span className="text-[13px] font-medium text-fg">{key.name}</span>
                </div>
              </TableCell>
              <TableCell mono>{key.key_prefix}...</TableCell>
              <TableCell className="hidden md:table-cell">
                <ScopeBadges scopes={key.scopes} />
              </TableCell>
              <TableCell className="hidden text-fg-3 sm:table-cell">
                {key.last_used_at ? formatDate(key.last_used_at) : "Never"}
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => onRevoke(key.id)}
                  aria-label={`Revoke key ${key.name}`}
                  className="inline-flex size-9 items-center justify-center rounded-[var(--radius)] text-fg-4 transition-[background-color,color,transform] duration-150 hover:bg-neg/10 hover:text-neg active:scale-[0.96]"
                >
                  <Trash className="size-4" aria-hidden />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
