CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`api_key_hash` text NOT NULL,
	`window_start` integer NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limits_key_window_idx` ON `rate_limits` (`api_key_hash`,`window_start`);--> statement-breakpoint
CREATE INDEX `rate_limits_window_start_idx` ON `rate_limits` (`window_start`);