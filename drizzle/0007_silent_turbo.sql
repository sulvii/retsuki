CREATE TABLE `armory` (
	`kingdom_id` text PRIMARY KEY NOT NULL,
	`warrior_tier` integer DEFAULT 0 NOT NULL,
	`archer_tier` integer DEFAULT 0 NOT NULL,
	`knight_tier` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`kingdom_id`) REFERENCES `kingdoms`(`kingdom_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `battles` (
	`battle_id` text PRIMARY KEY NOT NULL,
	`challenger_id` text NOT NULL,
	`defender_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`channel_id` text NOT NULL,
	`challenger_allocation` text,
	`defender_allocation` text,
	`winner_id` text,
	`created_at` integer NOT NULL,
	`resolved_at` integer
);
--> statement-breakpoint
ALTER TABLE `kingdoms` ADD `last_battle_at` integer DEFAULT 0 NOT NULL;