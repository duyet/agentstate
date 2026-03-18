import { MailIcon } from "lucide-react";
import type { Column } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { MemberCell } from "./_member-cell";
import { MemberListCard } from "./_member-list-card";

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
