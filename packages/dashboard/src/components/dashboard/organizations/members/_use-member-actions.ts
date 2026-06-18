import * as React from "react";
import { toast } from "sonner";
import type { Role } from "./_components";

interface ClerkError {
  errors?: Array<{ message?: string }>;
}

interface MembershipResource {
  id: string;
  destroy: () => Promise<unknown>;
  update: (params: { role: Role }) => Promise<unknown>;
}

interface InvitationResource {
  id: string;
  revoke: () => Promise<unknown>;
}

interface Paginated<T> {
  data?: T[] | null;
  revalidate?: () => Promise<void>;
}

function clerkMessage(err: unknown, fallback: string): string {
  const e = err as ClerkError;
  return e?.errors?.[0]?.message ?? fallback;
}

/**
 * Member-management actions backed by Clerk's client SDK. Each action looks up
 * the live Clerk resource by id and calls its mutator, then revalidates the
 * list. Clerk enforces admin-only authorization server-side, so these are safe
 * to expose — the UI only hides them for non-admins as a courtesy.
 *
 * `pendingId` is the id of the row with an in-flight action (for disabling).
 */
export function useMemberActions(
  memberships: Paginated<MembershipResource> | null | undefined,
  invitations: Paginated<InvitationResource> | null | undefined,
) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const removeMember = React.useCallback(
    async (id: string) => {
      const membership = memberships?.data?.find((m) => m.id === id);
      if (!membership) return;
      setPendingId(id);
      try {
        await membership.destroy();
        await memberships?.revalidate?.();
        toast.success("Member removed");
      } catch (err) {
        toast.error(clerkMessage(err, "Failed to remove member"));
      } finally {
        setPendingId(null);
      }
    },
    [memberships],
  );

  const updateRole = React.useCallback(
    async (id: string, role: Role) => {
      const membership = memberships?.data?.find((m) => m.id === id);
      if (!membership) return;
      setPendingId(id);
      try {
        await membership.update({ role });
        await memberships?.revalidate?.();
        toast.success("Role updated");
      } catch (err) {
        toast.error(clerkMessage(err, "Failed to update role"));
      } finally {
        setPendingId(null);
      }
    },
    [memberships],
  );

  const revokeInvitation = React.useCallback(
    async (id: string) => {
      const invitation = invitations?.data?.find((i) => i.id === id);
      if (!invitation) return;
      setPendingId(id);
      try {
        await invitation.revoke();
        await invitations?.revalidate?.();
        toast.success("Invitation revoked");
      } catch (err) {
        toast.error(clerkMessage(err, "Failed to revoke invitation"));
      } finally {
        setPendingId(null);
      }
    },
    [invitations],
  );

  return { removeMember, updateRole, revokeInvitation, pendingId };
}
