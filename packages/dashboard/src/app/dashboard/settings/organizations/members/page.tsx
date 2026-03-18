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

function MembersSkeleton() {
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

  const [emailAddress, setEmailAddress] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<"org:member" | "org:admin">("org:member");
  const [isInviting, setIsInviting] = React.useState(false);

  if (!isUserLoaded || !isOrgListLoaded || !isOrgLoaded) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings/organizations">
            <Button variant="ghost" size="icon" disabled>
              <ArrowLeftIcon />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Members</h1>
            <p className="text-muted-foreground mt-2">Manage organization members</p>
          </div>
        </div>
        <MembersSkeleton />
      </div>
    );
  }

  if (!isSignedIn || !organization) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings/organizations">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No organization selected</CardTitle>
            <CardDescription>Select an organization to manage its members.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!emailAddress.trim() || isInviting) return;

    setIsInviting(true);
    try {
      await organization.inviteMember({
        emailAddress: emailAddress.trim(),
        role: selectedRole,
      });
      await invitations?.revalidate?.();
      setEmailAddress("");
      setSelectedRole("org:member");
      toast.success("Invitation sent successfully");
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ message?: string }> };
      const message = error?.errors?.[0]?.message ?? "Failed to send invitation";
      toast.error(message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      // Clerk doesn't have a direct revoke method in the SDK, so we'd need to use Backend API
      // For now, show a message
      toast.info("To revoke invitations, use the Clerk Dashboard");
    } catch {
      toast.error("Failed to revoke invitation");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      // Clerk doesn't have a direct remove method in the SDK for removing members
      // For now, show a message
      toast.info("To remove members, use the Clerk Dashboard");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings/organizations">
          <Button variant="ghost" size="icon">
            <ArrowLeftIcon />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground mt-2">
            {organization.name} · Manage organization members
          </p>
        </div>
      </div>

      {/* Invite form */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Member</CardTitle>
          <CardDescription>Send an invitation to join this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-2 items-end">
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
                  onValueChange={(v) => setSelectedRole(v as "org:member" | "org:admin")}
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

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {memberships?.count ?? 0} member{(memberships?.count ?? 0) !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!memberships || memberships.isLoading ? (
            <MembersSkeleton />
          ) : !memberships.data || memberships.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            memberships.data.map((membership) => (
              <div key={membership.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {membership.publicUserData?.firstName
                      ? `${membership.publicUserData.firstName} ${membership.publicUserData.lastName ?? ""}`
                      : (membership.publicUserData?.identifier ?? "Unknown")}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {membership.publicUserData?.identifier ?? "Unknown"}
                  </p>
                </div>
                <div className="text-sm">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
                    {membership.role === "org:admin" ? "Admin" : "Member"}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            {invitations?.count ?? 0} pending invitation{(invitations?.count ?? 0) !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!invitations || invitations.isLoading ? (
            <MembersSkeleton />
          ) : !invitations.data || invitations.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invitations.</p>
          ) : (
            invitations.data.map((invitation) => (
              <div key={invitation.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <MailIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{invitation.emailAddress}</p>
                  <p className="text-sm text-muted-foreground">
                    {invitation.role === "org:admin" ? "Admin" : "Member"} · {invitation.status}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokeInvitation(invitation.id)}
                >
                  Revoke
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
