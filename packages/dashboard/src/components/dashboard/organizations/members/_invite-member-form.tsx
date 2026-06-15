import { PlusIcon } from "@phosphor-icons/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type Role = "org:member" | "org:admin";

export interface InviteMemberFormProps {
  readonly isInviting: boolean;
  readonly onInvite: (email: string, role: Role) => Promise<void>;
}

const inputClass =
  "h-9 w-full rounded-[var(--radius)] border border-edge bg-panel px-3 text-[13.5px] text-fg placeholder:text-fg-4 outline-none transition-colors focus:border-accent/60 disabled:opacity-50";

const labelClass = "font-mono text-[11px] uppercase tracking-[0.1em] text-fg-4";

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
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-[16px] font-semibold text-fg">Invite Member</h2>
        <p className="text-[13.5px] leading-6 text-fg-3">
          Send an invitation to join this organization
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className={labelClass}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            className={inputClass}
            placeholder="colleague@example.com"
            value={emailAddress}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmailAddress(e.currentTarget.value)
            }
            disabled={isInviting}
            required
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex w-full flex-col gap-2 sm:w-[180px]">
            <label htmlFor="role" className={labelClass}>
              Role
            </label>
            <select
              id="role"
              className={inputClass}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.currentTarget.value as Role)}
              disabled={isInviting}
            >
              <option value="org:member">Member</option>
              <option value="org:admin">Admin</option>
            </select>
          </div>
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
