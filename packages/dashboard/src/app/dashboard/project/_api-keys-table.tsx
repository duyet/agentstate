import type { ApiKeyResponse } from "@agentstate/shared";
import { KeyIcon, TrashIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "./_utils";

interface ApiKeysTableProps {
  keys: ApiKeyResponse[];
  onRevoke: (keyId: string) => void;
}

export function ApiKeysTable({ keys, onRevoke }: ApiKeysTableProps) {
  const activeKeys = keys.filter((k) => !k.revoked_at);

  if (activeKeys.length === 0) {
    return (
      <Card className="border-dashed">
        <EmptyState
          icon={<KeyIcon aria-hidden="true" />}
          title="No active API keys"
          description="Create a key to start using the API."
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead>Name</TableHead>
            <TableHead>Key</TableHead>
            <TableHead className="hidden sm:table-cell">Last used</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeKeys.map((key) => (
            <TableRow key={key.id}>
              <TableCell className="py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                    <KeyIcon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">{key.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <code className="font-mono text-xs text-muted-foreground">{key.key_prefix}...</code>
              </TableCell>
              <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                {key.last_used_at ? formatDate(key.last_used_at) : "Never"}
              </TableCell>
              <TableCell>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Revoke key ${key.name}`}
                  onClick={() => onRevoke(key.id)}
                >
                  <TrashIcon aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
