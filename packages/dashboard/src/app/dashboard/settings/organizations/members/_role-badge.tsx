import { Badge } from "@/components/ui/badge";

export interface RoleBadgeProps {
  readonly role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const isAdmin = role === "org:admin";
  return <Badge variant={isAdmin ? "brand" : "secondary"}>{isAdmin ? "Admin" : "Member"}</Badge>;
}
