import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { endpoints } from "./_endpoints-data";

export function EndpointsTable() {
  return (
    <Card id="endpoints">
      <CardHeader>
        <CardTitle>Endpoint surface</CardTitle>
        <CardDescription>
          Conversation history, retrieval, automation, and export routes for agent runtimes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table aria-label="API endpoints" className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Method</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead className="hidden w-36 md:table-cell">Group</TableHead>
              <TableHead className="hidden w-72 lg:table-cell">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {endpoints.map((ep) => (
              <TableRow key={`${ep.method}-${ep.path}`}>
                <TableCell>
                  <Badge variant="outline">{ep.method}</Badge>
                </TableCell>
                <TableCell className="whitespace-normal break-all font-mono text-xs">
                  {ep.path}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="secondary">{ep.group}</Badge>
                </TableCell>
                <TableCell className="hidden whitespace-normal text-muted-foreground lg:table-cell">
                  {ep.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
