-- Product photos and the hero image move from files on disk into the database (a new `images` table), so the
-- whole app's state lives in one SQLite file. This migration only adds the new table and the new nullable
-- columns. Existing `products.image` values (remote URLs, and local /uploads/<file> paths from before images
-- lived in the database) are moved into `image_url` / `image_id`, and the old column is then dropped, by a
-- one-time step that runs right after this migration (see `migrateLegacyFileImages` in server/db/connect.ts) —
-- plain SQL cannot read an uploaded file's bytes off disk.
CREATE TABLE `images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` blob NOT NULL,
	`content_type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`hero_image_id` integer,
	FOREIGN KEY (`hero_image_id`) REFERENCES `images`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `settings` (`id`, `hero_image_id`) VALUES (1, NULL);
--> statement-breakpoint
ALTER TABLE `products` ADD `image_id` integer REFERENCES `images`(`id`) ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `products` ADD `image_url` text;
