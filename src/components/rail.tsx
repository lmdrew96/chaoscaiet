import Link from "next/link";
import { Lock } from "lucide-react";
import { ExportButton } from "./export-button";
import { Markdown } from "./markdown";
import { photoUrl, tagHref, type Entry } from "@/lib/entry-fields";

const RAIL_TAGS = 25;

const railHeading = "m-0 border-b border-hairline-ground pb-1.5 text-[13px] font-semibold tracking-[0.04em]";

/** A short look at an entry, sized for the rail. Long ones are cut off; the label opens the whole thing. */
const Preview = ({ entry }: { entry: Entry }): React.ReactNode => {
  switch (entry.type) {
    case "text":
      return (
        <>
          {entry.fields.title && <p className="m-0 font-serif text-base font-semibold">{entry.fields.title}</p>}
          <Markdown>{entry.fields.body}</Markdown>
        </>
      );
    case "quote":
      return <p className="m-0 font-serif text-lg leading-snug whitespace-pre-line">“{entry.fields.quote}”</p>;
    case "chat":
      return (
        <div className="font-chat text-[13px]">
          {entry.fields.lines.map((line, i) => (
            <p key={i} className="m-0">
              {line.speaker && <b>{line.speaker}</b>}
              {line.speaker && line.text ? " " : ""}
              {line.text}
            </p>
          ))}
        </div>
      );
    case "link":
      return (
        <>
          <p className="m-0 font-semibold break-all">{entry.fields.linkTitle ?? entry.fields.url}</p>
          {entry.fields.note && <Markdown>{entry.fields.note}</Markdown>}
        </>
      );
    case "photo":
      return (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(entry.fields.key)}
            alt={entry.fields.caption ? entry.fields.caption.slice(0, 200) : "A photo"}
            loading="lazy"
            className="block w-full rounded-[3px] bg-[var(--hairline)]"
          />
          {entry.fields.caption && <Markdown>{entry.fields.caption}</Markdown>}
        </>
      );
  }
};

/** One random older entry, a different one each visit. */
const FromTheArchive = ({ entry, day }: { entry: Entry; day: string }): React.ReactNode => (
  <section className="flex flex-col gap-2.5">
    <h2 className={railHeading}>From the archive</h2>
    <div className="card flex flex-col gap-1.5 px-4 py-3.5 text-sm leading-normal">
      <Link href={`/entry/${entry.id}`} className="flex min-h-6 items-center text-xs text-ink-secondary hover:underline">
        random entry · {day}
      </Link>
      <div className="flex max-h-48 flex-col gap-1.5 overflow-hidden [&_.md]:text-sm">
        <Preview entry={entry} />
      </div>
      <Link href={`/entry/${entry.id}?layer`} className="flex min-h-11 items-center self-start text-[13px] underline">
        add a layer
      </Link>
    </div>
  </section>
);

/** The right rail: from the archive (dash only), your tags (most used first) and the privacy line. Stacks under the feed when narrow. */
export const Rail = ({
  tags,
  archive,
}: {
  tags: { tag: string; count: number }[];
  archive?: { entry: Entry; day: string } | null;
}): React.ReactNode => (
  <aside className="flex max-w-[300px] flex-[1_1_260px] flex-col gap-6 text-on-ground">
    {archive && <FromTheArchive {...archive} />}
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
    <ExportButton />
  </aside>
);

/** Main column + rail, the dash's two-column layout. */
export const Columns = ({
  children,
  tags,
  archive,
}: {
  children: React.ReactNode;
  tags: { tag: string; count: number }[];
  archive?: { entry: Entry; day: string } | null;
}): React.ReactNode => (
  <div className="mx-auto flex max-w-[960px] flex-wrap items-start gap-8 px-4 pt-7 pb-12">
    <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">{children}</main>
    <Rail tags={tags} archive={archive} />
  </div>
);
