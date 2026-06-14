"use client";

import { Text } from "@cloudflare/kumo/components/text";

export function CreateProjectFormHeader() {
  return (
    <div className="flex flex-col gap-1">
      <Text variant="heading3" as="h2">
        Create project
      </Text>
      <Text variant="secondary" size="sm" as="p">
        Give your project a name. The slug is used in API paths.
      </Text>
    </div>
  );
}
