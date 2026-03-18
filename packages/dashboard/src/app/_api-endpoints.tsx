import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const apiEndpoints = [
  ["POST", "/api/v1/conversations", "Create conversation"],
  ["GET", "/api/v1/conversations", "List conversations"],
  ["GET", "/api/v1/conversations/:id", "Get with messages"],
  ["POST", "/api/v1/conversations/:id/messages", "Append messages"],
  ["POST", "/api/v1/conversations/:id/generate-title", "AI title"],
  ["POST", "/api/v1/conversations/:id/follow-ups", "AI follow-ups"],
  ["POST", "/api/v1/conversations/export", "Bulk export"],
] as const;

export function ApiEndpoints() {
  return (
    <section
      className="max-w-5xl mx-auto px-6 pb-28 space-y-6 animate-fade-in-up"
      style={{ animationDelay: "0.45s" }}
    >
      <h2 className="text-lg font-medium">API endpoints</h2>
      <Card>
        <Table>
          <TableBody>
            {apiEndpoints.map(([method, path, desc]) => (
              <TableRow key={path + method}>
                <TableCell className="font-mono text-muted-foreground w-16">{method}</TableCell>
                <TableCell className="font-mono text-foreground">{path}</TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell">{desc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="flex gap-5">
        <Link
          href="/docs"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Full API reference &rarr;
        </Link>
        <Link
          href="/agents.md"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          agents.md &rarr;
        </Link>
      </div>
    </section>
  );
}
