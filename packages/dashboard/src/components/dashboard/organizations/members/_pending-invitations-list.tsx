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
  /** Whether the current user can revoke invitations (org admin). */
  readonly canManage?: boolean;
  /** Invitation id with an in-flight action (disables its control). */
  readonly pendingId?: string | null;
  readonly onRevokeInvitation: (id: string) => void;
}

export function _PendingInvitationsList({
  isLoading,
  invitations,
  count,
  canManage = false,
  pendingId = null,
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
  ];

  // Only admins can revoke; non-admins see the list without the action.
  if (canManage) {
    columns.push({
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={pendingId === row.id}
            onClick={() => onRevokeInvitation(row.id)}
            className="inline-flex min-h-[40px] items-center rounded-[var(--radius-sm)] px-2 text-[12.5px] text-fg-3 transition-[color,transform] duration-150 hover:text-neg active:scale-[0.96] disabled:opacity-50"
          >
            Revoke
          </button>
        </div>
      ),
    });
  }

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
