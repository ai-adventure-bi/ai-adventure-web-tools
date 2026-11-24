CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `versions` ADD `origin` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `versions` ADD `before_source` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `versions` ADD `teaching` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `versions` ADD `request` text DEFAULT '' NOT NULL;