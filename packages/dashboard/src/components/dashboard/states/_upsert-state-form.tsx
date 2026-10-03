"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

export interface UpsertStateInput {
  stateKey: string;
  agentId: string;
  /** Raw JSON text — the caller parses it into the request body. */
  data: string;
  tags: string[];
}

interface UpsertStateFormProps {
  upserting: boolean;
  onSubmit: (input: UpsertStateInput) => void | Promise<void>;
  onCancel: () => void;
}

/** Same grammar as the API's StateTagInputSchema. */
const TAG_PATTERN = /^[a-zA-Z0-9_-]+$/;

function parseTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

/**
 * Write form for PUT /v1/states/:state_key (upsert — the same
 * call creates and replaces a record). `data` is raw JSON
 * validated client-side so a typo fails before the request;
 * tags are comma-separated and checked against the API's tag
 * grammar.
 */
export function UpsertStateForm({ upserting, onSubmit, onCancel }: UpsertStateFormProps) {
  const [stateKey, setStateKey] = useState("");
  const [agentId, setAgentId] = useState("");
  const [data, setData] = useState("{\n  \n}");
  const [tags, setTags] = useState("");
  const [errors, setErrors] = useState<{
    stateKey?: string;
    agentId?: string;
    data?: string;
    tags?: string;
  }>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const nextErrors: typeof errors = {};
    if (!stateKey.trim()) nextErrors.stateKey = "State key is required";
    if (!agentId.trim()) nextErrors.agentId = "Agent id is required";

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      nextErrors.data = "Data must be valid JSON";
    }
    if (
      parsed !== undefined &&
      (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
    ) {
      nextErrors.data = "Data must be a JSON object";
    }

    const tagList = parseTags(tags);
    const invalidTag = tagList.find((tag) => !TAG_PATTERN.test(tag) || tag.length > 50);
    if (invalidTag) {
      nextErrors.tags = "Tags use letters, numbers, hyphens, underscores (max 50 chars)";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit({
      stateKey: stateKey.trim(),
      agentId: agentId.trim(),
      data,
      tags: tagList,
    });
  };

  return (
    <Card className="card-padding">
      <form className="flex flex-col gap-component" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] text-fg">Write state</h2>
          <p className="text-[13px] leading-5 text-fg-3">
            Upserts the record — writing an existing key replaces it and appends an event to its
            history.
          </p>
        </div>
        <Input
          label="State key"
          placeholder="assistant/session-123"
          value={stateKey}
          onChange={(e) => setStateKey(e.target.value)}
          error={errors.stateKey}
          mono
          autoComplete="off"
        />
        <Input
          label="Agent id"
          placeholder="assistant"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          error={errors.agentId}
          mono
          autoComplete="off"
        />
        <Textarea
          label="Data (JSON)"
          description="The record's payload — any JSON object."
          value={data}
          onChange={(e) => setData(e.target.value)}
          error={errors.data}
          mono
          rows={5}
        />
        <Input
          label="Tags"
          description="Comma-separated. Letters, numbers, hyphens, underscores."
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          error={errors.tags}
          placeholder="session, prod"
          mono
          autoComplete="off"
        />
        <div className="flex items-center gap-2">
          <Button type="submit" variant="primary" size="sm" loading={upserting}>
            Write state
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
