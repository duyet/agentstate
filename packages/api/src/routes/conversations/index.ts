import { Hono } from "hono";
import { apiKeyAuth } from "../../middleware/auth";
import { deprecationMiddleware } from "../../lib/deprecation";
import { rateLimitMiddleware } from "../../middleware/rate-limit";
import type { Bindings, Variables } from "../../types";
import analyticsRouter from "./analytics";
import bulkRouter from "./bulk";
import crudRouter from "./crud";
import messagesRouter from "./messages";
import searchRouter from "./search";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth and rate-limit middleware once for all conversation routes
router.use("*", apiKeyAuth);
router.use("*", rateLimitMiddleware);

// V1 deprecation notice
router.use("*", deprecationMiddleware({
  message: "API v1 is deprecated. Use /api/v2/ instead.",
  sunsetDate: "2026-12-31",
  link: "https://docs.agentstate.app/api/v2/migration",
}));

// Mount sub-routers — order matters: specific paths before parameterized ones
router.route("/", searchRouter);
router.route("/", bulkRouter);
router.route("/", messagesRouter);
router.route("/", analyticsRouter);
router.route("/", crudRouter);

export default router;
