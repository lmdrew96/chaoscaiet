# ChaosCaiet — spec draft (Oct 28, 2026; open questions answered the same day)

*Spec by Coru with Nae. Builder: Cody.*

Status: name chosen (Nae, Oct 28: **ChaosCaiet**). Kindling spark updated, not promoted (Nae will promote it herself). **Filed Oct 28:** ChaosPatch project `chaoscaiet` with the 8 patches below (Nae said go).

Mockups: Design canvas "Tumblr Journal Sketch" — https://claude.ai/artifact/3vRhaYUpkZvgY3CbsvYJjD. Row 2, **"2016 dash"** is the pick.

## What it is
A private personal journal that looks and works like a 2015–2018 Tumblr dashboard, in Nae's ADHDesigns colors. You open it, pick a post type, type, and post. Old entries come back to you, and you can reblog your past self with a new layer.

Name: "Caiet" is Romanian for notebook. It follows the ChaosLimbă / ChaosCitim pattern. A quick web search found no app called ChaosCaiet and no journal app called Caiet (not a trademark check).

## Why it exists
- **The spark kept stalling** because every round bolted the Tumblr look onto another app (Mythcast, a Color Factory preview mode). Tumblr's look came from its mechanics: post types, tags as commentary, reblog chains. A journal is a job those mechanics actually serve. *(Coru's read.)*
- **Nae is bad at handwritten journaling.** She used to journal in Pages because it was easy to open and type. That is the friction bar: opening the app = writing.
- **The ControlledChaos journal feature doesn't get used.** Nae forgets it's there because it isn't what she thinks of as ControlledChaos. A journal needs its own place with its own feeling, and the Tumblr look is that feeling.

## Decisions (Nae, Oct 28)
- A personal journal.
- **Private**, for sure.
- Era: **2015–2018 Tumblr**.
- Of the two looks sketched, she likes the **dash** best. The blog-theme view is not v1.
- Colors: **ADHDesigns palette** (Muted Indigo ground, Bone cards, Indigo-Void text). She picked a **sage** accent.
- Name: **ChaosCaiet**.
- **Desktop-first, phone-friendly.** Most journaling happens on her laptop; she's not big on typing on a phone.
- **All five post types in v1.**
- **Auth: hand-rolled** (same as personal-context-mcp, Tangle, Kindling).
- **No MCP server.** Add one later only if a reason comes up.
- **Leave the ControlledChaos journal feature as is.**

## Design rules
1. **Pages-level friction.** The post-type bar sits at the top of the dash. One tap to start writing, no setup, no required fields.
2. **It has to work on quiet days, not just loud ones.** A one-line entry is a complete entry. Ten tiny posts in an hour also feels natural.
3. **No guilt mechanics.** No streaks, no "you haven't written in X days," no word counts. *(Coru's recommendation; follows from rule 2.)*
4. **Payoff right away.** "On this day" and "from the archive" give something back every time the app opens (the LibraLex lesson: logging must pay off).
5. **Evoke the era, don't copy it.** Don't reuse Tumblr's exact colors, icons or logo. Era fonts and shapes, Nae's colors.

---

## 1. v1 scope

### The dash (home screen)
- **Top bar:** small "j" mark (placeholder until there's a logo), then icons for dash, on this day, tags, blog view (later), and a sage **write** button.
- **Post-type bar** at the top of the feed: Text · Photo · Quote · Link · Chat, as colored circles (Indigo-Void, Magenta, Caution Amber, Dusty Cyan, Sage).
- **Feed:** entries newest first, as Bone cards with a square icon beside each. Footer: tags, timestamp, and an **add a layer** button.
- **Right rail:** "From the archive" (one random older entry) and the tag list.
- "Private · only you can see this" stays visible somewhere on the screen.

### Post types
| Type | Fields | Notes |
|---|---|---|
| Text | `title?`, `body` (markdown) | The default. |
| Quote | `quote`, `source?` | Large serif quote. |
| Chat | `lines[]` of `{ speaker, text }` | Monospace, the era's chat look. Speakers are free text ("me, 1am"). |
| Link | `url`, `linkTitle?`, `note?` | No auto-unfurling in v1 (it would mean fetching other sites). |
| Photo | `image`, `caption?` | Needs storage; see Infra. |

All five ship in v1 (Nae). Photo is the only type that needs file storage.

### Tags
- Free text, lowercased, **spaces allowed** (`#nugget being a menace`). Tags were half the diary on Tumblr; they double as mood and threads.
- A tag page lists every entry with that tag.
- Autocomplete from existing tags in compose.

### Layers (reblog your past self)
- "Add a layer" on any entry opens compose with that entry quoted above.
- Saving creates a **new entry** with `layerOf: <entryId>`. The card renders the chain **flat, oldest first**, each layer under a small header ("past you · oct 28, 2025" / "you · today"), the 2016 style rather than nested quotes.
- The footer shows a layer count ("2 layers").
- Layers can stack on layers. The chain is the walk up `layerOf`.
- The original entry stays in its own place in the archive. Only the newest layer appears in the main feed, so a chain shows up once.

### On this day + From the archive
- **On this day:** entries from the same month and day in earlier years. Shown as a highlighted card at the top of the feed when there is one; nothing when there isn't (no empty state that feels like a scold).
- **From the archive:** one random entry older than 30 days, a different one each visit, with an "add a layer" link.

### Compose (desktop-first)
- **Inline, not a new page.** Clicking a post-type circle opens the editor right in the dash, above the feed. No modal, no navigation. **Nae approved the sketch (Oct 28):** "Inline compose · desktop" artboard, row 3 of the canvas (interactive).
- **The circle row is the editor's header.** The post-type bar on the dash and the editor are one card: the selected circle gets a ring, and its fields open underneath. Fields per type: Text (big optional title + body), Photo (drop zone + caption), Quote (large serif quote + source), Link (URL, optional title, note), Chat (speaker + line rows in mono, "+ add a line"). Then one tags row, then a footer with the shortcut hint, cancel, and a sage **post** button.
- Switching types keeps what's typed where fields overlap (body ↔ note ↔ caption, title ↔ link title). *(Coru's suggestion.)*
- **Keyboard:** Cmd/Ctrl+Enter posts. Esc cancels, and asks first if there's text. Cancel never loses text silently.
- **Phone-friendly, not phone-first:** on a narrow screen the same editor goes full-width. The "Compose · phone" artboard (row 1) shows the layout; its colors predate the palette and should follow the dash.

### Export (v1, not later)
- One-click **export of everything** as Markdown files (one per entry, front matter for type, tags, date and `layerOf`) plus photos, in a zip.
- *Why v1:* a journal you can't get out of is a trust problem, and trust is what sank ChaosLimbă. *(Coru's recommendation.)*

