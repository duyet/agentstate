import type { ApiKeyResponse } from "@agentstate/shared";
import { PlusIcon } from "lucide-react";
import { InlineForm } from "@/components/dashboard/inline-form";
import { Button } from "@/components/ui/button";
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
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Manage API keys for this project.</p>
        <Button size="sm" variant="outline" onClick={onShowCreateKey}>
          <PlusIcon className="h-4 w-4 mr-1.5" />
          New Key
        </Button>
      </div>
      {showCreateKey && (
        <InlineForm
          value={newKeyName}
          onChange={onChangeKeyName}
          onSubmit={onCreateKey}
          onCancel={onCancelCreateKey}
          placeholder="e.g. Production"
          label="Key name"
          submitLabel="Create"
          inputId="key-name"
        />
      )}
      <div className="border border-border rounded-lg overflow-hidden">
        <ApiKeysTable keys={apiKeys} onRevoke={onRevokeKey} />
      </div>
    </>
  );
}
