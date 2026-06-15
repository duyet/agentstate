import { Badge } from "@/components/ui/badge";

export interface RoleBadgeProps {
  readonly role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const isAdmin = role === "org:admin";
  return <Badge tone={isAdmin ? "live" : "idle"}>{isAdmin ? "Admin" : "Member"}</Badge>;
}
