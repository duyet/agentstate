import { Badge } from "@/components/ui/badge";

export interface RoleBadgeProps {
  readonly role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return <Badge variant="secondary">{role === "org:admin" ? "Admin" : "Member"}</Badge>;
}
