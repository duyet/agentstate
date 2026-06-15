import type { CustomDomainResponse } from "@agentstate/shared";
import { Badge } from "@cloudflare/kumo/components/badge";

const STATUS_VARIANTS = {
  verified: "success" as const,
  failed: "error" as const,
  pending: "neutral" as const,
} satisfies Record<CustomDomainResponse["verification_status"], "success" | "error" | "neutral">;

interface DomainStatusBadgeProps {
  status: CustomDomainResponse["verification_status"];
}

export function _DomainStatusBadge({ status }: DomainStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status]}>{status}</Badge>;
}
