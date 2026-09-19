CREATE TABLE "catalog_releases" (
	"version" text PRIMARY KEY NOT NULL,
	"hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_positions" (
	"user_id" text NOT NULL,
	"song_id" text NOT NULL,
	"song_revision" integer NOT NULL,
	"ordinal" integer NOT NULL,
	"completed" integer NOT NULL,
	"revision" integer NOT NULL,
	CONSTRAINT "practice_positions_user_id_song_id_pk" PRIMARY KEY("user_id","song_id")
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"values" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song_events" (
	"song_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"symbol" text NOT NULL,
	CONSTRAINT "song_events_song_id_ordinal_pk" PRIMARY KEY("song_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"catalog" integer NOT NULL,
	"title" text NOT NULL,
	"attribution" text NOT NULL,
	"revision" integer NOT NULL,
	CONSTRAINT "song_scope" CHECK (("songs"."catalog" = 1 AND "songs"."owner_id" IS NULL) OR ("songs"."catalog" = 0 AND "songs"."owner_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_positions" ADD CONSTRAINT "practice_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_positions" ADD CONSTRAINT "practice_positions_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_events" ADD CONSTRAINT "song_events_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;