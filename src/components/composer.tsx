"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { PostTypeBar } from "./post-type-bar";
import { readJson } from "@/lib/read-json";
import {
  MAX_PHOTO_BYTES,
  PHOTO_TYPES,
  photoUrl,
  validateEntry,
  type ChatLine,
  type Entry,
  type EntryInput,
  type EntryType,
} from "@/lib/entry-fields";

/**
 * One draft shared by every type, so switching types never drops text.
 * Overlaps: title ↔ link title, body ↔ link note ↔ photo caption.
 * Quote and chat fields stay put while you're on another type.
 */
interface Draft {
  title: string;
  body: string;
  quote: string;
  source: string;
  url: string;
  lines: ChatLine[];
  photo: DraftPhoto;
}

/** `key` once it's in the bucket; `file` while it's only been chosen. */
interface DraftPhoto {
  key: string | null;
  file: File | null;
  preview: string | null;
}

const blankLines = (): ChatLine[] => [
  { speaker: "", text: "" },
  { speaker: "", text: "" },
];

const noPhoto: DraftPhoto = { key: null, file: null, preview: null };

const emptyDraft = (): Draft => ({
  title: "",
  body: "",
  quote: "",
  source: "",
  url: "",
  lines: blankLines(),
  photo: noPhoto,
});

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
    case "photo":
      return { ...d, body: e.fields.caption ?? "", photo: { key: e.fields.key, file: null, preview: photoUrl(e.fields.key) } };
  }
};

const payloadFor = (type: EntryType, d: Draft): { type: EntryType; fields: unknown } => {
  switch (type) {
    case "text":
      return { type, fields: { title: d.title, body: d.body } };
    case "quote":
      return { type, fields: { quote: d.quote, source: d.source } };
    case "chat":
      return { type, fields: { lines: d.lines } };
    case "link":
      return { type, fields: { url: d.url, linkTitle: d.title, note: d.body } };
    case "photo":
      return { type, fields: { key: d.photo.key ?? "", caption: d.body } };
  }
};

const hasText = (d: Draft): boolean =>
  Boolean(d.photo.file || d.photo.key) ||
  [d.title, d.body, d.quote, d.source, d.url, ...d.lines.flatMap((l) => [l.speaker, l.text])].some((s) => s.trim());

const sameDraft = (a: Draft, b: Draft): boolean =>
  a.photo.file === b.photo.file &&
  JSON.stringify({ ...a, photo: a.photo.key }) === JSON.stringify({ ...b, photo: b.photo.key });

// Chrome often reports HEIC with an empty type, so the extension counts too.
const isHeicFile = (f: File): boolean => /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif";

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
  const [type, setType] = useState<EntryType | null>(editing ? editing.type : startOpen ? "text" : null);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mainField = useRef<HTMLInputElement & HTMLTextAreaElement & HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [converting, setConverting] = useState(false);
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

  // Previews of chosen files are object URLs; free each one when it's replaced.
  const preview = draft.photo.file ? draft.photo.preview : null;
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

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

  const choosePhoto = async (picked: File | undefined): Promise<void> => {
    if (!picked) return;
    setError(null);
    let file = picked;
    if (isHeicFile(picked)) {
      setConverting(true);
      try {
        // Loaded only when needed: the converter is large.
        const { heicTo } = await import("heic-to");
        const jpeg = await heicTo({ blob: picked, type: "image/jpeg", quality: 0.9 });
        file = new File([jpeg], picked.name.replace(/\.hei[cf]$/i, "") + ".jpg", { type: "image/jpeg" });
      } catch (err) {
        console.error("HEIC conversion failed", err);
        setError("Couldn't convert that HEIC photo. Try exporting it as a JPEG first.");
        return;
      } finally {
        setConverting(false);
      }
    }
    if (!PHOTO_TYPES[file.type]) {
      setError("That isn't a photo ChaosCaiet can keep (JPEG, PNG, WebP, GIF or HEIC).");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("That photo is over 10 MB.");
      return;
    }
    set("photo", { key: null, file, preview: URL.createObjectURL(file) });
  };

  /** Uploads a chosen photo, once. A failed post keeps the key, so a retry doesn't upload again. */
  const uploadPhoto = async (d: Draft): Promise<Draft | null> => {
    if (!d.photo.file || d.photo.key) return d;
    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": d.photo.file.type },
      body: d.photo.file,
    });
    const data = await readJson<{ error?: string; key?: string }>(res);
    if (!res.ok || !data.key) {
      setError(data.error ?? "Couldn't upload that photo. Try again.");
      return null;
    }
    const next = { ...d, photo: { ...d.photo, key: data.key } };
    setDraft(next);
    return next;
  };

  const requestCancel = (): void => {
    if (dirty) setConfirmDiscard(true);
    else close();
  };

  const submit = async (): Promise<void> => {
    if (!type || busy || converting) return;
    if (type === "photo" && !draft.photo.file && !draft.photo.key) {
      setError("Choose a photo first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ready = type === "photo" ? await uploadPhoto(draft) : draft;
      if (!ready) return;
      const check = validateEntry(payloadFor(type, ready));
      if (!check.ok) {
        setError(check.error);
        return;
      }
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

          {type === "photo" && (
            <div
              className="compose-fields flex flex-col gap-2.5 px-3 py-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void choosePhoto(e.dataTransfer.files[0]);
              }}
            >
              <input
                ref={fileInput}
                type="file"
                accept={PHOTO_ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  void choosePhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {draft.photo.preview ? (
                <div className="relative mx-2">
                  {/* Plain img: photos sit behind the session route, which next/image's optimizer can't reach. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={draft.photo.preview}
                    alt="The photo you chose"
                    className="block max-h-[480px] w-full rounded bg-[var(--hairline)] object-contain"
                  />
                  <button
                    ref={mainField}
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="absolute right-2 bottom-2 min-h-11 cursor-pointer rounded bg-card px-4 text-sm"
                  >
                    {converting ? "converting…" : "change photo"}
                  </button>
                </div>
              ) : (
                <button
                  ref={mainField}
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={converting}
                  className="mx-2 flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-[var(--text-secondary)] bg-[var(--hairline)] text-sm text-ink-secondary"
                >
                  <Upload size={28} strokeWidth={2} aria-hidden="true" />
                  {converting ? "converting your photo…" : "drop a photo here, or click to choose"}
                </button>
              )}
              <label className="flex">
                <span className={SR}>Caption (optional)</span>
                <input
                  type="text"
                  value={draft.body}
                  onChange={(e) => set("body", e.target.value)}
                  placeholder="caption (optional)"
                  className="min-h-11 flex-auto border-0 border-b border-hairline bg-transparent text-[15px] pointer-coarse:text-base"
                />
              </label>
            </div>
          )}

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
                  className="flex-auto resize-y border-0 bg-transparent text-[15px] leading-relaxed pointer-coarse:text-base"
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
                  className="min-h-11 flex-auto border-0 border-b border-hairline bg-transparent text-sm pointer-coarse:text-base"
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
                  className="min-h-11 flex-auto border-0 border-b border-hairline bg-transparent text-[15px] pointer-coarse:text-base"
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
                  className="flex-auto resize-y border-0 bg-transparent text-[15px] leading-relaxed pointer-coarse:text-base"
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

          {editing?.type === "photo" && type !== "photo" && (
            <p className="m-0 px-5 pb-2 text-sm">Saving this as a {type} post removes the photo.</p>
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
