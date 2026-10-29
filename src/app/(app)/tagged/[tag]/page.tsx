import { Hash } from "lucide-react";
import { Feed, parseBefore } from "@/components/feed";
import { Columns } from "@/components/rail";
import { listFeed, listTags } from "@/lib/entries";
import { normalizeTag, tagHref } from "@/lib/entry-fields";
import { ownerTimeZone } from "@/lib/time";

/** A still-encoded segment ("nugget%20being") decodes; a bare "%" in a tag ("100% done") is left alone. */
const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** Every entry with one tag, newest first. */
const TaggedPage = async ({ params, searchParams }: PageProps<"/tagged/[tag]">): Promise<React.ReactNode> => {
  const [{ tag: raw }, sp] = await Promise.all([params, searchParams]);
  const tag = normalizeTag(safeDecode(raw));
  const before = parseBefore(sp.before);
  const [{ items, nextBefore }, tags, tz] = await Promise.all([listFeed({ before, tag }), listTags(), ownerTimeZone()]);

  return (
    <Columns tags={tags}>
      <div className="flex items-center gap-4">
        <div className="side-square max-sm:hidden" aria-hidden="true">
          <Hash size={28} strokeWidth={2} />
        </div>
        <h1 className="m-0 min-w-0 font-serif text-[28px] font-semibold break-words text-on-ground">#{tag}</h1>
      </div>
      <Feed
        items={items}
        nextBefore={nextBefore}
        before={before}
        basePath={tagHref(tag)}
        tz={tz}
        knownTags={tags.map((t) => t.tag)}
      />
    </Columns>
  );
};

export default TaggedPage;
