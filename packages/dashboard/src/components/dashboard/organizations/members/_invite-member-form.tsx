import { PlusIcon } from "@phosphor-icons/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";

export type Role = "org:member" | "org:admin";

export interface InviteMemberFormProps {
  readonly isInviting: boolean;
  readonly onInvite: (email: string, role: Role) => Promise<void>;
}

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
    <Card className="card-padding flex flex-col gap-component">
      <div className="flex flex-col gap-tight">
        <h2 className="text-[16px] font-semibold text-fg">Invite Member</h2>
        <p className="text-[13.5px] leading-6 text-fg-3">
          Send an invitation to join this organization
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-element">
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
        <div className="flex flex-col gap-element sm:flex-row sm:items-end">
          <Select
            id="role"
            label="Role"
            className="sm:w-[180px]"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.currentTarget.value as Role)}
            disabled={isInviting}
            options={[
              { value: "org:member", label: "Member" },
              { value: "org:admin", label: "Admin" },
            ]}
          />
          <Button type="submit" variant="primary" disabled={isInviting} className="sm:mb-px">
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
    </Card>
  );
}
