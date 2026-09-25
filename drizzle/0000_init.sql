CREATE TABLE `picks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`guest_name` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`note` text,
	`owner_token` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `picks_product_id_idx` ON `picks` (`product_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`link` text,
	`price` integer,
	`image` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
