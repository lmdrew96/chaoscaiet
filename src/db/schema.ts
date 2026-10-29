import { sql } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import type { EntryFields } from "@/lib/entry-fields";

export const entryType = pgEnum("entry_type", ["text", "quote", "chat", "link", "photo"]);

/**
 * One table for every post type. `fields` holds the type's own fields
 * (see lib/entry-fields.ts); everything shared is a real column.
 */
export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: entryType("type").notNull(),
    fields: jsonb("fields").$type<EntryFields>().notNull(),
    // Lowercased, spaces allowed ("nugget being a menace").
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    // Restrict, not cascade or set null: deleting a past entry must never
    // silently eat or orphan the layers written on top of it.
    layerOf: uuid("layer_of").references((): AnyPgColumn => entries.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("entries_created_at").on(t.createdAt.desc()), index("entries_layer_of").on(t.layerOf)],
);
