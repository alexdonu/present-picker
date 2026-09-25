-- Guests become a list defined by the admins, and a pick belongs to a guest instead of carrying a typed name
-- and a per-browser token. Existing picks are kept:
--   * every distinct name that already picked something becomes a guest;
--   * picks of the same guest on the same product (the same person on two devices) are merged into one.
CREATE TABLE `guests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guests_name_unique` ON `guests` (`name`);
--> statement-breakpoint
INSERT INTO `guests` (`name`) SELECT `guest_name` FROM `picks` GROUP BY `guest_name` ORDER BY MIN(`id`);
--> statement-breakpoint
CREATE TABLE `picks_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`guest_id` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `picks_new` (`id`, `product_id`, `guest_id`, `quantity`, `note`, `created_at`)
SELECT MIN(p.`id`), p.`product_id`, g.`id`, MIN(20, SUM(p.`quantity`)), MAX(p.`note`), MIN(p.`created_at`)
FROM `picks` p JOIN `guests` g ON g.`name` = p.`guest_name`
GROUP BY p.`product_id`, g.`id`;
--> statement-breakpoint
DROP TABLE `picks`;
--> statement-breakpoint
ALTER TABLE `picks_new` RENAME TO `picks`;
--> statement-breakpoint
CREATE INDEX `picks_product_id_idx` ON `picks` (`product_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `picks_product_guest_unique` ON `picks` (`product_id`,`guest_id`);
