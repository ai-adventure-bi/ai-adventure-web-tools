ALTER TABLE `classes` ADD `shared` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `classes` ADD `description` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE classes SET shared=COALESCE((SELECT shared FROM schools WHERE schools.id=classes.school_id),0),description=COALESCE((SELECT description FROM schools WHERE schools.id=classes.school_id),'');
