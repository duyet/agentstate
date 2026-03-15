import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  name: string;
  keyCount: number;
  conversationCount: number;
  createdAt: string;
}

const MOCK_PROJECTS: Project[] = [
  {
    id: "proj_01",
    name: "my-assistant",
    keyCount: 2,
    conversationCount: 148,
    createdAt: "2026-02-10",
  },
  {
    id: "proj_02",
    name: "support-bot",
    keyCount: 1,
    conversationCount: 32,
    createdAt: "2026-03-01",
  },
  {
    id: "proj_03",
    name: "research-agent",
    keyCount: 1,
    conversationCount: 7,
    createdAt: "2026-03-12",
  },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-sm font-semibold text-foreground">Projects</h1>
        <Button size="sm" className="font-mono text-xs" disabled>
          + New Project
        </Button>
      </div>

      <div className="rounded border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="text-left px-4 py-2.5 text-xs font-mono text-muted-foreground font-medium">
                Name
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-mono text-muted-foreground font-medium">
                API Keys
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-mono text-muted-foreground font-medium">
                Conversations
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-mono text-muted-foreground font-medium">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PROJECTS.map((project, idx) => (
              <tr
                key={project.id}
                className={`${
                  idx < MOCK_PROJECTS.length - 1 ? "border-b border-border" : ""
                } hover:bg-muted/20 transition-colors`}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-foreground">
                    {project.name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-muted-foreground">
                    {project.keyCount}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-foreground">
                    {project.conversationCount.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground">
                    {project.createdAt}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Project management coming soon.
      </p>
    </div>
  );
}
