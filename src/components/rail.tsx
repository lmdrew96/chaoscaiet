import Link from "next/link";
import { Lock } from "lucide-react";
import { tagHref } from "@/lib/entry-fields";

const RAIL_TAGS = 25;

const railHeading = "m-0 border-b border-hairline-ground pb-1.5 text-[13px] font-semibold tracking-[0.04em]";

/** The right rail: your tags (most used first) and the privacy line. Stacks under the feed when narrow. */
export const Rail = ({ tags }: { tags: { tag: string; count: number }[] }): React.ReactNode => (
  <aside className="flex max-w-[300px] flex-[1_1_260px] flex-col gap-6 text-on-ground">
    {tags.length > 0 && (
      <section className="flex flex-col gap-2.5">
        <h2 className={railHeading}>Your tags</h2>
        <ul className="m-0 flex list-none flex-col p-0 text-sm">
          {tags.slice(0, RAIL_TAGS).map(({ tag }) => (
            <li key={tag}>
              <Link href={tagHref(tag)} className="flex min-h-9 items-center hover:underline">
                #{tag}
              </Link>
            </li>
          ))}
        </ul>
        {tags.length > RAIL_TAGS && (
          <Link href="/tags" className="text-[13px] underline">
            all {tags.length} tags
          </Link>
        )}
      </section>
    )}
    <p className="m-0 flex items-center gap-1.5 text-xs">
      <Lock size={12} strokeWidth={2} aria-hidden="true" />
      private · only you can see this
    </p>
  </aside>
);

/** Main column + rail, the dash's two-column layout. */
export const Columns = ({
  children,
  tags,
}: {
  children: React.ReactNode;
  tags: { tag: string; count: number }[];
}): React.ReactNode => (
  <div className="mx-auto flex max-w-[960px] flex-wrap items-start gap-8 px-4 pt-7 pb-12">
    <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">{children}</main>
    <Rail tags={tags} />
  </div>
);