---

## 2. Data model (sketch)

```ts
type EntryType = "text" | "quote" | "chat" | "link" | "photo";

interface Entry {
  id: string;
  type: EntryType;
  fields: TextFields | QuoteFields | ChatFields | LinkFields | PhotoFields; // discriminated by type
  tags: string[];          // lowercased, spaces allowed
  layerOf?: string;        // id of the entry this one adds a layer to
  createdAt: string;       // ISO; drives "on this day"
  updatedAt: string;
}
```

- Single user (Nae). No other users, no sharing tables.
- Index entries by month-day for "on this day" and by tag for tag pages.

---

## 3. Look
- **Layout:** the "2016 dash" artboard. Rounded Bone cards (6px), square icons beside posts, slate-style ground in Muted Indigo.
- **Palette:** ADHDesigns tokens. Ground `muted-indigo`; cards `bone`; text `indigo-void`; secondary text `muted-indigo-text`; hairlines at the token's Paper value. Accent `sage-green` (Nae's pick), with Caution Amber, Dusty Cyan and Pink as theme options later.
- **Type:** era fonts, not the ADHDesigns arcade fonts. Helvetica Neue / system sans for body, Lora for quotes and text titles, Courier-style mono for chat. *(Coru's call: the brand fonts pull it toward ADHDesigns-the-brand and away from 2016. Nae can overrule.)*
- **Themes:** dark by default (the approved dash). **Light = "pastel"** (Nae approved, Oct 28): lavender ground `#d9d4ec`, pale bone cards `#fbf8f1`, Indigo-Void text, pastel circles (Text `#bdb5e0`, Photo `#e9bfd3`, Quote `#f7e48c`, Link `#b3e2e1`, Chat `#c5dbcb`), pastel sage accent `#c5dbcb`. Defined once as ChaosCaiet theme tokens. Artboard: "Light theme · pastel", row 3. Full table in the repo's CLAUDE.md.
- **Icons:** Lucide-style stroke icons.
- Touch targets ≥44px. Works at phone width (right rail stacks under the feed).

---

## 4. Stack + infra
Follows Cody's standing stack:
- **TypeScript, React, Next.js, Tailwind.**
- **Hosting: Cloudflare Workers** (every new project). Edge runtime limits apply: confirm Node built-ins and package support in Cloudflare's docs before relying on them.
- **Database: Neon Postgres.** Drizzle or raw SQL is Cody's call; state it in the first PR.
- **Auth: hand-rolled session auth** (Nae). PBKDF2 via Web Crypto, opaque session IDs in Upstash Redis behind an HttpOnly cookie. **Port `lib/auth.ts` from personal-context-mcp / Tangle / Kindling; don't rewrite it.** Every route requires sign-in; no public pages in v1.
- **Photos:** Cloudflare R2, private bucket through a native Worker binding; every read goes through a session-checked route instead of signed URLs (built Oct 28; a binding has no signing step, and a session check is stricter). HEIC converted to JPEG in the browser before upload.
- **No MCP server** in v1 (Nae).
- **No in-app Claude calls** in v1 (no AI features).

---

## 5. Out of scope for v1
- The blog-theme "read back" view (row 2, second artboard). Maybe later.
- Public posts, sharing, followers, likes, notes.
- Audio and video posts.
- Streaks, reminders, prompts that nag.
- Importing old Pages journals.
- AI features (summaries, mood analysis).
- An MCP server. Revisit only if Nae finds a reason.

---

## 6. Open questions
The first round was answered by Nae on Oct 28 (see Decisions), and the inline compose sketch is approved. Still open:
1. **Drizzle or raw SQL:** Cody's call.

---

## Suggested first patches (when Nae says go — ask before creating the project)
1. Scaffold ChaosCaiet: Next.js on Cloudflare Workers + Neon, port hand-rolled `lib/auth.ts`; empty dash renders in the palette.
2. Entries: Text, Quote, Chat, Link (create, edit, delete) + inline desktop compose + the feed.
3. Photo posts on R2.
4. Tags: compose field with autocomplete + tag pages.
5. Layers: add a layer, flat chain rendering, layer count.
6. On this day + From the archive.
7. Export to Markdown zip.
8. Phone-friendly pass (narrow layouts, full-width compose).
