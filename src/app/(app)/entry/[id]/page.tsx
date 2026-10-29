import { notFound } from "next/navigation";
import { FeedCard, feedCardKey } from "@/components/feed";
import { Columns } from "@/components/rail";
import { getFeedItem, isUuid, listTags } from "@/lib/entries";
import { ownerTimeZone } from "@/lib/time";

/** One entry with its chain. "From the archive" links here; `?layer` opens the layer composer. */
const EntryPage = async ({ params, searchParams }: PageProps<"/entry/[id]">): Promise<React.ReactNode> => {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  const [item, tags, tz] = await Promise.all([getFeedItem(id), listTags(), ownerTimeZone()]);
  if (!item) notFound();

  return (
    <Columns tags={tags}>
      <FeedCard
        key={feedCardKey(item)}
        item={item}
        tz={tz}
        knownTags={tags.map((t) => t.tag)}
        startLayer={sp.layer !== undefined}
        layeredHref="/"
      />
    </Columns>
  );
};

export default EntryPage;
