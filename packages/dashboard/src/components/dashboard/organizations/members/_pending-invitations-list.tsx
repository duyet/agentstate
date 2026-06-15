import { EnvelopeIcon } from "@phosphor-icons/react";
import { MemberCell } from "./_member-cell";
import { type Column, MemberListCard } from "./_member-list-card";

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
        <button
          type="button"
          onClick={() => onRevokeInvitation(row.id)}
          className="text-[12.5px] text-fg-3 transition-colors hover:text-neg"
        >
          Revoke
        </button>
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
        icon: <EnvelopeIcon className="size-4" aria-hidden="true" />,
        title: "No pending invitations",
      }}
      rowKey={(row) => row.id}
    />
  );
}
