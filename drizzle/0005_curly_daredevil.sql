CREATE TABLE `resources` (
	`resource_id` text PRIMARY KEY NOT NULL,
	`kingdom_id` text NOT NULL,
	`item` text NOT NULL,
	`rarity` text NOT NULL,
	`sell_worth_each` real NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`total_sold` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`kingdom_id`) REFERENCES `kingdoms`(`kingdom_id`) ON UPDATE no action ON DELETE cascade
);
