"use client";

import { useOrganization, useOrganizationList, useUser } from "@clerk/react";
import { ArrowLeftIcon, MailIcon, PlusIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Role = "org:member" | "org:admin";

// =============================================================================
// Skeleton
// =============================================================================

function _MembersSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Page Header
// =============================================================================

interface _PageHeaderProps {
  readonly organizationName?: string;
  readonly isLoading?: boolean;
}

function _PageHeader({ organizationName, isLoading }: _PageHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Link href="/dashboard/settings/organizations">
        <Button variant="ghost" size="icon" disabled={isLoading}>
          <ArrowLeftIcon />
        </Button>
      </Link>
      <div className="flex-1">
        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
        {organizationName ? (
          <p className="text-muted-foreground mt-2">
            {organizationName} · Manage organization members
          </p>
        ) : (
          <p className="text-muted-foreground mt-2">Manage organization members</p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Member Item
// =============================================================================

interface _MemberItemProps {
  readonly name: string;
  readonly email: string;
  readonly role: string;
}

function _MemberItem({ name, email, role }: _MemberItemProps) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UserIcon />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
        <p className="text-sm text-muted-foreground truncate">{email}</p>
      </div>
      <div className="text-sm">
        <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
          {role === "org:admin" ? "Admin" : "Member"}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Invitation Item
// =============================================================================

interface _InvitationItemProps {
  readonly email: string;
  readonly role: string;
  readonly status: string;
  readonly onRevoke: () => void;
}

function _InvitationItem({ email, role, status, onRevoke }: _InvitationItemProps) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MailIcon />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{email}</p>
        <p className="text-sm text-muted-foreground">
          {role === "org:admin" ? "Admin" : "Member"} · {status}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onRevoke}>
        Revoke
      </Button>
    </div>
  );
}

// =============================================================================
// Invite Form
// =============================================================================

interface _InviteMemberFormProps {
  readonly isInviting: boolean;
  readonly onInvite: (email: string, role: Role) => Promise<void>;
}

function _InviteMemberForm({ isInviting, onInvite }: _InviteMemberFormProps) {
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
    <Card>
      <CardHeader>
        <CardTitle>Invite Member</CardTitle>
        <CardDescription>Send an invitation to join this organization</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.currentTarget.value)}
                disabled={isInviting}
                required
              />
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as Role)}
                disabled={isInviting}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org:member">Member</SelectItem>
                  <SelectItem value="org:admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? (
                  "Sending..."
                ) : (
                  <>
                    <PlusIcon />
                    Invite
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Members List
// =============================================================================

interface _MembersListProps {
  readonly isLoading: boolean;
  readonly members: Array<{
    readonly id: string;
    readonly role: string;
    readonly publicUserData?: {
      readonly firstName: string | null;
      readonly lastName: string | null;
      readonly identifier?: string;
    } | null;
  } | null> | null;
  readonly count?: number;
}

function _MembersList({ isLoading, members, count }: _MembersListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          {count ?? 0} member{(count ?? 0) !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <_MembersSkeleton />
        ) : !members || members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members yet.</p>
        ) : (
          members
            .filter(
              (membership): membership is NonNullable<typeof membership> => membership != null,
            )
            .map((membership) => {
              const name = membership.publicUserData?.firstName
                ? `${membership.publicUserData.firstName} ${membership.publicUserData.lastName ?? ""}`
                : (membership.publicUserData?.identifier ?? "Unknown");
              const email = membership.publicUserData?.identifier ?? "Unknown";

              return (
                <_MemberItem key={membership.id} name={name} email={email} role={membership.role} />
              );
            })
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Pending Invitations List
// =============================================================================

interface _PendingInvitationsListProps {
  readonly isLoading: boolean;
  readonly invitations: Array<{
    readonly id: string;
    readonly emailAddress: string;
    readonly role: string;
    readonly status: string;
  }> | null;
  readonly count?: number;
  readonly onRevokeInvitation: (id: string) => void;
}

function _PendingInvitationsList({
  isLoading,
  invitations,
  count,
  onRevokeInvitation,
}: _PendingInvitationsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
        <CardDescription>
          {count ?? 0} pending invitation{(count ?? 0) !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <_MembersSkeleton />
        ) : !invitations || invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          invitations.map((invitation) => (
            <_InvitationItem
              key={invitation.id}
              email={invitation.emailAddress}
              role={invitation.role}
              status={invitation.status}
              onRevoke={() => onRevokeInvitation(invitation.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

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

  const [isInviting, setIsInviting] = React.useState(false);

  const handleInvite = React.useCallback(
    async (emailAddress: string, role: Role) => {
      if (!organization) return;

      setIsInviting(true);
      try {
        await organization.inviteMember({ emailAddress, role });
        await invitations?.revalidate?.();
        toast.success("Invitation sent successfully");
      } catch (err: unknown) {
        const error = err as { errors?: Array<{ message?: string }> };
        const message = error?.errors?.[0]?.message ?? "Failed to send invitation";
        toast.error(message);
      } finally {
        setIsInviting(false);
      }
    },
    [organization, invitations],
  );

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
      <_InviteMemberForm isInviting={isInviting} onInvite={handleInvite} />
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
