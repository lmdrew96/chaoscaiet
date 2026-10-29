# ChaosCaiet

Project rules. The top-level CLAUDE.md still applies; where this file disagrees, this file wins for this repo.

## What this is
A **private, single-user personal journal** for Nae that looks and works like a 2015–2018 Tumblr dashboard, in ADHDesigns colors. Open it, click a post-type circle, type, post. Old entries come back ("On this day", "From the archive"), and she can add a layer to a past entry (reblog her past self).
- "Caiet" is Romanian for notebook. Spelling landmine: **ChaosCaiet** (no diacritics).
- Spec: "ChaosCaiet spec" (`claude/chaoscaiet-spec.md`) in Nae's Development Ideas claude.ai project. The ChaosPatch patches carry what each step needs.
- Mockups: https://claude.ai/artifact/3vRhaYUpkZvgY3CbsvYJjD — row 2 "2016 dash" (layout + palette), row 3 "Inline compose · desktop" (approved, interactive). Rows 1 and the blog theme are superseded.
- Tangle tag: `project:chaoscaiet`.

## Product rules (these are features, not polish)
- **Quiet days count.** A one-line entry is complete. Only the type's main field is required. No word counts, minimums or "write more" copy.
- **No guilt mechanics.** No streaks, no "you haven't written in X days", no reminders, no empty states that scold. If "On this day" has nothing, show nothing.
- **Never lose typed text.** Cancel/Esc asks first when there's text. Switching post types keeps text where fields overlap (body ↔ note ↔ caption, title ↔ link title).
- **Desktop-first, phone-friendly.** Nae journals on her laptop. Design and test at desktop width first; phone must work, not lead.
- **Evoke the era, don't copy it.** No Tumblr logo, exact colors, icon set or wording.

## Privacy (it's a diary)
- Every route requires sign-in. No public pages, no share links, no OG/preview images of entries.
- Nothing sends entry text off the app: **no MCP server, no in-app Claude API calls, no analytics, no third-party error tracking that captures request bodies.** (Overrides the top-level Claude-model default: there are no Claude calls here.)
- Link posts don't fetch or unfurl the linked site.
- Photos: private R2 bucket via the `PHOTOS` binding, never public. Every read goes through `/api/photos/[name]`, which checks the session (stricter than signed URLs, which work for anyone holding the link).

## Auth
Hand-rolled session auth, ported from personal-context-mcp / Tangle / Kindling `lib/auth.ts`. Port it; don't rewrite it. Single user.

## Look — style spec
Reference: the "2016 dash" and "Inline compose" artboards. This is the style spec the top-level "get a reference, write a style spec" rule asks for.
- **Fonts (overrides "brand fonts via adhdesigns-theme"):** era fonts, *not* the ADHDesigns arcade fonts. Body: Helvetica Neue / system sans. Text titles and Quote posts: Lora. Chat posts: Courier-style mono. No Kineks, no uppercase mono controls, no hard magenta shadows.
- **Colors:** ADHDesigns tokens (use the `adhdesigns-theme` skill for exact values; no hex in components). Ground `muted-indigo`; cards `bone`; text `indigo-void`; secondary text `muted-indigo-text`; hairlines `hairline` (Paper value) on cards; accent `sage-green` (Nae's pick — write button, post button, icon squares).
- **Post-type circles:** Text `indigo-void`, Photo `magenta`, Quote `caution-amber`, Link `dusty-cyan`, Chat `sage-green`. Bone icons on the two dark ones, indigo-void icons on the rest. Selected: ring + bold label + `aria-pressed`.
- **Shapes:** cards 6px radius, flat (no glass, no hard shadow). 64px square icon (4px radius) beside each card. 44px circles. Flat layer headers, not nested quotes.
- **Iconography:** Lucide, 2px stroke.
- **Motion:** minimal. Compose opening in place is the only transition worth having; respect reduced motion.
- **Theme toggle (resolves the top-level "dark by default" rule):** two themes, dark by default. Both approved by Nae (Oct 28); artboards side by side in row 3.
  - **Dark (default):** the approved dash — Muted Indigo ground, Bone cards, the token colors above.
  - **Light ("pastel"):** the same dash softened. These pastels are **not ADHDesigns tokens**, so define them once as ChaosCaiet theme tokens (CSS variables), never inline in components:

    | Role | Dark | Light (pastel) |
    |---|---|---|
    | ground | `muted-indigo` | `#d9d4ec` |
    | card | `bone` | `#fbf8f1` (+ `0 1px 2px rgba(20,15,34,0.08)` shadow) |
    | text | `indigo-void` | `indigo-void` |
    | secondary text | `muted-indigo-text` | `muted-indigo-text` |
    | header icons / rail text | `bone` | `indigo-void` |
    | hairline (on cards) | `rgba(20,15,34,0.14)` | `rgba(20,15,34,0.12)` |
    | accent (icon squares, post) | `sage-green` | `#c5dbcb` |
    | circle · Text | `indigo-void` (bone icon) | `#bdb5e0` |
    | circle · Photo | `magenta` (bone icon) | `#e9bfd3` |
    | circle · Quote | `caution-amber` | `#f7e48c` |
    | circle · Link | `dusty-cyan` | `#b3e2e1` |
    | circle · Chat | `sage-green` | `#c5dbcb` |
    | selected ring | `bone` gap + `indigo-void` | `#fbf8f1` gap + `indigo-void` |

    In light, every circle icon is `indigo-void`. Placeholder text on light cards: `#5e5687`.

## Data
- One `entries` table. `type` ∈ text | quote | chat | link | photo; per-type fields; `tags` (lowercased, **spaces allowed**: `nugget being a menace`); `layerOf` (nullable, another entry's id); `created_at` / `updated_at` in UTC.
- Layers: a layer is a new entry with `layerOf`. A chain = walk up `layerOf`; render flat, oldest first. Only the newest layer of a chain shows in the main feed. Watch for N+1 when rendering chains.
- "On this day" matches on the **local** month-day (Nae's timezone) against earlier years. "From the archive" = one random entry older than 30 days.
- **Export must stay lossless.** Any new field gets added to the Markdown export's front matter in the same change.

## Workers notes
- R2: prefer a native binding; if signing S3 requests, use `aws4fetch`, not `@aws-sdk/client-s3`.
- HEIC → JPEG in the browser before upload; the server rejects HEIC with a clear error.
