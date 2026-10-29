"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, Pencil, Repeat2, Trash2 } from "lucide-react";
import { Composer } from "./composer";
import { Markdown } from "./markdown";
import { TYPE_META } from "./post-type-bar";
import { readJson } from "@/lib/read-json";
import { photoUrl, tagHref, type Entry } from "@/lib/entry-fields";

const linkLabel = (url: string): string => {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname === "/" ? "" : u.pathname}`;
  } catch {
    return url;
  }
};

const Body = ({ entry }: { entry: Entry }): React.ReactNode => {
  switch (entry.type) {
    case "text":
      return (
        <div className="flex flex-col gap-2 px-5 pt-2 pb-3">
          {entry.fields.title && <h2 className="m-0 font-serif text-[22px] font-semibold">{entry.fields.title}</h2>}
          <Markdown>{entry.fields.body}</Markdown>
        </div>
      );
    case "quote":
      return (
        <figure className="m-0 flex flex-col gap-2.5 px-5 pt-2.5 pb-3.5">
          <blockquote className="m-0 font-serif text-2xl leading-snug whitespace-pre-line">
            “{entry.fields.quote}”
          </blockquote>
          {entry.fields.source && (
            <figcaption className="text-sm text-ink-secondary">— {entry.fields.source}</figcaption>
          )}
        </figure>
      );
    case "chat":
      return (
        <div className="flex flex-col gap-1 px-5 pt-2.5 pb-3.5 font-chat text-sm leading-relaxed">
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
        <div className="flex flex-col gap-2 px-5 pt-2 pb-3">
          {/* A plain link: nothing is fetched or unfurled. */}
          <a
            href={entry.fields.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold break-words underline pointer-coarse:flex pointer-coarse:min-h-11 pointer-coarse:items-center"
          >
            {entry.fields.linkTitle ?? linkLabel(entry.fields.url)}
          </a>
          {entry.fields.linkTitle && (
            <span className="text-[13px] break-all text-ink-secondary">{linkLabel(entry.fields.url)}</span>
          )}
          {entry.fields.note && <Markdown>{entry.fields.note}</Markdown>}
        </div>
      );
    case "photo":
      return (
        <div className="flex flex-col gap-3 pt-2 pb-3">
          {/* Plain img: photos sit behind the session route, which next/image's optimizer can't reach. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(entry.fields.key)}
            alt={entry.fields.caption ? entry.fields.caption.slice(0, 200) : "A photo"}
            loading="lazy"
            className="block w-full bg-[var(--hairline)]"
          />
          {entry.fields.caption && (
            <div className="px-5">
              <Markdown>{entry.fields.caption}</Markdown>
            </div>
          )}
        </div>
      );
  }
};

const iconButton =
  "flex h-11 w-11 cursor-pointer items-center justify-center rounded text-ink-secondary hover:bg-[var(--hairline)]";
const outlineButton = "min-h-11 cursor-pointer rounded border border-[var(--control-border)] px-4 text-sm";

/** One entry inside a layered card, under its own small header. */
const LayerSection = ({ entry, day, label }: { entry: Entry; day: string; label: string }): React.ReactNode => (
  <section className="border-t border-hairline">
    <div className="flex items-center gap-2 px-5 pt-3 text-[13px]">
      <span aria-hidden="true" className="h-[22px] w-[22px] shrink-0 rounded-[3px] bg-accent" />
      <b>{label}</b>
      <span className="text-ink-secondary">{day}</span>
    </div>
    <Body entry={entry} />
  </section>
);

const darkButton =
  "min-h-11 cursor-pointer rounded bg-[var(--indigo-void)] px-4 text-sm font-semibold text-[var(--bone)] disabled:opacity-60";

/**
 * One entry in the feed, with the square beside it. A layer shows its whole
 * chain flat, oldest first. Edit, delete and "add a layer" all happen in place.
 * `highlight` puts a sage band on top ("on this day · 1 year ago").
 */
export const EntryCard = ({
  entry: initial,
  when,
  day,
  ancestors,
  knownTags,
  highlight,
  startLayer = false,
  layeredHref,
}: {
  entry: Entry;
  /** "oct 28 · 9:14pm", for a card that isn't a layer. */
  when: string;
  /** "today" / "oct 28", for this entry's layer header. */
  day: string;
  /** What this entry is layered on, oldest first, each with its header day. */
  ancestors: { entry: Entry; day: string }[];
  knownTags: string[];
  highlight?: string;
  /** Open with the layer composer already showing. */
  startLayer?: boolean;
  /** Where to go once a layer is saved (the entry page sends you to the dash). */
  layeredHref?: string;
}): React.ReactNode => {
  const router = useRouter();
  // The saved copy shows right away; the feed's refresh then re-keys this card.
  const [entry, setEntry] = useState(initial);
  const [mode, setMode] = useState<"view" | "edit" | "layer" | "confirmDelete">(startLayer ? "layer" : "view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const Icon = TYPE_META[entry.type].icon;
  const layered = ancestors.length > 0;
  const count = ancestors.length + 1;

  const remove = async (scope: "one" | "thread"): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/entries/${entry.id}${scope === "thread" ? "?scope=thread" : ""}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await readJson<{ error?: string }>(res);
        setError(data.error ?? "Couldn't delete that. Try again.");
        return;
      }
      // Deleting only the newest layer leaves the rest of the chain: let the refresh show it.
      if (scope === "thread" || !layered) setGone(true);
      setMode("view");
      router.refresh();
    } catch (err) {
      console.error("delete entry failed", err);
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (gone) return null;

  return (
    <div className="flex items-start gap-4">
      <div className="side-square max-sm:hidden" aria-hidden="true">
        <Icon size={28} strokeWidth={2} />
      </div>
      <article className="card min-w-0 flex-auto">
        {highlight && (
          <div className="flex items-center gap-2 rounded-t-[6px] bg-accent px-5 py-2 text-[13px] font-semibold text-[var(--indigo-void)]">
            <History size={14} strokeWidth={2} aria-hidden="true" />
            {highlight}
          </div>
        )}
        {layered && (
          <div className="flex items-center gap-2 px-5 pt-3.5 pb-2.5 text-[13px]">
            <b>you</b>
            <Repeat2 size={14} strokeWidth={2} aria-hidden="true" className="text-ink-secondary" />
            <span className="text-ink-secondary">past you</span>
          </div>
        )}
        {ancestors.map((a) => (
          <LayerSection key={a.entry.id} entry={a.entry} day={a.day} label="past you" />
        ))}

        {mode === "edit" ? (
          <div className={layered ? "border-t border-hairline" : ""}>
            <Composer
              editing={entry}
              knownTags={knownTags}
              onDone={(saved) => {
                if (saved) setEntry(saved);
                setMode("view");
              }}
            />
          </div>
        ) : (
          <>
            {layered ? (
              <LayerSection entry={entry} day={day} label="you" />
            ) : (
              <>
                <div className="px-5 pt-3.5 pb-1 text-[13px]">
                  <b>you</b>
                </div>
                <Body entry={entry} />
              </>
            )}
            {entry.tags.length > 0 && (
              <ul className="m-0 flex list-none flex-wrap gap-x-2 px-5 pb-3 text-[13px]" aria-label="Tags">
                {entry.tags.map((tag) => (
                  <li key={tag}>
                    <Link
                      href={tagHref(tag)}
                      className="text-ink-secondary hover:underline pointer-coarse:flex pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:items-center"
                    >
                      #{tag}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {error && (
              <p role="alert" className="m-0 px-5 pb-2 text-sm">
                {error}
              </p>
            )}

            {mode === "layer" ? (
              <div className="border-t border-hairline">
                <Composer
                  layerOf={entry.id}
                  knownTags={knownTags}
                  onDone={(saved) => {
                    setMode("view");
                    if (saved && layeredHref) router.push(layeredHref);
                  }}
                />
              </div>
            ) : (
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline py-2 pr-3 pl-5 text-[13px]">
                {mode === "confirmDelete" ? (
                  <>
                    <span role="status">
                      {layered ? `delete just this layer, or all ${count}?` : "delete this entry? it can't be undone."}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" autoFocus onClick={() => setMode("view")} className={outlineButton}>
                        keep it
                      </button>
                      {layered && (
                        <button type="button" onClick={() => void remove("one")} disabled={busy} className={outlineButton}>
                          delete just this layer
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void remove(layered ? "thread" : "one")}
                        disabled={busy}
                        className={darkButton}
                      >
                        {busy ? "deleting…" : layered ? `delete all ${count}` : "delete"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {layered ? (
                      <span className="font-semibold">{count} layers</span>
                    ) : (
                      <time dateTime={entry.createdAt} className="text-ink-secondary">
                        {when}
                      </time>
                    )}
                    <div className="flex">
                      <button type="button" aria-label="Add a layer" onClick={() => setMode("layer")} className={iconButton}>
                        <Repeat2 size={20} strokeWidth={2} />
                      </button>
                      <button type="button" aria-label="Edit entry" onClick={() => setMode("edit")} className={iconButton}>
                        <Pencil size={20} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete entry"
                        onClick={() => setMode("confirmDelete")}
                        className={iconButton}
                      >
                        <Trash2 size={20} strokeWidth={2} />
                      </button>
                    </div>
                  </>
                )}
              </footer>
            )}
          </>
        )}
      </article>
    </div>
  );
};
