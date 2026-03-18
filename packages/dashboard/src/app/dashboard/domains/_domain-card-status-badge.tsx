import type { CustomDomainResponse } from "@agentstate/shared";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANTS = {
  verified: "default" as const,
  failed: "destructive" as const,
  pending: "secondary" as const,
} as const;

interface DomainStatusBadgeProps {
  status: CustomDomainResponse["verification_status"];
}

export function _DomainStatusBadge({ status }: DomainStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status]}>{status}</Badge>;
}
