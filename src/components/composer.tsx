"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { PostTypeBar } from "./post-type-bar";
import { readJson } from "@/lib/read-json";
import { validateEntry, type ChatLine, type ComposeType, type Entry, type EntryInput } from "@/lib/entry-fields";

/**
 * One draft shared by every type, so switching types never drops text.
 * Overlaps: title ↔ link title, body ↔ link note (↔ photo caption, later).
 * Quote and chat fields stay put while you're on another type.
 */
interface Draft {
  title: string;
  body: string;
  quote: string;
  source: string;
  url: string;
  lines: ChatLine[];
}

const blankLines = (): ChatLine[] => [
  { speaker: "", text: "" },
  { speaker: "", text: "" },
];

const emptyDraft = (): Draft => ({ title: "", body: "", quote: "", source: "", url: "", lines: blankLines() });

const draftFrom = (e: EntryInput): Draft => {
  const d = emptyDraft();
  switch (e.type) {
    case "text":
      return { ...d, title: e.fields.title ?? "", body: e.fields.body };
    case "quote":
      return { ...d, quote: e.fields.quote, source: e.fields.source ?? "" };
    case "chat":
      return { ...d, lines: e.fields.lines.length ? e.fields.lines : blankLines() };
    case "link":
      return { ...d, url: e.fields.url, title: e.fields.linkTitle ?? "", body: e.fields.note ?? "" };
  }
};

const payloadFor = (type: ComposeType, d: Draft): { type: ComposeType; fields: unknown } => {
  switch (type) {
    case "text":
      return { type, fields: { title: d.title, body: d.body } };
    case "quote":
      return { type, fields: { quote: d.quote, source: d.source } };
    case "chat":
      return { type, fields: { lines: d.lines } };
    case "link":
      return { type, fields: { url: d.url, linkTitle: d.title, note: d.body } };
  }
};

const hasText = (d: Draft): boolean =>
  [d.title, d.body, d.quote, d.source, d.url, ...d.lines.flatMap((l) => [l.speaker, l.text])].some((s) => s.trim());

const sameDraft = (a: Draft, b: Draft): boolean => JSON.stringify(a) === JSON.stringify(b);

const subscribeNever = (): (() => void) => () => {};
const isMac = (): boolean => /Mac|iPhone|iPad/.test(navigator.platform);

const SR = "sr-only";
const lineInput = "min-h-11 min-w-0 flex-auto border-0 border-b border-hairline bg-transparent";

