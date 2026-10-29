import "server-only";
import { desc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { entries } from "@/db/schema";
import type { Entry, EntryInput } from "./entry-fields";

type Row = typeof entries.$inferSelect;

const toEntry = (row: Row): Entry =>
  ({
    id: row.id,
    type: row.type,
    fields: row.fields,
    tags: row.tags,
    layerOf: row.layerOf,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }) as Entry;

export const FEED_PAGE_SIZE = 30;

/**
 * Newest first. `before` is the createdAt of the last entry on the previous
 * page; `nextBefore` is null when there's nothing older.
 */
export const listFeed = async (before?: Date): Promise<{ entries: Entry[]; nextBefore: string | null }> => {
  const rows = await db
    .select()
    .from(entries)
    .where(before ? lt(entries.createdAt, before) : undefined)
    .orderBy(desc(entries.createdAt))
    .limit(FEED_PAGE_SIZE + 1);
  const page = rows.slice(0, FEED_PAGE_SIZE).map(toEntry);
  return { entries: page, nextBefore: rows.length > FEED_PAGE_SIZE ? page[page.length - 1].createdAt : null };
};

export const createEntry = async (input: EntryInput): Promise<Entry> => {
  const [row] = await db.insert(entries).values({ type: input.type, fields: input.fields }).returning();
  return toEntry(row);
};

/** Null when there's no such entry. Photo entries aren't editable here yet. */
export const updateEntry = async (id: string, input: EntryInput): Promise<Entry | null> => {
  const [row] = await db
    .update(entries)
    .set({ type: input.type, fields: input.fields, updatedAt: new Date() })
    .where(eq(entries.id, id))
    .returning();
  return row ? toEntry(row) : null;
};

export const deleteEntry = async (id: string): Promise<boolean> => {
  const rows = await db.delete(entries).where(eq(entries.id, id)).returning({ id: entries.id });
  return rows.length > 0;
};

export const isUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
