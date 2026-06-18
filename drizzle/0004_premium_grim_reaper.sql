CREATE TABLE `citizens` (
	`citizen_id` text PRIMARY KEY NOT NULL,
	`role` integer DEFAULT 0 NOT NULL,
	`kingdom_id` text NOT NULL,
	FOREIGN KEY (`kingdom_id`) REFERENCES `kingdoms`(`kingdom_id`) ON UPDATE no action ON DELETE cascade
);
