"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
];

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");

  function handleCreate() {
    if (!newName.trim()) return;
    const project: Project = {
      id: `proj_0${projects.length + 1}`,
      name: newName.trim().toLowerCase().replace(/\s+/g, "-"),
      keyCount: 0,
      conversationCount: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setProjects((prev) => [project, ...prev]);
    setNewName("");
    setDialogOpen(false);
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each project has its own API keys and conversation namespace.
          </p>
        </div>
        <Button
          size="sm"
          className="font-mono text-xs"
          onClick={() => setDialogOpen(true)}
        >
          + New Project
        </Button>
      </div>

      {/* Projects list */}
      {projects.length === 0 ? (
        <div className="rounded-lg border border-border/40 border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">No projects yet.</p>
          <Button
            size="sm"
            variant="outline"
            className="font-mono text-xs"
            onClick={() => setDialogOpen(true)}
          >
            + New Project
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border/40 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40 text-xs text-muted-foreground font-mono">
                <th className="text-left px-4 py-3 font-medium">Project</th>
                <th className="text-left px-4 py-3 font-medium">Keys</th>
                <th className="text-left px-4 py-3 font-medium">
                  Conversations
                </th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-right px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project, idx) => (
                <tr
                  key={project.id}
                  className={`${idx < projects.length - 1 ? "border-b border-border/40" : ""} hover:bg-muted/30 transition-colors`}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                        <span className="text-xs font-mono text-muted-foreground">
                          {project.name[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="font-mono text-sm text-foreground">
                        {project.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      variant="outline"
                      className="font-mono text-xs text-muted-foreground"
                    >
                      {project.keyCount} key{project.keyCount !== 1 ? "s" : ""}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-sm text-foreground">
                      {project.conversationCount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-xs text-muted-foreground">
                      {project.createdAt}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="font-mono text-xs text-muted-foreground"
                    >
                      Manage →
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold">New Project</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Create a new project to get an API key and start storing
              conversations.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-2 block">
                Project name
              </label>
              <Input
                placeholder="my-agent"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-xs"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="font-mono text-xs"
                onClick={handleCreate}
                disabled={!newName.trim()}
              >
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
