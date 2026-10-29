"use client";

import { useId, useState } from "react";
import { Hash, X } from "lucide-react";
import { normalizeTag } from "@/lib/entry-fields";

const MAX_SUGGESTIONS = 6;

/**
 * Tags are free text with spaces ("nugget being a menace"), so a comma or
 * Enter finishes one, not a space. Suggestions come from tags already used.
 * Whatever is still typed in the box counts as a tag when the entry posts.
 */
export const TagInput = ({
  tags,
  text,
  known,
  onTags,
  onText,
}: {
  tags: string[];
  text: string;
  /** Existing tags, most used first. */
  known: string[];
  onTags: (tags: string[]) => void;
  onText: (text: string) => void;
}): React.ReactNode => {
  const listId = useId();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const query = normalizeTag(text);
  const suggestions = query
    ? known
        .filter((t) => t.includes(query) && !tags.includes(t))
        .sort((a, b) => Number(!a.startsWith(query)) - Number(!b.startsWith(query)))
        .slice(0, MAX_SUGGESTIONS)
    : [];
  const showList = open && suggestions.length > 0;

  const add = (raw: string): void => {
    const tag = normalizeTag(raw);
    if (tag && !tags.includes(tag)) onTags([...tags, tag]);
    onText("");
    setActive(0);
  };

  const onChange = (value: string): void => {
    // Typing or pasting a comma finishes every tag before it.
    if (value.includes(",")) {
      const parts = value.split(",");
      const done = parts.slice(0, -1).map(normalizeTag).filter((t) => t && !tags.includes(t));
      onTags([...tags, ...new Set(done)]);
      onText(parts[parts.length - 1].trimStart());
    } else {
      onText(value);
    }
    setActive(0);
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.metaKey || e.ctrlKey) return; // ⌘/ctrl+enter posts; let it through.
    if (e.key === "ArrowDown" && showList) {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && showList) {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showList) add(suggestions[active]);
      else if (query) add(text);
    } else if (e.key === "Escape" && showList) {
      // Close the list without cancelling the whole post.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "Backspace" && !text && tags.length) {
      onTags(tags.slice(0, -1));
    }
  };

  return (
    <div className="compose-fields relative mx-5 flex flex-wrap items-center gap-1.5 border-t border-hairline py-2.5 text-[13px] text-ink-secondary">
      <Hash size={14} strokeWidth={2} aria-hidden="true" />
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-0.5 rounded bg-[var(--hairline)] py-0.5 pl-2 text-ink">
          #{tag}
          <button
            type="button"
            onClick={() => onTags(tags.filter((t) => t !== tag))}
            aria-label={`Remove tag ${tag}`}
            className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded pointer-coarse:after:absolute pointer-coarse:after:-inset-2"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </span>
      ))}
      <label className="flex min-w-[10rem] flex-auto">
        <span className="sr-only">Tags</span>
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder={tags.length ? "another tag" : "add tags: quiet day, school, nugget being a menace"}
          className="min-h-10 flex-auto border-0 pointer-coarse:min-h-11 bg-transparent text-[13px] text-ink pointer-coarse:text-base"
        />
      </label>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="card absolute top-full left-0 z-10 m-0 mt-1 w-full max-w-sm list-none overflow-hidden border border-hairline p-1"
        >
          {suggestions.map((tag, i) => (
            <li
              key={tag}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: picking must land before the input's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                add(tag);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-11 cursor-pointer items-center rounded px-3 text-sm text-ink ${i === active ? "bg-[var(--hairline)]" : ""}`}
            >
              #{tag}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
