"use client";

import {
  Badge,
  Button,
  Input,
  Label,
  Loader,
  Surface,
  Text,
} from "@cloudflare/kumo";

/**
 * Temporary build/route smoke test for the Kumo migration.
 *
 * Purpose: prove @cloudflare/kumo compiles and statically exports under
 * Next 16 + React 19 + `output: "export"`, and that Tailwind v4 picks up
 * Kumo's utility classes via the `@source` directive in globals.css.
 *
 * This page is deleted in the cleanup phase once the real rebuild lands.
 */
export default function KumoSmokePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-10">
      <Text variant="heading1" as="h1">
        Kumo smoke test
      </Text>
      <Text variant="secondary" as="p">
        Proves @cloudflare/kumo builds under Next 16 + React 19 + static export.
      </Text>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="primary" loading>
          Loading
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="primary">primary</Badge>
        <Badge variant="success">success</Badge>
        <Badge variant="warning">warning</Badge>
        <Badge variant="error">error</Badge>
        <Badge variant="info">info</Badge>
        <Badge variant="beta">beta</Badge>
      </div>

      <Surface className="flex flex-col gap-3 p-4">
        <Label htmlFor="smoke-input">Example field</Label>
        <Input id="smoke-input" placeholder="Type here…" size="base" />
      </Surface>

      <div className="flex items-center gap-3">
        <Loader size="sm" />
        <Loader />
        <Loader size="lg" />
      </div>
    </main>
  );
}
