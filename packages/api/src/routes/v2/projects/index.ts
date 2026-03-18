import { Hono } from "hono";
import type { Bindings, Variables } from "../../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Placeholder for future v2 endpoints
router.get("/health", (c) => c.json({ status: "ok", version: "v2" }));

export default router;
