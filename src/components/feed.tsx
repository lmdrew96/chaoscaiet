import Link from "next/link";
import { EntryCard } from "./entry-card";
import type { FeedItem } from "@/lib/entries";
import { formatDay, formatWhen } from "@/lib/time";

/** A page of entry cards with older/newer links. Shared by the dash and tag pages. */
export const Feed = ({
  items,
  nextBefore,
  before,
  basePath,
  tz,
  knownTags,
}: {
  items: FeedItem[];
  nextBefore: string | null;
  before?: Date;
  /** "/" or "/tagged/…": where the older/newer links point. */
  basePath: string;
  tz: string;
  knownTags: string[];
}): React.ReactNode => (
  <>
    {/* No entries means nothing here: no empty state, nothing that scolds. */}
    {items.map(({ entry, ancestors }) => (
      <EntryCard
        key={`${entry.id}:${entry.updatedAt}:${ancestors.length}`}
        entry={entry}
        when={formatWhen(entry.createdAt, tz)}
        day={formatDay(entry.createdAt, tz)}
        ancestors={ancestors.map((a) => ({ entry: a, day: formatDay(a.createdAt, tz) }))}
        knownTags={knownTags}
      />
    ))}

    {(nextBefore || before) && (
      <nav className="flex justify-between gap-4 pl-20 text-sm text-on-ground max-sm:pl-0" aria-label="Older and newer">
        {before ? (
          <Link href={basePath} className="flex min-h-11 items-center underline">
            back to newest
          </Link>
        ) : (
          <span />
        )}
        {nextBefore && (
          <Link href={`${basePath}?before=${encodeURIComponent(nextBefore)}`} className="flex min-h-11 items-center underline">
            older entries
          </Link>
        )}
      </nav>
    )}
  </>
);

/** The `before` search param as a Date, or undefined when absent or junk. */
export const parseBefore = (value: string | string[] | undefined): Date | undefined =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value) : undefined;
