CREATE TYPE "public"."entry_type" AS ENUM('text', 'quote', 'chat', 'link', 'photo');--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "entry_type" NOT NULL,
	"fields" jsonb NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"layer_of" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_layer_of_entries_id_fk" FOREIGN KEY ("layer_of") REFERENCES "public"."entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_created_at" ON "entries" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "entries_layer_of" ON "entries" USING btree ("layer_of");