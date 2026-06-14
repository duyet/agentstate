/**
 * Shared mock data and types for DataTable examples
 */

export interface Project {
  id: string;
  name: string;
  apiKeyCount: number;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  lastUsed: string | null;
  isActive: boolean;
}

export const mockProjects: Project[] = [
  { id: "1", name: "Production", apiKeyCount: 3, createdAt: "2024-01-15" },
  { id: "2", name: "Staging", apiKeyCount: 1, createdAt: "2024-02-20" },
];

export const mockApiKeys: ApiKey[] = [
  {
    id: "1",
    name: "Production Key",
    keyPreview: "as_live_•••••••••••••••••••••••••••",
    lastUsed: "2 hours ago",
    isActive: true,
  },
  {
    id: "2",
    name: "Test Key",
    keyPreview: "as_live_•••••••••••••••••••••••••••",
    lastUsed: null,
    isActive: false,
  },
];

export const projectColumns = [
  { key: "name" as const, label: "Name" },
  { key: "apiKeyCount" as const, label: "API Keys" },
  { key: "createdAt" as const, label: "Created" },
];

export const projectColumnsWithHidden = [
  { key: "name" as const, label: "Name" },
  { key: "apiKeyCount" as const, label: "API Keys" },
  { key: "createdAt" as const, label: "Created", className: "hidden md:table-cell" as const },
];
