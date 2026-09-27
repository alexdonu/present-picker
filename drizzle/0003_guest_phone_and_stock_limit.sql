-- Two independent additions: a guest's phone number (so guests can reach each other), and a product's needed
-- quantity (once picks reach it, nobody can pick more).
ALTER TABLE `guests` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `products` ADD `needed_quantity` integer;
