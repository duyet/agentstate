"use client";

import { Badge } from "@cloudflare/kumo/components/badge";

export interface RoleBadgeProps {
  readonly role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const isAdmin = role === "org:admin";
  return (
    <Badge variant={isAdmin ? "primary" : "secondary"}>{isAdmin ? "Admin" : "Member"}</Badge>
  );
}
