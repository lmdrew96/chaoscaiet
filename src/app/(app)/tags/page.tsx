import Link from "next/link";
import { Hash } from "lucide-react";
import { Columns } from "@/components/rail";
import { listTags } from "@/lib/entries";
import { tagHref } from "@/lib/entry-fields";

/** Every tag, A to Z. The rail shows the most used; this shows them all. */
const TagsPage = async (): Promise<React.ReactNode> => {
  const tags = await listTags();
  const byName = [...tags].sort((a, b) => a.tag.localeCompare(b.tag));

  return (
    <Columns tags={tags}>
      <div className="flex items-center gap-4">
        <div className="side-square max-sm:hidden" aria-hidden="true">
          <Hash size={28} strokeWidth={2} />
        </div>
        <h1 className="m-0 font-serif text-[28px] font-semibold text-on-ground">Your tags</h1>
      </div>
      {byName.length > 0 && (
        <ul className="card m-0 flex list-none flex-col p-2 sm:ml-20">
          {byName.map(({ tag, count }) => (
            <li key={tag}>
              <Link href={tagHref(tag)} className="flex min-h-11 items-center justify-between gap-4 rounded px-3 hover:bg-[var(--hairline)]">
                <span>#{tag}</span>
                <span className="text-[13px] text-ink-secondary">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Columns>
  );
};

export default TagsPage;
