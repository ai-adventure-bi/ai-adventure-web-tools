CREATE TABLE `class_teachers` (
	`class_id` text NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `class_teachers_pair` ON `class_teachers` (`class_id`,`user_id`);
--> statement-breakpoint
INSERT INTO class_teachers(class_id,user_id) SELECT id,teacher FROM classes;
