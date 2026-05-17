import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MessageFormatSection() {
  return (
    <Card id="message-format">
      <CardHeader>
        <CardTitle>Message format</CardTitle>
        <CardDescription>
          Store model turns, tool outputs, and caller metadata in the same conversation timeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground/80">
          {`{
  "role": "user | assistant | system | tool",
  "content": "message text",
  "metadata": {}
}`}
        </pre>
        <div className="grid content-start gap-3">
          {["Cursor pagination", "External ID lookup", "Metadata search", "Audit export"].map(
            (item) => (
              <div className="flex items-center justify-between gap-3" key={item}>
                <span className="text-sm text-muted-foreground">{item}</span>
                <Badge variant="secondary">Ready</Badge>
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