export const Composer = ({
  editing,
  startOpen = false,
  onDone,
}: {
  /** Edit mode: the entry being changed. Without it, this is the dash's new-post editor. */
  editing?: Entry;
  startOpen?: boolean;
  /** Edit mode only: called with the saved entry, or nothing on cancel. */
  onDone?: (saved?: Entry) => void;
}): React.ReactNode => {
  const router = useRouter();
  // What "unchanged" means in edit mode. Fixed at mount, never set again.
  const [initialDraft] = useState<Draft>(() => (editing ? draftFrom(editing) : emptyDraft()));
  const [type, setType] = useState<ComposeType | null>(editing ? editing.type : startOpen ? "text" : null);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mainField = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const mac = useSyncExternalStore(subscribeNever, isMac, () => true);

  const dirty = editing ? !sameDraft(draft, initialDraft) : hasText(draft);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]): void => setDraft((d) => ({ ...d, [key]: value }));
  const setLine = (i: number, patch: Partial<ChatLine>): void =>
    setDraft((d) => ({ ...d, lines: d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));

  // Focus the type's main field whenever the editor opens or switches type.
  useEffect(() => {
    if (type) mainField.current?.focus();
  }, [type]);

  // The header's write button.
  useEffect(() => {
    if (editing) return;
    const open = (): void => {
      setType((t) => t ?? "text");
      root.current?.scrollIntoView({ block: "nearest" });
      mainField.current?.focus();
    };
    window.addEventListener("caiet:write", open);
    return () => window.removeEventListener("caiet:write", open);
  }, [editing]);

  // Leaving the page (reload, close tab) with unsaved text asks first.
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent): void => e.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  const close = useCallback((): void => {
    setConfirmDiscard(false);
    setError(null);
    if (editing) {
      onDone?.();
      return;
    }
    setDraft(emptyDraft());
    setType(null);
  }, [editing, onDone]);

  const requestCancel = (): void => {
    if (dirty) setConfirmDiscard(true);
    else close();
  };

  const submit = async (): Promise<void> => {
    if (!type || busy) return;
    const check = validateEntry(payloadFor(type, draft));
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(editing ? `/api/entries/${editing.id}` : "/api/entries", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(check.value),
      });
      const data = await readJson<{ error?: string; entry?: Entry }>(res);
      if (!res.ok || !data.entry) {
        setError(data.error ?? "Couldn't save that. Your text is still here; try again.");
        return;
      }
      if (editing) {
        onDone?.(data.entry);
      } else {
        setDraft(emptyDraft());
        setType(null);
      }
      router.refresh();
    } catch (err) {
      console.error("save entry failed", err);
      setError("Couldn't reach the server. Your text is still here; try again.");
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (confirmDiscard) setConfirmDiscard(false);
      else if (type) requestCancel();
    }
  };

  return (
    <div ref={root} onKeyDown={onKeyDown}>
      <PostTypeBar selected={type} onPick={(t) => setType(t)} />

      {type && (
        <div className="compose-open border-t border-hairline">
          <div className="px-5 pt-4 pb-1 text-xs tracking-[0.04em] text-ink-secondary">
            {editing ? `editing ${type} post` : `new ${type} post`}
          </div>

          {type === "text" && (
            <div className="compose-fields flex flex-col gap-1 px-3 pt-1 pb-2">
              <label className="flex">
                <span className={SR}>Title (optional)</span>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="title (optional)"
                  className="min-h-11 flex-auto border-0 bg-transparent font-serif text-[22px] font-semibold"
                />
              </label>
              <label className="flex">
                <span className={SR}>Entry</span>
                <textarea
                  ref={mainField}
                  rows={5}
                  value={draft.body}
                  onChange={(e) => set("body", e.target.value)}
                  placeholder="one line is enough."
                  className="flex-auto resize-y border-0 bg-transparent text-[15px] leading-relaxed"
                />
              </label>
            </div>
          )}

          {type === "quote" && (
            <div className="compose-fields flex flex-col gap-2 px-3 py-2">
              <label className="flex">
                <span className={SR}>Quote</span>
                <textarea
                  ref={mainField}
                  rows={3}
                  value={draft.quote}
                  onChange={(e) => set("quote", e.target.value)}
                  placeholder="“the line that stuck”"
                  className="flex-auto resize-y border-0 bg-transparent font-serif text-2xl leading-snug"
                />
              </label>
              <label className="flex">
                <span className={SR}>Source (optional)</span>
                <input
                  type="text"
                  value={draft.source}
                  onChange={(e) => set("source", e.target.value)}
                  placeholder="— source (optional)"
                  className="min-h-11 flex-auto border-0 border-b border-hairline bg-transparent text-sm"
                />
              </label>
            </div>
          )}

          {type === "link" && (
            <div className="compose-fields flex flex-col gap-2 px-3 py-2">
              <label className="flex">
                <span className={SR}>Link</span>
                <input
                  ref={mainField}
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  value={draft.url}
                  onChange={(e) => set("url", e.target.value)}
                  placeholder="paste a link"
                  className="min-h-11 flex-auto border-0 border-b border-hairline bg-transparent text-[15px]"
                />
              </label>
              <label className="flex">
                <span className={SR}>Link title (optional)</span>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="title (optional)"
                  className="min-h-11 flex-auto border-0 border-b border-hairline bg-transparent text-lg font-semibold"
                />
              </label>
              <label className="flex">
                <span className={SR}>Note (optional)</span>
                <textarea
                  rows={3}
                  value={draft.body}
                  onChange={(e) => set("body", e.target.value)}
                  placeholder="why you're keeping it (optional)"
                  className="flex-auto resize-y border-0 bg-transparent text-[15px] leading-relaxed"
                />
              </label>
            </div>
          )}

          {type === "chat" && (
            <div className="compose-fields flex flex-col gap-1.5 px-3 py-2 font-chat text-sm">
              {draft.lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <label className="flex w-[140px] shrink-0 max-sm:w-[96px]">
                    <span className={SR}>{`Speaker, line ${i + 1}`}</span>
                    <input
                      ref={i === 0 ? mainField : undefined}
                      type="text"
                      value={line.speaker}
                      onChange={(e) => setLine(i, { speaker: e.target.value })}
                      placeholder={i === 0 ? "me, 10pm:" : "me, 1am:"}
                      className={`${lineInput} font-bold`}
                    />
                  </label>
                  <label className="flex flex-auto">
                    <span className={SR}>{`Line ${i + 1}`}</span>
                    <input
                      type="text"
                      value={line.text}
                      onChange={(e) => setLine(i, { text: e.target.value })}
                      placeholder={i === 0 ? "going to bed early tonight" : "ok but hear me out"}
                      className={lineInput}
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set("lines", [...draft.lines, { speaker: "", text: "" }])}
                className="ml-2 min-h-11 cursor-pointer self-start font-sans text-[13px] underline"
              >
                + add a line
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="m-0 px-5 pb-2 text-sm">
              {error}
            </p>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline py-2.5 pr-3 pl-5">
            {confirmDiscard ? (
              <>
                <span className="text-sm" role="status">
                  {editing ? "discard your changes?" : "discard what you typed?"}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setConfirmDiscard(false)}
                    className="min-h-11 cursor-pointer rounded border border-[var(--control-border)] px-4 text-sm"
                  >
                    keep writing
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="min-h-11 cursor-pointer rounded bg-[var(--indigo-void)] px-4 text-sm font-semibold text-[var(--bone)]"
                  >
                    discard
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-xs text-ink-secondary max-sm:hidden">
                  {mac ? "⌘" : "ctrl"} + enter to {editing ? "save" : "post"} · esc to cancel
                </span>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={requestCancel}
                    className="min-h-11 cursor-pointer rounded border border-[var(--control-border)] px-4 text-sm"
                  >
                    cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={busy}
                    className="min-h-11 cursor-pointer rounded bg-accent px-[22px] text-sm font-semibold text-[var(--indigo-void)] disabled:opacity-60"
                  >
                    {busy ? "saving…" : editing ? "save" : "post"}
                  </button>
                </div>
              </>
            )}
          </footer>
        </div>
      )}
    </div>
  );
};
