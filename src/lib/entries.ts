import "server-only";
import { and, arrayContains, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
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

/** An entry plus the chain under it: what it's layered on, oldest first. Empty when it's not a layer. */
export interface FeedItem {
  entry: Entry;
  ancestors: Entry[];
}

// Chains are only ever extended by creating a new entry on an existing one, so
// they can't loop; the cap is a seatbelt, not a limit anyone will reach.
const MAX_CHAIN = 500;

/** Ids up each chain from `ids` (excluding the starting ids), with which start each belongs to and how far down. */
const chainRows = async (ids: string[]): Promise<{ id: string; leaf: string; depth: number }[]> => {
  if (ids.length === 0) return [];
  const result = await db.execute<{ id: string; leaf: string; depth: number }>(sql`
    with recursive chain(id, leaf, parent, depth) as (
      select id, id, layer_of, 0 from ${entries} where ${inArray(entries.id, ids)}
      union all
      select e.id, c.leaf, e.layer_of, c.depth + 1
      from entries e join chain c on e.id = c.parent
      where c.depth < ${MAX_CHAIN}
    )
    select id, leaf, depth from chain where depth > 0`);
  return result.rows;
};

/** The chains for a page of entries, in two queries however many layers there are. */
const withAncestors = async (page: Entry[]): Promise<FeedItem[]> => {
  const links = await chainRows(page.filter((e) => e.layerOf).map((e) => e.id));
  const ancestorIds = [...new Set(links.map((l) => l.id))];
  const byId = new Map(
    ancestorIds.length ? (await db.select().from(entries).where(inArray(entries.id, ancestorIds))).map((r) => [r.id, toEntry(r)]) : [],
  );
  return page.map((entry) => ({
    entry,
    ancestors: links
      .filter((l) => l.leaf === entry.id)
      .sort((a, b) => b.depth - a.depth) // deepest = oldest, first
      .map((l) => byId.get(l.id))
      .filter((e): e is Entry => Boolean(e)),
  }));
};

/** Entries nothing is layered on. The main feed shows a chain once, at its newest layer. */
const hasNoLayers = sql`not exists (select 1 from entries as c where c.layer_of = ${entries.id})`;

/**
 * Newest first, each with its chain. The main feed shows only the newest
 * layer of each chain; a tag page shows every entry with the tag. `before` is
 * the createdAt of the last entry on the previous page; `nextBefore` is null
 * when there's nothing older.
 */
export const listFeed = async ({
  before,
  tag,
}: { before?: Date; tag?: string } = {}): Promise<{ items: FeedItem[]; nextBefore: string | null }> => {
  const rows = await db
    .select()
    .from(entries)
    .where(
      and(
        before ? lt(entries.createdAt, before) : undefined,
        tag ? arrayContains(entries.tags, [tag]) : hasNoLayers,
      ),
    )
    .orderBy(desc(entries.createdAt))
    .limit(FEED_PAGE_SIZE + 1);
  const page = rows.slice(0, FEED_PAGE_SIZE).map(toEntry);
  return {
    items: await withAncestors(page),
    nextBefore: rows.length > FEED_PAGE_SIZE ? page[page.length - 1].createdAt : null,
  };
};

export const entryExists = async (id: string): Promise<boolean> =>
  (await db.select({ id: entries.id }).from(entries).where(eq(entries.id, id))).length > 0;

export const createEntry = async (input: EntryInput, layerOf?: string): Promise<Entry> => {
  const [row] = await db
    .insert(entries)
    .values({ type: input.type, fields: input.fields, tags: input.tags, layerOf: layerOf ?? null })
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

/**
 * "one": removes just this entry. Anything layered on it re-points to what it
 * was layered on, so the rest of the chain stays whole.
 * "thread": removes this entry and everything under it in its chain. Any other
 * layer built on a removed entry becomes the start of its own chain.
 * Photo objects of removed entries are deleted too. False when there's no such entry.
 */
export const deleteEntry = async (id: string, scope: "one" | "thread" = "one"): Promise<boolean> => {
  const [target] = await db.select({ layerOf: entries.layerOf }).from(entries).where(eq(entries.id, id));
  if (!target) return false;

  const ids = scope === "thread" ? [id, ...(await chainRows([id])).map((l) => l.id)] : [id];
  // Re-point first, then delete, in one transaction: layer_of is ON DELETE RESTRICT.
  const [, removed] = await db.batch([
    scope === "one"
      ? db.update(entries).set({ layerOf: target.layerOf }).where(eq(entries.layerOf, id))
      : db
          .update(entries)
          .set({ layerOf: null })
          .where(or(inArray(entries.id, ids), inArray(entries.layerOf, ids))),
    db.delete(entries).where(inArray(entries.id, ids)).returning({ type: entries.type, fields: entries.fields }),
  ]);

  for (const row of removed) {
    const key = photoKeyOf(row);
    if (key) await deletePhoto(key);
  }
  return true;
};

export const isUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
