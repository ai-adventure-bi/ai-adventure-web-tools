CREATE TABLE `addresses` (
	`class_id` text NOT NULL,
	`slug` text NOT NULL,
	`project_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `addresses_pair` ON `addresses` (`class_id`,`slug`);--> statement-breakpoint
CREATE TABLE `boards` (
	`project_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`score` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO addresses(class_id,slug,project_id) SELECT class_id,slug,id FROM projects;
