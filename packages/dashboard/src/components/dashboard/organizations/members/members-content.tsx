import { useOrganization, useOrganizationList, useUser } from "@clerk/react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import {
  _MembersSkeleton,
  _PageHeader,
  _PendingInvitationsList,
  InviteMemberForm,
  MembersList,
} from "./_components";
import { useInviteMember } from "./_use-invite-member";

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

  const handleRevokeInvitation = React.useCallback(async (_invitationId: string) => {
    toast.info("To revoke invitations, use the Clerk Dashboard");
  }, []);

  // Loading state
  if (!isUserLoaded || !isOrgListLoaded || !isOrgLoaded) {
    return (
      <div className="flex flex-col gap-6 px-4 py-7 lg:px-6">
        <_PageHeader isLoading />
        <_MembersSkeleton />
      </div>
    );
  }

  // Not signed in or no organization
  if (!isSignedIn || !organization) {
    return (
      <div className="flex flex-col gap-6 px-4 py-7 lg:px-6">
        <_PageHeader />
        <Card className="flex flex-col gap-1 p-6">
          <h2 className="text-[16px] font-semibold text-fg">No organization selected</h2>
          <p className="text-[13.5px] leading-6 text-fg-3">
            Select an organization to manage its members.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-7 lg:px-6">
      <_PageHeader organizationName={organization.name} />
      <InviteMemberForm isInviting={isInviting} onInvite={inviteMember} />
      <MembersList
        isLoading={memberships?.isLoading ?? false}
        members={memberships?.data ?? null}
        count={memberships?.count}
      />
      <_PendingInvitationsList
        isLoading={invitations?.isLoading ?? false}
        invitations={invitations?.data ?? null}
        count={invitations?.count}
        onRevokeInvitation={handleRevokeInvitation}
      />
    </div>
  );
}
