CREATE TABLE `agent_states` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`state_key` text NOT NULL,
	`agent_id` text NOT NULL,
	`data` text NOT NULL,
	`metadata` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`latest_sequence` integer NOT NULL,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_states_project_id_state_key_idx` ON `agent_states` (`project_id`,`state_key`);--> statement-breakpoint
CREATE INDEX `agent_states_project_id_agent_id_idx` ON `agent_states` (`project_id`,`agent_id`);--> statement-breakpoint
CREATE INDEX `agent_states_project_id_updated_at_idx` ON `agent_states` (`project_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `agent_states_project_id_latest_sequence_idx` ON `agent_states` (`project_id`,`latest_sequence`);--> statement-breakpoint
CREATE TABLE `capability_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`key_prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`scopes` text NOT NULL,
	`expires_at` integer,
	`last_used_at` integer,
	`created_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `capability_tokens_key_hash_idx` ON `capability_tokens` (`key_hash`);--> statement-breakpoint
CREATE INDEX `capability_tokens_project_id_idx` ON `capability_tokens` (`project_id`);--> statement-breakpoint
CREATE TABLE `claim_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`claim_id` text NOT NULL,
	`kind` text NOT NULL,
	`source` text NOT NULL,
	`data` text,
	`hash` text,
	`json_path` text,
	`expected_value` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `claim_evidence_project_id_claim_id_idx` ON `claim_evidence` (`project_id`,`claim_id`);--> statement-breakpoint
CREATE TABLE `claim_verification_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`claim_id` text NOT NULL,
	`status` text NOT NULL,
	`details` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `claim_verification_runs_project_id_claim_id_idx` ON `claim_verification_runs` (`project_id`,`claim_id`);--> statement-breakpoint
CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`statement` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `claims_project_id_created_at_idx` ON `claims` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `claims_project_id_subject_idx` ON `claims` (`project_id`,`subject_type`,`subject_id`);--> statement-breakpoint
CREATE TABLE `idempotency_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`key` text NOT NULL,
	`request_hash` text NOT NULL,
	`response_status` integer NOT NULL,
	`response_body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_keys_project_id_key_idx` ON `idempotency_keys` (`project_id`,`key`);--> statement-breakpoint
CREATE INDEX `idempotency_keys_project_id_created_at_idx` ON `idempotency_keys` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `state_events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`project_id` text NOT NULL,
	`state_key` text NOT NULL,
	`agent_id` text NOT NULL,
	`event_type` text NOT NULL,
	`data` text,
	`metadata` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`idempotency_key` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `state_events_id_idx` ON `state_events` (`id`);--> statement-breakpoint
CREATE INDEX `state_events_project_id_sequence_idx` ON `state_events` (`project_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `state_events_project_id_state_key_idx` ON `state_events` (`project_id`,`state_key`);--> statement-breakpoint
CREATE INDEX `state_events_project_id_created_at_idx` ON `state_events` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `state_leases` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`state_key` text NOT NULL,
	`holder` text NOT NULL,
	`fencing_token` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`renewed_at` integer NOT NULL,
	`released_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `state_leases_project_id_state_key_idx` ON `state_leases` (`project_id`,`state_key`);--> statement-breakpoint
CREATE INDEX `state_leases_project_id_expires_at_idx` ON `state_leases` (`project_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `state_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`state_key` text NOT NULL,
	`sequence` integer NOT NULL,
	`data` text,
	`metadata` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `state_snapshots_project_id_state_key_sequence_idx` ON `state_snapshots` (`project_id`,`state_key`,`sequence`);--> statement-breakpoint
CREATE INDEX `state_snapshots_project_id_sequence_idx` ON `state_snapshots` (`project_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `state_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`state_key` text NOT NULL,
	`tag` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `state_tags_project_id_state_key_tag_idx` ON `state_tags` (`project_id`,`state_key`,`tag`);--> statement-breakpoint
CREATE INDEX `state_tags_project_id_tag_idx` ON `state_tags` (`project_id`,`tag`);--> statement-breakpoint
ALTER TABLE `conversations` ADD `total_cost_microdollars` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `total_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `model` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `input_tokens` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `output_tokens` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `cost_microdollars` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `parent_message_id` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `observation_type` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `start_time` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `end_time` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `status` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `level` text;--> statement-breakpoint
CREATE INDEX `messages_parent_message_id_idx` ON `messages` (`parent_message_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`retention_days` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "projects_retention_days_range_check" CHECK("__new_projects"."retention_days" IS NULL OR ("__new_projects"."retention_days" BETWEEN 1 AND 3650))
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "org_id", "name", "slug", "retention_days", "created_at") SELECT "id", "org_id", "name", "slug", "retention_days", "created_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `projects_org_id_slug_idx` ON `projects` (`org_id`,`slug`);