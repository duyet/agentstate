import { UserIcon } from "lucide-react";
import * as React from "react";
import type { Column } from "@/components/dashboard/data-table";
import { MemberCell } from "./_member-cell";
import { MemberListCard } from "./_member-list-card";
import { RoleBadge } from "./_role-badge";

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
