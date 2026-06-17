CREATE TABLE `kingdoms` (
	`kingdom_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`revenue` real DEFAULT 0 NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kingdoms_user_id_unique` ON `kingdoms` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` text PRIMARY KEY NOT NULL
);
