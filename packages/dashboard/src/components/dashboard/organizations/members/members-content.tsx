import { useOrganization, useOrganizationList, useUser } from "@clerk/react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { Card } from "@/components/ui/card";
import {
  _MembersSkeleton,
  _PageHeader,
  _PendingInvitationsList,
  InviteMemberForm,
  MembersList,
} from "./_components";
import { useInviteMember } from "./_use-invite-member";
import { useMemberActions } from "./_use-member-actions";

// =============================================================================
// Main Page
// =============================================================================

export function MembersContent() {
  const { isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { isLoaded: isOrgListLoaded, setActive } = useOrganizationList({
    userMemberships: true,
  });
  const {
    isLoaded: isOrgLoaded,
    organization,
    membership,
    memberships,
    invitations,
  } = useOrganization({
    memberships: {
      pageSize: 10,
      keepPreviousData: true,
    },
    invitations: {
      pageSize: 10,
      keepPreviousData: true,
    },
  });

  // `?org=` selects which organization's members to manage. When present and
  // different from the currently active org, switch the active org so Clerk's
  // useOrganization() hooks resolve the right membership / invitation lists.
  const searchParams = useSearchParams();
  const orgParam = searchParams?.get("org") ?? null;

  React.useEffect(() => {
    if (!orgParam || !setActive || !isOrgListLoaded) return;
    if (organization?.id === orgParam) return;
    setActive({ organization: orgParam }).catch(() => {
      /* ignore — stale param or no access */
    });
  }, [orgParam, setActive, isOrgListLoaded, organization?.id]);

  const { inviteMember, isInviting } = useInviteMember(organization, invitations);
  const { removeMember, updateRole, revokeInvitation, pendingId } = useMemberActions(
    memberships,
    invitations,
  );

  // Only org admins may manage members; the UI hides actions for everyone else
  // (Clerk independently enforces this server-side).
  const isAdmin = membership?.role === "org:admin";

  // Loading state
  if (!isUserLoaded || !isOrgListLoaded || !isOrgLoaded) {
    return (
      <div className="page-padding flex flex-col gap-section py-7">
        <_PageHeader isLoading />
        <_MembersSkeleton />
      </div>
    );
  }

  // Not signed in or no organization
  if (!isSignedIn || !organization) {
    return (
      <div className="page-padding flex flex-col gap-section py-7">
        <_PageHeader />
        <Card className="card-padding flex flex-col gap-tight">
          <h2 className="text-[16px] font-semibold text-fg">No organization selected</h2>
          <p className="text-[13.5px] leading-6 text-fg-3">
            Select an organization to manage its members.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-padding flex flex-col gap-section py-7">
      <_PageHeader organizationName={organization.name} />
      <InviteMemberForm isInviting={isInviting} onInvite={inviteMember} />
      <MembersList
        isLoading={memberships?.isLoading ?? false}
        members={memberships?.data ?? null}
        count={memberships?.count}
        canManage={isAdmin}
        currentMembershipId={membership?.id ?? null}
        pendingId={pendingId}
        onRemoveMember={removeMember}
        onUpdateRole={updateRole}
      />
      <_PendingInvitationsList
        isLoading={invitations?.isLoading ?? false}
        invitations={invitations?.data ?? null}
        count={invitations?.count}
        canManage={isAdmin}
        pendingId={pendingId}
        onRevokeInvitation={revokeInvitation}
      />
    </div>
  );
}
