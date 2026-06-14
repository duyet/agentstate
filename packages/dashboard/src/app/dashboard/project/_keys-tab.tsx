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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Manage API keys for this project.</p>
        <Button size="sm" variant="outline" onClick={onShowCreateKey}>
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
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
      <ApiKeysTable keys={apiKeys} onRevoke={onRevokeKey} />
    </div>
  );
}
