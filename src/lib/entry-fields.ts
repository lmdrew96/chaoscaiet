/**
 * Per-type entry fields and the one validator both compose (client) and the
 * API (server) run, so they can never disagree about what's postable.
 *
 * Only each type's main field is required. A one-line entry is complete.
 */

export type EntryType = "text" | "quote" | "chat" | "link" | "photo";

/** The types compose can write today. Photo arrives with its own patch. */
export type ComposeType = Exclude<EntryType, "photo">;

export interface TextFields {
  title?: string;
  body: string; // markdown
}

export interface QuoteFields {
  quote: string;
  source?: string;
}

export interface ChatLine {
  speaker: string; // free text: "me, 1am:"
  text: string;
}

export interface ChatFields {
  lines: ChatLine[];
}

export interface LinkFields {
  url: string;
  linkTitle?: string;
  note?: string; // markdown
}

export type EntryFields = TextFields | QuoteFields | ChatFields | LinkFields;

export type EntryInput =
  | { type: "text"; fields: TextFields }
  | { type: "quote"; fields: QuoteFields }
  | { type: "chat"; fields: ChatFields }
  | { type: "link"; fields: LinkFields };

/** What the API sends and the feed renders. Timestamps are ISO strings in UTC. */
export type Entry = EntryInput & {
  id: string;
  tags: string[];
  layerOf: string | null;
  createdAt: string;
  updatedAt: string;
};

export const COMPOSE_TYPES: readonly ComposeType[] = ["text", "quote", "chat", "link"];

// Generous ceilings that only exist so one request can't be enormous.
const MAX_LONG = 100_000;
const MAX_SHORT = 1_000;
const MAX_URL = 2_000;
const MAX_CHAT_LINES = 200;

type Result = { ok: true; value: EntryInput } | { ok: false; error: string };

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Trimmed, or undefined when empty, so optional fields don't store "". */
const optional = (v: unknown): string | undefined => {
  const s = str(v).trim();
  return s ? s : undefined;
};

/**
 * "example.com/x" becomes "https://example.com/x". Only http(s) links are
 * kept: a javascript: or data: URL in a diary link would be a footgun.
 */
export const normalizeUrl = (raw: string): string | null => {
  const s = raw.trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

const tooLong = (value: string | undefined, max: number): boolean => (value?.length ?? 0) > max;

export const validateEntry = (raw: unknown): Result => {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Malformed entry." };
  const { type, fields } = raw as { type?: unknown; fields?: unknown };
  const f = (fields && typeof fields === "object" ? fields : {}) as Record<string, unknown>;

  switch (type) {
    case "text": {
      const body = str(f.body).trim();
      const title = optional(f.title);
      if (!body) return { ok: false, error: "Write something first. One line is enough." };
      if (tooLong(body, MAX_LONG) || tooLong(title, MAX_SHORT)) return { ok: false, error: "That's too long to save in one entry." };
      return { ok: true, value: { type, fields: { title, body } } };
    }
    case "quote": {
      const quote = str(f.quote).trim();
      const source = optional(f.source);
      if (!quote) return { ok: false, error: "Add the quote first." };
      if (tooLong(quote, MAX_LONG) || tooLong(source, MAX_SHORT)) return { ok: false, error: "That's too long to save in one entry." };
      return { ok: true, value: { type, fields: { quote, source } } };
    }
    case "chat": {
      const rawLines = Array.isArray(f.lines) ? f.lines : [];
      // Keep any line with something typed in it; drop only fully blank rows.
      const lines = rawLines
        .map((l) => ({ speaker: str((l as ChatLine)?.speaker).trim(), text: str((l as ChatLine)?.text).trim() }))
        .filter((l) => l.speaker || l.text);
      if (!lines.some((l) => l.text)) return { ok: false, error: "Add at least one line." };
      if (lines.length > MAX_CHAT_LINES || lines.some((l) => tooLong(l.text, MAX_LONG) || tooLong(l.speaker, MAX_SHORT))) {
        return { ok: false, error: "That's too long to save in one entry." };
      }
      return { ok: true, value: { type, fields: { lines } } };
    }
    case "link": {
      const url = normalizeUrl(str(f.url));
      const linkTitle = optional(f.linkTitle);
      const note = optional(f.note);
      if (!str(f.url).trim()) return { ok: false, error: "Paste a link first." };
      if (!url) return { ok: false, error: "That doesn't look like a web link." };
      if (tooLong(url, MAX_URL) || tooLong(linkTitle, MAX_SHORT) || tooLong(note, MAX_LONG)) {
        return { ok: false, error: "That's too long to save in one entry." };
      }
      return { ok: true, value: { type, fields: { url, linkTitle, note } } };
    }
    default:
      return { ok: false, error: "Unknown post type." };
  }
};
