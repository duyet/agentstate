import { useOrganization, useOrganizationList, useUser } from "@clerk/react";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Text } from "@cloudflare/kumo/components/text";
import * as React from "react";
import { toast } from "sonner";
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
  const { isLoaded: isOrgListLoaded } = useOrganizationList({
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

  const { inviteMember, isInviting } = useInviteMember(organization, invitations);

  const handleRevokeInvitation = React.useCallback(async (_invitationId: string) => {
    toast.info("To revoke invitations, use the Clerk Dashboard");
  }, []);

  // Loading state
  if (!isUserLoaded || !isOrgListLoaded || !isOrgLoaded) {
    return (
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        <_PageHeader isLoading />
        <_MembersSkeleton />
      </div>
    );
  }

  // Not signed in or no organization
  if (!isSignedIn || !organization) {
    return (
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        <_PageHeader />
        <LayerCard className="flex flex-col gap-1 p-6">
          <Text variant="heading3" as="h2">
            No organization selected
          </Text>
          <Text variant="secondary" as="p">
            Select an organization to manage its members.
          </Text>
        </LayerCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
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
