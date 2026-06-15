"use client";

import type { ApiKeyResponse } from "@agentstate/shared";
import { Button } from "@cloudflare/kumo/components/button";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Table } from "@cloudflare/kumo/components/table";
import { Key, Trash } from "@phosphor-icons/react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDate } from "./_utils";

interface ApiKeysTableProps {
  keys: ApiKeyResponse[];
  onRevoke: (keyId: string) => void;
}

export function ApiKeysTable({ keys, onRevoke }: ApiKeysTableProps) {
  const activeKeys = keys.filter((k) => !k.revoked_at);

  if (activeKeys.length === 0) {
    return (
      <LayerCard>
        <EmptyState
          icon={<Key aria-hidden />}
          title="No active API keys"
          description="Create a key to start using the API."
        />
      </LayerCard>
    );
  }

  return (
    <LayerCard className="overflow-hidden p-0">
      <Table>
        <Table.Header>
          <Table.Row className="bg-muted hover:bg-muted">
            <Table.Head>Name</Table.Head>
            <Table.Head>Key</Table.Head>
            <Table.Head className="hidden sm:table-cell">Last used</Table.Head>
            <Table.Head className="w-10" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {activeKeys.map((key) => (
            <Table.Row key={key.id}>
              <Table.Cell className="py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                    <Key className="size-4" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-foreground">{key.name}</span>
                </div>
              </Table.Cell>
              <Table.Cell>
                <code className="font-mono text-xs text-muted-foreground">{key.key_prefix}...</code>
              </Table.Cell>
              <Table.Cell className="hidden text-xs text-muted-foreground sm:table-cell">
                {key.last_used_at ? formatDate(key.last_used_at) : "Never"}
              </Table.Cell>
              <Table.Cell>
                <Button
                  shape="square"
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-kumo-danger"
                  aria-label={`Revoke key ${key.name}`}
                  onClick={() => onRevoke(key.id)}
                >
                  <Trash aria-hidden />
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </LayerCard>
  );
}
