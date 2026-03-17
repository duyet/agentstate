import { Hono } from "hono";
import { apiKeyAuth } from "../../middleware/auth";
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

// Mount sub-routers — order matters: specific paths before parameterized ones
router.route("/", searchRouter);
router.route("/", bulkRouter);
router.route("/", analyticsRouter);
router.route("/", messagesRouter);
router.route("/", crudRouter);

export default router;
