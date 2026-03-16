CREATE TABLE `conversation_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`tag` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_tags_conversation_id_tag_idx` ON `conversation_tags` (`conversation_id`,`tag`);--> statement-breakpoint
CREATE INDEX `conversation_tags_tag_idx` ON `conversation_tags` (`tag`);