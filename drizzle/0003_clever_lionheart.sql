ALTER TABLE `kingdoms` ADD `region` integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE `kingdoms` ADD `locations` text DEFAULT '[]' NOT NULL;