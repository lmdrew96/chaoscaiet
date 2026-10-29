/**
 * The Markdown export's file format. Runs in the browser (see export-button.tsx).
 *
 * Lossless: front matter holds every field, and the body is the entry's main
 * markdown field verbatim. Any new entry field must be added here in the same change.
 */
import type { Entry } from "./entry-fields";

/** A YAML double-quoted scalar. JSON's escapes are valid YAML; U+2028/9 would read as line breaks. */
const q = (s: string): string => JSON.stringify(s).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

/** Local "YYYY-MM-DD-HHmm" in `tz`, for file names that sort by when they were written. */
const stamp = (iso: string, tz: string): string => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}-${p.hour}${p.minute}`;
};

/** "entries/2025-10-28-2114-text-1a2b3c4d.md": dated, typed, and unique by id. */
export const entryPath = (entry: Entry, tz: string): string =>
  `entries/${stamp(entry.createdAt, tz)}-${entry.type}-${entry.id.slice(0, 8)}.md`;

export const entryMarkdown = (entry: Entry): string => {
  const fm = [
    `id: ${q(entry.id)}`,
    `type: ${q(entry.type)}`,
    `createdAt: ${q(entry.createdAt)}`,
    `updatedAt: ${q(entry.updatedAt)}`,
    `layerOf: ${entry.layerOf ? q(entry.layerOf) : "null"}`,
    `tags: [${entry.tags.map(q).join(", ")}]`,
  ];
  let body: string;
  switch (entry.type) {
    case "text":
      if (entry.fields.title) fm.push(`title: ${q(entry.fields.title)}`);
      body = entry.fields.body;
      break;
    case "quote":
      if (entry.fields.source) fm.push(`source: ${q(entry.fields.source)}`);
      body = entry.fields.quote;
      break;
    case "link":
      fm.push(`url: ${q(entry.fields.url)}`);
      if (entry.fields.linkTitle) fm.push(`linkTitle: ${q(entry.fields.linkTitle)}`);
      body = entry.fields.note ?? "";
      break;
    case "photo":
      // The key ("photos/{uuid}.jpg") is also the photo's path in the zip.
      fm.push(`photo: ${q(`../${entry.fields.key}`)}`);
      body = entry.fields.caption ?? "";
      break;
    case "chat":
      // The lines in front matter are the record; the body is just for reading.
      fm.push(
        "lines:",
        ...entry.fields.lines.flatMap((l) => [`  - speaker: ${q(l.speaker)}`, `    text: ${q(l.text)}`]),
      );
      body = entry.fields.lines.map((l) => (l.speaker ? `**${l.speaker}** ${l.text}` : l.text)).join("\n\n");
      break;
  }
  return `---\n${fm.join("\n")}\n---\n\n${body}\n`;
};

export const exportReadme = (count: number, exportedAt: Date, missingPhotos: string[]): string =>
  [
    "# ChaosCaiet export",
    "",
    `${count} ${count === 1 ? "entry" : "entries"}, exported ${exportedAt.toISOString()}.`,
    "",
    "- `entries/`: one Markdown file per entry, named by the local date and time it was written.",
    "- `photos/`: the photos from photo entries, as uploaded.",
    "",
    "## Format",
    "",
    "Each file starts with YAML front matter: `id`, `type` (text, quote, chat, link or photo), `createdAt` and `updatedAt` (UTC), `layerOf` (the `id` of the entry this one is a layer on, or null) and `tags`. The rest depends on the type:",
    "",
    "- **text:** `title` if it has one; the body is the text.",
    "- **quote:** `source` if it has one; the body is the quote.",
    "- **link:** `url` and `linkTitle`; the body is the note.",
    "- **photo:** `photo`, the image's path from the entry file; the body is the caption.",
    "- **chat:** `lines`, each a `speaker` and `text`; the body repeats them for reading.",
    "",
    "A chain of layers is the entries linked by `layerOf`, oldest first.",
    ...(missingPhotos.length
      ? ["", "## Photos that couldn't be included", "", ...missingPhotos.map((p) => `- \`${p}\``)]
      : []),
    "",
  ].join("\n");
