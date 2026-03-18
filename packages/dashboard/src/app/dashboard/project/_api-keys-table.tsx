import type { ApiKeyResponse } from "@agentstate/shared";
import { KeyIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiKeysTableProps {
  keys: ApiKeyResponse[];
  onRevoke: (keyId: string) => void;
}

export function ApiKeysTable({ keys, onRevoke }: ApiKeysTableProps) {
  const activeKeys = keys.filter((k) => !k.revoked_at);

  if (activeKeys.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/60 mx-auto mb-3">
          <KeyIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No active API keys</p>
        <p className="text-xs text-muted-foreground">Create a key to start using the API.</p>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-card">
          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Name</th>
          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Key</th>
          <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">
            Last used
          </th>
          <th className="px-4 py-3 w-10" />
        </tr>
      </thead>
      <tbody>
        {activeKeys.map((key) => (
          <tr
            key={key.id}
            className="border-b last:border-b-0 border-border hover:bg-muted/20 transition-colors"
          >
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <KeyIcon className="h-4 w-4 text-muted-foreground" />
                {key.name}
              </div>
            </td>
            <td className="px-4 py-3">
              <code className="font-mono text-muted-foreground">{key.key_prefix}...</code>
            </td>
            <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
              {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}
            </td>
            <td className="px-4 py-3">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                aria-label={`Revoke key ${key.name}`}
                onClick={() => onRevoke(key.id)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
