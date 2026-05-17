import { Hono } from "hono";
import { parseAndValidateBody } from "../../lib/helpers";
import { BulkDeleteSchema, ExportSchema } from "../../lib/validation";
import * as bulkService from "../../services/bulk";
import type { Bindings, Variables } from "../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// POST /bulk-delete — Delete multiple conversations at once
// ---------------------------------------------------------------------------

router.post("/bulk-delete", async (c) => {
  const { data, error } = await parseAndValidateBody(c, BulkDeleteSchema);
  if (error) return error;

  const db = c.get("db");
  const projectId = c.get("projectId");
  const deleted = await bulkService.bulkDeleteConversations(db, projectId, data!.ids);

  return c.json({ deleted });
});

// ---------------------------------------------------------------------------
// POST /export — Bulk export conversations with messages
// ---------------------------------------------------------------------------

router.post("/export", async (c) => {
  const { data, error } = await parseAndValidateBody(c, ExportSchema);
  if (error) return error;

  const db = c.get("db");
  const projectId = c.get("projectId");
  const exported = await bulkService.exportConversations(db, projectId, data!.ids);

  return c.json({ data: exported, count: exported.length });
});

export default router;
