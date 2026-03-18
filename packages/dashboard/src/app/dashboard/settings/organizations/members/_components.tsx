"use client";

import { ArrowLeftIcon, MailIcon, PlusIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { Column } from "@/components/dashboard/data-table";
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
import { MemberCell } from "./_member-cell";
import { MemberListCard } from "./_member-list-card";
import { RoleBadge } from "./_role-badge";

export type Role = "org:member" | "org:admin";

// =============================================================================
// Helpers
// =============================================================================

const skeletonItems = [1, 2, 3];

// =============================================================================
// Skeleton (for page-level loading state)
// =============================================================================

export function _MembersSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {skeletonItems.map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-16 shrink-0" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Page Header
// =============================================================================

export interface _PageHeaderProps {
  readonly organizationName?: string;
  readonly isLoading?: boolean;
}

export function _PageHeader({ organizationName, isLoading }: _PageHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Link href="/dashboard/settings/organizations">
        <Button variant="ghost" size="icon" disabled={isLoading}>
          <ArrowLeftIcon />
        </Button>
      </Link>
      <div className="flex-1">
        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground mt-2">
          {organizationName ? `${organizationName} · ` : ""}Manage organization members
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Invite Form
// =============================================================================

export interface _InviteMemberFormProps {
  readonly isInviting: boolean;
  readonly onInvite: (email: string, role: Role) => Promise<void>;
}

export function _InviteMemberForm({ isInviting, onInvite }: _InviteMemberFormProps) {
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

export interface _MembersListProps {
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

export function _MembersList({ isLoading, members, count }: _MembersListProps) {
  const memberData = React.useMemo(
    () =>
      members
        ?.filter((m): m is NonNullable<typeof m> => m != null)
        .map((membership) => ({
          id: membership.id,
          name: membership.publicUserData?.firstName
            ? `${membership.publicUserData.firstName} ${membership.publicUserData.lastName ?? ""}`.trim()
            : (membership.publicUserData?.identifier ?? "Unknown"),
          email: membership.publicUserData?.identifier ?? "Unknown",
          role: membership.role,
        })) ?? [],
    [members],
  );

  const columns: Column<(typeof memberData)[number]>[] = [
    {
      key: "name",
      label: "Member",
      render: (row) => <MemberCell name={row.name} email={row.email} iconType="user" />,
    },
    {
      key: "role",
      label: "Role",
      render: (row) => <RoleBadge role={row.role} />,
    },
  ];

  return (
    <MemberListCard
      title="Members"
      countLabel="member"
      count={count}
      data={memberData}
      columns={columns}
      isLoading={isLoading}
      empty={{
        icon: <UserIcon className="h-5 w-5" />,
        title: "No members yet",
        description: "Invite team members to join your organization",
      }}
      rowKey={(row) => row.id}
    />
  );
}

// =============================================================================
// Pending Invitations List
// =============================================================================

export interface _PendingInvitationsListProps {
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

export function _PendingInvitationsList({
  isLoading,
  invitations,
  count,
  onRevokeInvitation,
}: _PendingInvitationsListProps) {
  type Invitation = NonNullable<typeof invitations>[number];

  const formatRoleStatus = (role: string, status: string) =>
    `${role === "org:admin" ? "Admin" : "Member"} · ${status}`;

  const columns: Column<Invitation>[] = [
    {
      key: "emailAddress",
      label: "Email",
      render: (row) => (
        <MemberCell
          name={row.emailAddress}
          email={row.emailAddress}
          iconType="mail"
          subtitle={formatRoleStatus(row.role, row.status)}
        />
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => onRevokeInvitation(row.id)}>
          Revoke
        </Button>
      ),
    },
  ];

  return (
    <MemberListCard
      title="Pending Invitations"
      countLabel="pending invitation"
      count={count}
      data={invitations ?? []}
      columns={columns}
      isLoading={isLoading}
      empty={{
        icon: <MailIcon className="h-5 w-5" />,
        title: "No pending invitations",
      }}
      rowKey={(row) => row.id}
    />
  );
}
