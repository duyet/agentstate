"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderIcon, PlusIcon, KeyIcon, MessageSquareIcon } from "lucide-react";

interface Project {
  id: string;
  name: string;
  slug: string;
  keys: number;
  conversations: number;
  createdAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  function handleCreate() {
    if (!newName.trim()) return;
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setProjects([
      ...projects,
      {
        id: `proj_${Date.now()}`,
        name: newName.trim(),
        slug,
        keys: 0,
        conversations: 0,
        createdAt: new Date().toLocaleDateString(),
      },
    ]);
    setNewName("");
    setShowCreate(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Projects</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your API projects and keys.
          </p>
        </div>
        <Button size="sm" className="text-xs h-8" onClick={() => setShowCreate(true)}>
          <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
          New Project
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="border border-border rounded-lg p-6 mb-6 bg-card">
          <p className="text-sm font-medium text-foreground mb-1">Create project</p>
          <p className="text-xs text-muted-foreground mb-4">
            Give your project a name. You can change it later.
          </p>
          <label className="text-xs text-muted-foreground mb-1.5 block">Project name</label>
          <Input
            placeholder="e.g. my-chatbot"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="text-sm h-9 mb-4"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" className="text-xs h-8 px-4" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button size="sm" className="text-xs h-8 px-4" onClick={handleCreate} disabled={!newName.trim()}>
              Create project
            </Button>
          </div>
        </div>
      )}

      {/* Project list */}
      {projects.length > 0 ? (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Name</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">API Keys</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">Conversations</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b last:border-b-0 border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <FolderIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{project.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{project.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <KeyIcon className="h-3 w-3" />
                      {project.keys}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MessageSquareIcon className="h-3 w-3" />
                      {project.conversations}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                    {project.createdAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !showCreate ? (
        <div className="border border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted mb-4">
            <FolderIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-foreground mb-1">No projects yet</p>
          <p className="text-xs text-muted-foreground max-w-xs mb-4">
            Projects group your conversations and API keys.
          </p>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowCreate(true)}>
            <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
            Create your first project
          </Button>
        </div>
      ) : null}
    </div>
  );
}
