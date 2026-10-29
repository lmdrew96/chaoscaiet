import { PenLine } from "lucide-react";
import { Composer } from "@/components/composer";
import { Feed, FeedCard, feedCardKey, parseBefore } from "@/components/feed";
import { Columns } from "@/components/rail";
import { listFeed, listOnThisDay, listTags, randomArchiveEntry } from "@/lib/entries";
import { formatDay, ownerTimeZone } from "@/lib/time";

const DashPage = async ({ searchParams }: PageProps<"/">): Promise<React.ReactNode> => {
  const sp = await searchParams;
  const before = parseBefore(sp.before);
  const tz = await ownerTimeZone();
  const [{ items, nextBefore }, tags, onThisDay, archived] = await Promise.all([
    listFeed({ before }),
    listTags(),
    // On this day sits at the top of the newest page only.
    before ? [] : listOnThisDay(tz),
    randomArchiveEntry(),
  ]);
  const knownTags = tags.map((t) => t.tag);
  // A highlighted entry isn't shown a second time further down.
  const highlighted = new Set(onThisDay.map((i) => i.entry.id));
  const feedItems = items.filter((i) => !highlighted.has(i.entry.id));

  return (
    <Columns tags={tags} archive={archived && { entry: archived, day: formatDay(archived.createdAt, tz) }}>
      <div className="flex items-start gap-4">
        <div className="side-square max-sm:hidden" aria-hidden="true">
          <PenLine size={28} strokeWidth={2} />
        </div>
        <div className="card min-w-0 flex-auto">
          <Composer startOpen={sp.write !== undefined} knownTags={knownTags} />
        </div>
      </div>
      {/* Nothing from this day in earlier years means nothing here. */}
      {onThisDay.map(({ yearsAgo, ...item }) => (
        <FeedCard
          key={`otd:${feedCardKey(item)}`}
          item={item}
          tz={tz}
          knownTags={knownTags}
          highlight={`on this day · ${yearsAgo === 1 ? "1 year" : `${yearsAgo} years`} ago`}
        />
      ))}
      <Feed items={feedItems} nextBefore={nextBefore} before={before} basePath="/" tz={tz} knownTags={knownTags} />
    </Columns>
  );
};

export default DashPage;
