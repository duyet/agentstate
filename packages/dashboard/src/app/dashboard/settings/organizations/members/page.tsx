"use client";

import { useOrganization, useOrganizationList, useUser } from "@clerk/react";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  _InviteMemberForm,
  _MembersList,
  _MembersSkeleton,
  _PageHeader,
  _PendingInvitationsList,
} from "./_components";
import { useInviteMember } from "./_use-invite-member";

// =============================================================================
// Main Page
// =============================================================================

export default function OrganizationMembersPage() {
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
      <div className="space-y-6">
        <_PageHeader isLoading />
        <_MembersSkeleton />
      </div>
    );
  }

  // Not signed in or no organization
  if (!isSignedIn || !organization) {
    return (
      <div className="space-y-6">
        <_PageHeader />
        <Card>
          <CardHeader>
            <CardTitle>No organization selected</CardTitle>
            <CardDescription>Select an organization to manage its members.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <_PageHeader organizationName={organization.name} />
      <_InviteMemberForm isInviting={isInviting} onInvite={inviteMember} />
      <_MembersList
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
