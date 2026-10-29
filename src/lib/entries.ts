import "server-only";
import { and, arrayContains, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries } from "@/db/schema";
import type { Entry, EntryInput, PhotoFields } from "./entry-fields";
import { deletePhoto, photoExists } from "./photos";

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
 * Newest first, optionally only entries with `tag`. `before` is the createdAt
 * of the last entry on the previous page; `nextBefore` is null when there's
 * nothing older.
 */
export const listFeed = async ({
  before,
  tag,
}: { before?: Date; tag?: string } = {}): Promise<{ entries: Entry[]; nextBefore: string | null }> => {
  const rows = await db
    .select()
    .from(entries)
    .where(and(before ? lt(entries.createdAt, before) : undefined, tag ? arrayContains(entries.tags, [tag]) : undefined))
    .orderBy(desc(entries.createdAt))
    .limit(FEED_PAGE_SIZE + 1);
  const page = rows.slice(0, FEED_PAGE_SIZE).map(toEntry);
  return { entries: page, nextBefore: rows.length > FEED_PAGE_SIZE ? page[page.length - 1].createdAt : null };
};

export const createEntry = async (input: EntryInput): Promise<Entry> => {
  const [row] = await db
    .insert(entries)
    .values({ type: input.type, fields: input.fields, tags: input.tags })
    .returning();
  return toEntry(row);
};

/** Every tag with how many entries use it, most used first. Feeds the rail, the tags page and autocomplete. */
export const listTags = async (): Promise<{ tag: string; count: number }[]> => {
  const result = await db.execute<{ tag: string; count: number }>(
    sql`select t as tag, count(*)::int as count from ${entries}, unnest(${entries.tags}) as t group by t order by count desc, t`,
  );
  return result.rows;
};

const photoKeyOf = (e: { type: string; fields: unknown }): string | null =>
  e.type === "photo" ? (e.fields as PhotoFields).key : null;

export const MISSING_PHOTO = "That photo didn't finish uploading. Choose it again.";

/** True when a photo entry points at an object that isn't in the bucket. */
export const isMissingPhoto = async (input: EntryInput): Promise<boolean> =>
  input.type === "photo" && !(await photoExists(input.fields.key));

/**
 * Null when there's no such entry. A photo that the edit replaced (or dropped
 * by switching type) is deleted from the bucket afterwards.
 */
export const updateEntry = async (id: string, input: EntryInput): Promise<Entry | null> => {
  const [previous] = await db.select({ type: entries.type, fields: entries.fields }).from(entries).where(eq(entries.id, id));
  if (!previous) return null;
  const [row] = await db
    .update(entries)
    .set({ type: input.type, fields: input.fields, tags: input.tags, updatedAt: new Date() })
    .where(eq(entries.id, id))
    .returning();
  if (!row) return null;
  const oldKey = photoKeyOf(previous);
  if (oldKey && oldKey !== photoKeyOf(input)) await deletePhoto(oldKey);
  return toEntry(row);
};

/** Deleting a photo entry deletes its object too. */
export const deleteEntry = async (id: string): Promise<boolean> => {
  const [row] = await db.delete(entries).where(eq(entries.id, id)).returning({ type: entries.type, fields: entries.fields });
  if (!row) return false;
  const key = photoKeyOf(row);
  if (key) await deletePhoto(key);
  return true;
};

export const isUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
