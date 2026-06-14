"use client";

import { Button } from "@cloudflare/kumo/components/button";
import { Input } from "@cloudflare/kumo/components/input";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Select } from "@cloudflare/kumo/components/select";
import { Text } from "@cloudflare/kumo/components/text";
import { PlusIcon } from "@phosphor-icons/react";
import * as React from "react";

export type Role = "org:member" | "org:admin";

export interface InviteMemberFormProps {
  readonly isInviting: boolean;
  readonly onInvite: (email: string, role: Role) => Promise<void>;
}

const ROLE_ITEMS: Array<{ label: string; value: Role }> = [
  { label: "Member", value: "org:member" },
  { label: "Admin", value: "org:admin" },
];

export function InviteMemberForm({ isInviting, onInvite }: InviteMemberFormProps) {
  const [emailAddress, setEmailAddress] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<Role>("org:member");

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!emailAddress.trim() || isInviting) return;

      await onInvite(emailAddress.trim(), selectedRole);
      setEmailAddress("");
      setSelectedRole("org:member");
    },
    [emailAddress, isInviting, selectedRole, onInvite],
  );

  return (
    <LayerCard className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <Text variant="heading3" as="h2">
          Invite Member
        </Text>
        <Text variant="secondary" as="p">
          Send an invitation to join this organization
        </Text>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Input
          id="email"
          type="email"
          label="Email address"
          placeholder="colleague@example.com"
          value={emailAddress}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEmailAddress(e.currentTarget.value)
          }
          disabled={isInviting}
          required
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Select<Role>
            className="w-full sm:w-[180px]"
            aria-label="Role"
            label="Role"
            value={selectedRole}
            onValueChange={(v) => setSelectedRole((v ?? "org:member") as Role)}
            items={ROLE_ITEMS}
            disabled={isInviting}
          />
          <Button type="submit" variant="primary" disabled={isInviting} loading={isInviting}>
            {isInviting ? (
              "Sending..."
            ) : (
              <>
                <PlusIcon aria-hidden="true" />
                Invite
              </>
            )}
          </Button>
        </div>
      </form>
    </LayerCard>
  );
}
