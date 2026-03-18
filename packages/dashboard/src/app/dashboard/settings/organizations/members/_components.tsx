"use client";

import { ArrowLeftIcon, MailIcon, PlusIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { type Column, DataTable } from "@/components/dashboard/data-table";
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

export type Role = "org:member" | "org:admin";

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
        {[1, 2, 3].map((i) => (
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
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{row.name}</p>
            <p className="text-sm text-muted-foreground truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (row) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-sm">
          {row.role === "org:admin" ? "Admin" : "Member"}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          {count ?? 0} member{(count ?? 0) !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          data={memberData}
          columns={columns}
          loading={isLoading}
          loadingRows={3}
          empty={{
            icon: <UserIcon className="h-5 w-5" />,
            title: "No members yet",
            description: "Invite team members to join your organization",
          }}
          rowKey={(row) => row.id}
        />
      </CardContent>
    </Card>
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
  const columns: Column<Invitation>[] = [
    {
      key: "emailAddress",
      label: "Email",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MailIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{row.emailAddress}</p>
            <p className="text-sm text-muted-foreground">
              {row.role === "org:admin" ? "Admin" : "Member"} · {row.status}
            </p>
          </div>
        </div>
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
    <Card>
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
        <CardDescription>
          {count ?? 0} pending invitation{(count ?? 0) !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          data={invitations ?? []}
          columns={columns}
          loading={isLoading}
          loadingRows={3}
          empty={{
            icon: <MailIcon className="h-5 w-5" />,
            title: "No pending invitations",
          }}
          rowKey={(row) => row.id}
        />
      </CardContent>
    </Card>
  );
}
