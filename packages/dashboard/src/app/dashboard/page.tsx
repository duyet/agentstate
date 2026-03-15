import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-sm font-semibold text-foreground">Projects</h1>
        <Button size="sm" className="font-mono text-xs" disabled>
          + New Project
        </Button>
      </div>

      <div className="rounded border border-border flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground font-mono">No projects yet</p>
      </div>
    </div>
  );
}
