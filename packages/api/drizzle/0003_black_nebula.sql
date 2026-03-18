CREATE TABLE `custom_domains` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`domain` text NOT NULL,
	`verification_token` text NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`verified_at` integer,
	`ssl_enabled` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_domains_domain_unique` ON `custom_domains` (`domain`);--> statement-breakpoint
CREATE INDEX `custom_domains_project_id_idx` ON `custom_domains` (`project_id`);--> statement-breakpoint
CREATE INDEX `custom_domains_verification_status_idx` ON `custom_domains` (`verification_status`);--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`url` text NOT NULL,
	`events` text NOT NULL,
	`secret` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`last_triggered_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhooks_project_id_idx` ON `webhooks` (`project_id`);--> statement-breakpoint
CREATE INDEX `webhooks_project_id_active_idx` ON `webhooks` (`project_id`,`active`);--> statement-breakpoint
CREATE INDEX `conversations_project_id_created_at_idx` ON `conversations` (`project_id`,`created_at`);