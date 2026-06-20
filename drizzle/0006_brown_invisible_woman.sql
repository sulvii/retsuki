PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_guilds` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`prefix` text DEFAULT '[]'
);
--> statement-breakpoint
INSERT INTO `__new_guilds`("guild_id", "prefix") SELECT "guild_id", "prefix" FROM `guilds`;--> statement-breakpoint
DROP TABLE `guilds`;--> statement-breakpoint
ALTER TABLE `__new_guilds` RENAME TO `guilds`;--> statement-breakpoint
PRAGMA foreign_keys=ON;