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
CREATE UNIQUE INDEX `agent_states_project_id_state_key_idx` ON `agent_states` (`project_id`,`state_key`);
CREATE INDEX `agent_states_project_id_agent_id_idx` ON `agent_states` (`project_id`,`agent_id`);
CREATE INDEX `agent_states_project_id_updated_at_idx` ON `agent_states` (`project_id`,`updated_at`);
CREATE INDEX `agent_states_project_id_latest_sequence_idx` ON `agent_states` (`project_id`,`latest_sequence`);

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
CREATE UNIQUE INDEX `state_events_id_idx` ON `state_events` (`id`);
CREATE INDEX `state_events_project_id_sequence_idx` ON `state_events` (`project_id`,`sequence`);
CREATE INDEX `state_events_project_id_state_key_idx` ON `state_events` (`project_id`,`state_key`);
CREATE INDEX `state_events_project_id_created_at_idx` ON `state_events` (`project_id`,`created_at`);

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
CREATE UNIQUE INDEX `state_snapshots_project_id_state_key_sequence_idx` ON `state_snapshots` (`project_id`,`state_key`,`sequence`);
CREATE INDEX `state_snapshots_project_id_sequence_idx` ON `state_snapshots` (`project_id`,`sequence`);

CREATE TABLE `state_tags` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `state_key` text NOT NULL,
  `tag` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `state_tags_project_id_state_key_tag_idx` ON `state_tags` (`project_id`,`state_key`,`tag`);
CREATE INDEX `state_tags_project_id_tag_idx` ON `state_tags` (`project_id`,`tag`);

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
CREATE UNIQUE INDEX `idempotency_keys_project_id_key_idx` ON `idempotency_keys` (`project_id`,`key`);
CREATE INDEX `idempotency_keys_project_id_created_at_idx` ON `idempotency_keys` (`project_id`,`created_at`);

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
CREATE INDEX `capability_tokens_key_hash_idx` ON `capability_tokens` (`key_hash`);
CREATE INDEX `capability_tokens_project_id_idx` ON `capability_tokens` (`project_id`);

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
CREATE INDEX `state_leases_project_id_state_key_idx` ON `state_leases` (`project_id`,`state_key`);
CREATE INDEX `state_leases_project_id_expires_at_idx` ON `state_leases` (`project_id`,`expires_at`);

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
CREATE INDEX `claims_project_id_created_at_idx` ON `claims` (`project_id`,`created_at`);
CREATE INDEX `claims_project_id_subject_idx` ON `claims` (`project_id`,`subject_type`,`subject_id`);

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
CREATE INDEX `claim_evidence_project_id_claim_id_idx` ON `claim_evidence` (`project_id`,`claim_id`);

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
CREATE INDEX `claim_verification_runs_project_id_claim_id_idx` ON `claim_verification_runs` (`project_id`,`claim_id`);
