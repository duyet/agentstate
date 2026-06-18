import { UserIcon } from "@phosphor-icons/react";
import * as React from "react";
import type { Role } from "./_components";
import { MemberCell } from "./_member-cell";
import { type Column, MemberListCard } from "./_member-list-card";
import { RoleBadge } from "./_role-badge";

export interface MembersListProps {
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
  /** Whether the current user can manage members (org admin). */
  readonly canManage?: boolean;
  /** The current user's own membership id — actions are hidden on their own row. */
  readonly currentMembershipId?: string | null;
  /** Membership id with an in-flight action (disables its controls). */
  readonly pendingId?: string | null;
  readonly onRemoveMember?: (id: string) => void;
  readonly onUpdateRole?: (id: string, role: Role) => void;
}

export function MembersList({
  isLoading,
  members,
  count,
  canManage = false,
  currentMembershipId = null,
  pendingId = null,
  onRemoveMember,
  onUpdateRole,
}: MembersListProps) {
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
        <MemberCell
          name={row.id === currentMembershipId ? `${row.name} (You)` : row.name}
          email={row.email}
          iconType="user"
        />
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (row) => <RoleBadge role={row.role} />,
    },
  ];

  // Admins get an actions column to change a member's role or remove them.
  // The current user's own row is left action-free to avoid self-lockout.
  if (canManage) {
    columns.push({
      key: "actions",
      label: "",
      render: (row) => {
        if (row.id === currentMembershipId) return null;
        const isAdmin = row.role === "org:admin";
        const busy = pendingId === row.id;
        return (
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => onUpdateRole?.(row.id, isAdmin ? "org:member" : "org:admin")}
              className="text-[12.5px] text-fg-3 transition-colors hover:text-fg disabled:opacity-50"
            >
              {isAdmin ? "Make member" : "Make admin"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemoveMember?.(row.id)}
              className="text-[12.5px] text-fg-3 transition-colors hover:text-neg disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        );
      },
    });
  }

  return (
    <MemberListCard
      title="Members"
      countLabel="member"
      count={count}
      data={memberData}
      columns={columns}
      isLoading={isLoading}
      empty={{
        icon: <UserIcon className="size-4" aria-hidden="true" />,
        title: "No members yet",
        description: "Invite team members to join your organization",
      }}
      rowKey={(row) => row.id}
    />
  );
}
