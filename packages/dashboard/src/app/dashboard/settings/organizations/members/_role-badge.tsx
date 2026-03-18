export interface RoleBadgeProps {
  readonly role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-sm">
      {role === "org:admin" ? "Admin" : "Member"}
    </span>
  );
}
