import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import {
  landingCard,
  landingContainer,
  landingHover,
  MotionDiv,
  MotionSection,
} from "@/components/landing/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <MotionSection
      className="max-w-5xl mx-auto px-6 pb-24"
      animate="visible"
      initial="hidden"
      variants={landingContainer}
    >
      <MotionDiv variants={landingCard} whileHover={landingHover}>
        <Card>
          <CardHeader>
            <CardTitle>API endpoints</CardTitle>
            <CardDescription>
              The public surface stays small enough for agents and humans to keep in context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Method</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead className="hidden w-56 sm:table-cell">Use</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiEndpoints.map(([method, path, desc]) => (
                  <TableRow key={path + method}>
                    <TableCell>
                      <Badge variant="outline">{method}</Badge>
                    </TableCell>
                    <TableCell className="truncate font-mono">{path}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {desc}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/docs" />}>
              Full API reference
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={
                <a href="/agents.md">
                  agents.md
                  <ArrowRightIcon data-icon="inline-end" />
                </a>
              }
            />
          </CardFooter>
        </Card>
      </MotionDiv>
    </MotionSection>
  );
}
