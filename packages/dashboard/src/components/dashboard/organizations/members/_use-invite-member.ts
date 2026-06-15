import * as React from "react";
import { toast } from "sonner";
import type { Role } from "./_components";

interface ClerkError {
  errors?: Array<{ message?: string }>;
}

export function useInviteMember(
  organization:
    | {
        inviteMember: (params: { emailAddress: string; role: Role }) => Promise<unknown>;
      }
    | null
    | undefined,
  invitations:
    | {
        revalidate?: () => Promise<void>;
      }
    | null
    | undefined,
) {
  const [isInviting, setIsInviting] = React.useState(false);

  const inviteMember = React.useCallback(
    async (emailAddress: string, role: Role) => {
      if (!organization) return;

      setIsInviting(true);
      try {
        await organization.inviteMember({ emailAddress, role });
        await invitations?.revalidate?.();
        toast.success("Invitation sent successfully");
      } catch (err: unknown) {
        const error = err as ClerkError;
        const message = error?.errors?.[0]?.message ?? "Failed to send invitation";
        toast.error(message);
      } finally {
        setIsInviting(false);
      }
    },
    [organization, invitations],
  );

  return { inviteMember, isInviting };
}
