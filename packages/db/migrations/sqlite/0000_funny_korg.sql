CREATE TABLE `catalog_releases` (
	`version` text PRIMARY KEY NOT NULL,
	`hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `practice_positions` (
	`user_id` text NOT NULL,
	`song_id` text NOT NULL,
	`song_revision` integer NOT NULL,
	`ordinal` integer NOT NULL,
	`completed` integer NOT NULL,
	`revision` integer NOT NULL,
	PRIMARY KEY(`user_id`, `song_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`values` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `song_events` (
	`song_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`symbol` text NOT NULL,
	PRIMARY KEY(`song_id`, `ordinal`),
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `songs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`catalog` integer NOT NULL,
	`title` text NOT NULL,
	`attribution` text NOT NULL,
	`revision` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "song_scope" CHECK(("songs"."catalog" = 1 AND "songs"."owner_id" IS NULL) OR ("songs"."catalog" = 0 AND "songs"."owner_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
