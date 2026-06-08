-- Tracing columns for messages table
ALTER TABLE `messages` ADD `parent_message_id` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `observation_type` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `start_time` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `end_time` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `status` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `level` text;--> statement-breakpoint
CREATE INDEX `messages_parent_message_id_idx` ON `messages` (`parent_message_id`);--> statement-breakpoint
