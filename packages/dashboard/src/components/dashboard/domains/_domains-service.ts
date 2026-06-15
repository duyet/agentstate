import type { CreateCustomDomainResponse, CustomDomainResponse } from "@agentstate/shared";
import { api } from "@/lib/api";

type CustomDomain = CustomDomainResponse;

export async function loadDomains(projectId: string): Promise<CustomDomain[]> {
  const res = await api<{ data: CustomDomain[] }>(`/v1/projects/${projectId}/domains`);
  return res.data ?? [];
}

export async function addDomain(
  projectId: string,
  domain: string,
): Promise<CreateCustomDomainResponse> {
  return api<CreateCustomDomainResponse>(`/v1/projects/${projectId}/domains`, {
    method: "POST",
    body: JSON.stringify({ domain: domain.trim().toLowerCase() }),
  });
}

export async function deleteDomain(projectId: string, domainId: string): Promise<void> {
  await api(`/v1/projects/${projectId}/domains/${domainId}`, { method: "DELETE" });
}

export async function checkDomainVerification(
  projectId: string,
  domainId: string,
): Promise<{
  verification_status: CustomDomain["verification_status"];
  verified_at: number | null;
}> {
  return api(`/v1/projects/${projectId}/domains/${domainId}/verify`, { method: "POST" });
}
