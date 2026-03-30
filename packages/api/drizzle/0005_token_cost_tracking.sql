-- Token cost tracking columns
-- Messages: model, input_tokens, output_tokens, cost_microdollars
-- Conversations: total_cost_microdollars, total_tokens (denormalized aggregates)

ALTER TABLE `messages` ADD `model` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `input_tokens` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `output_tokens` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `cost_microdollars` integer;--> statement-breakpoint
ALTER TABLE `conversations` ADD `total_cost_microdollars` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `total_tokens` integer DEFAULT 0 NOT NULL;
