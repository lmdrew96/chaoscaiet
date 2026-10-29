"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { photoUrl, type Entry } from "@/lib/entry-fields";
import { entryMarkdown, entryPath, exportReadme } from "@/lib/export";
import { readJson } from "@/lib/read-json";

const PHOTO_FETCHES_AT_ONCE = 4;

/**
 * One click: every entry as Markdown plus its photos, zipped here in the
 * browser and downloaded. Nothing goes anywhere but this computer.
 */
export const ExportButton = (): React.ReactNode => {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (): Promise<void> => {
    setBusy(true);
    setStatus("gathering entries…");
    try {
      const res = await fetch("/api/export");
      const data = await readJson<{ error?: string; entries?: Entry[] }>(res);
      if (!res.ok || !data.entries) {
        setStatus(data.error ?? "Couldn't export. Try again.");
        return;
      }
      const { strToU8, zipSync } = await import("fflate");
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();
      const root = `chaoscaiet-export-${new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now)}`;
      const files: Record<string, [Uint8Array, { level?: 0; mtime: Date }]> = {};

      for (const entry of data.entries) {
        files[`${root}/${entryPath(entry, tz)}`] = [strToU8(entryMarkdown(entry)), { mtime: new Date(entry.updatedAt) }];
      }

      // Photos are already compressed, so they're stored as-is (level 0).
      const photos = data.entries.flatMap((e) => (e.type === "photo" ? [{ key: e.fields.key, mtime: new Date(e.createdAt) }] : []));
      const missing: string[] = [];
      let done = 0;
      for (let i = 0; i < photos.length; i += PHOTO_FETCHES_AT_ONCE) {
        setStatus(`photo ${Math.min(i + PHOTO_FETCHES_AT_ONCE, photos.length)} of ${photos.length}…`);
        await Promise.all(
          photos.slice(i, i + PHOTO_FETCHES_AT_ONCE).map(async ({ key, mtime }) => {
            try {
              const photo = await fetch(photoUrl(key));
              if (!photo.ok) throw new Error(`HTTP ${photo.status}`);
              files[`${root}/${key}`] = [new Uint8Array(await photo.arrayBuffer()), { level: 0, mtime }];
            } catch (err) {
              console.error("export: photo fetch failed", key, err);
              missing.push(key);
            } finally {
              done++;
            }
          }),
        );
      }

      files[`${root}/README.md`] = [strToU8(exportReadme(data.entries.length, now, missing)), { mtime: now }];
      setStatus("zipping…");
      const zipped = zipSync(files);

      const url = URL.createObjectURL(new Blob([zipped], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${root}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      const n = data.entries.length;
      setStatus(
        missing.length
          ? `exported ${n} entries. ${missing.length} of ${done} photos couldn't be included; README.md lists them.`
          : `exported ${n} ${n === 1 ? "entry" : "entries"}.`,
      );
    } catch (err) {
      console.error("export failed", err);
      setStatus("Couldn't export. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy}
        className="flex min-h-11 cursor-pointer items-center gap-1.5 self-start text-[13px] underline disabled:cursor-wait disabled:opacity-70"
      >
        <Download size={14} strokeWidth={2} aria-hidden="true" />
        {busy ? "exporting…" : "export everything (.zip)"}
      </button>
      {status && (
        <p role="status" className="m-0 text-xs">
          {status}
        </p>
      )}
    </div>
  );
};
