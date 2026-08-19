# AgentState Dashboard — Design System v2

The dashboard and marketing site share **one** design-token system. This doc
is the canonical reference for downstream page work: token names, type/space
scale, primitive components, and the rules that keep every page visually
consistent.

Source of truth:
- **`src/styles/tokens.css`** — terminal TUI CSS variables (color/type/radius 0), plus legacy name aliases (`bg-panel` → card, `text-fg` → foreground). JetBrains Mono is the only loaded webfont.
- **`src/styles/global.css`** — imports `tokens.css`, the `@utility` spacing/padding helpers, TUI utilities (`tui-hash`, `tui-key`, `tui-window`), base `@layer`, and keyframe animations.

Both are imported transitively by every layout (`RootLayout` → `global.css` → `tokens.css`; `MarketingLayout` → `global.css` → `tokens.css`). You never need to import either stylesheet yourself in a page or component.

## Art direction

Dark-first terminal TUI: monospace type, square corners, GitHub-dark canvas (`#0d1117`), one green brand accent. No gradients, no drop shadows, no rounded chrome. Marketing pages read like a README in a terminal (`#` headings, `$` prompts, `[bracket]` links).

## Theme mechanism

`.dark` on `<html>` is the **only** mechanism that drives color. Both Tailwind's `dark:` variant (`@custom-variant dark (&:is(.dark *))`) and every token in `tokens.css` key off it.

- `theme-script.astro` (inline, pre-hydration, loaded by every layout) toggles `.dark` before paint and persists to `localStorage.theme`.
- `Providers` (`next-themes`) uses `attribute="class"` so the client island stays in sync with the same class and the same `localStorage` key post-hydration.
- `data-theme` / `data-mode` attributes are also set for convenience but are **cosmetic only** (they drive the sun/moon icon swap on `[data-theme-toggle]`). Never gate a color or component style on `data-theme` — use `dark:` or the tokens, which already flip with `.dark`.

If you add a new theme-aware style, use the `dark:` variant or reference a token — do not write your own `[data-theme="..."]` selector.

## Color tokens

Canonical names (defined in `tokens.css`, use these in new code):

| Token | Dark | Light | Use |
|---|---|---|---|
| `--color-base` / `bg-base` | `#0d1117` | `#f6f8fa` | App canvas |
| `--color-panel` / `bg-panel` | `#0d1117` | `#ffffff` | Cards, windows |
| `--color-panel2` / `bg-panel2` | `#161b22` | `#eaeef2` | Hover / elevated surface |
| `--color-edge` / `border-edge` | `#30363d` | `#d0d7de` | Primary borders |
| `--color-edge-soft` / `border-edge-soft` | `#30363d` | `#d0d7de` | Subtle borders (dividers) |
| `--color-fg` / `text-fg` | `#e6edf3` | `#1f2328` | Headings, strong text |
| `--color-fg-2` / `text-fg-2` | `#e6edf3` | `#1f2328` | Body text |
| `--color-fg-3` / `text-fg-3` | `#8b949e` | `#656d76` | Muted text |
| `--color-fg-4` / `text-fg-4` | `#8b949e` | `#656d76` | Faint text, placeholders |
| `--color-accent` / `*-accent` | `#3fb950` | `#1a7f37` | **The one brand accent** — terminal green. Primary buttons, links, active nav, focus rings |
| `--color-accent-fg` | `#0d1117` | `#f6f8fa` | Text/icon on a solid accent fill |
| `--color-pos` / `*-pos` | `#3fb950` | `#1a7f37` | Positive / live status |
| `--color-warn` / `*-warn` | `#d29922` | `#9a6700` | Warning / rate-limited status |
| `--color-neg` / `*-neg` | `#f85149` | `#cf222e` | Negative / error / destructive |

**Preset tokens win.** shadcn names (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `border-border`) are canonical. Legacy names (`bg-panel`, `text-fg`, `border-edge`, `bg-accent`) alias onto those variables so existing markup keeps compiling. New code should use the preset names.

Never hardcode a hex color in a component. If you need a color not covered above (e.g. a third chart series), add a new named token to `tokens.css`/`global.css` with both light and dark values — don't inline a literal.

## Type

JetBrains Mono Variable is loaded via `@fontsource-variable/jetbrains-mono` in `tokens.css`. Sans, heading, display, and mono tokens all point at the same family.

| Token | Family | Use |
|---|---|---|
| `font-heading` / `font-display` | JetBrains Mono Variable | `h1`–`h5` (applied automatically by the base layer) |
| `font-sans` (`--font-sans`, default body font) | JetBrains Mono Variable | Body copy, UI labels, buttons, tab labels |
| `font-mono` (`--font-mono`) | JetBrains Mono Variable | Data values, IDs, timestamps, table headers, badges, code |

Headings get `font-family: var(--font-display)`, `font-weight: 500`, `letter-spacing: 0`, `line-height: 1.35`, `text-wrap: balance` automatically from the base layer — just use `<h1>`–`<h5>`. Marketing headings prefix with `#` / `##` via `.tui-hash`. Radius is `0` everywhere.

Mono utility shortcuts (defined in `global.css`, prefer these over raw `font-mono text-[11px] uppercase tracking-...`):
- `as-label` / `as-label-sm` / `as-label-xs` — uppercase mono eyebrow labels (section headers, group labels)
- `as-mono` / `as-mono-sm` / `as-mono-xs` — tabular-nums mono for data values

Numeric data outside those utilities should still get `.num` (or Tailwind's `tabular-nums`) so columns of numbers align.

## Spacing & layout

Use the semantic scale utilities from `global.css` — never ad-hoc `gap-4`/`p-6`/`mt-6` for these standard rhythms:

| Utility | Value | Use |
|---|---|---|
| `space-y-section` | 24px | Vertical rhythm between major page sections |
| `space-y-component` | 16px | Between components within a section |
| `space-y-element` | 12px | Between closely related elements |
| `space-y-tight` | 8px | Tightest grouping (e.g. label + input) |
| `gap-section` / `gap-component` / `gap-element` / `gap-tight` | 24/16/12/8px | Flex/grid equivalents of the above |
| `page-padding` / `page-padding-sm` | 16px→24px / 12px→20px responsive | Horizontal page gutters |
| `card-padding` / `card-padding-sm` | 24px / 16px | Card interior padding |
| `section-padding` / `section-padding-sm` | 28px / 20px vertical | Section top/bottom padding |

Other helpers: `dot-grid` (dotted background texture), `fade-up` (entrance animation), `[data-reveal]` + `RevealScript` (scroll-triggered fade/slide-up, respects `prefers-reduced-motion`).

## Radius & elevation

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Small controls (checkboxes, tight chips) |
| `--radius` | 9px | Default — buttons, inputs, cards, badges' square corners |
| `--radius-lg` | 12px | `Card` |
| `--radius-xl` | 14px | `Dialog` content |

Use `rounded-[var(--radius)]` etc. rather than Tailwind's generic `rounded-md`/`rounded-lg` scale, so radius stays token-driven.

Elevation is minimal: no box-shadow anywhere except `Dialog` (`shadow-xl`) and the mobile drawer overlay. Depth comes from the panel/panel2 surface steps and borders, not shadows.

## Primitive components (`src/components/ui/`)

Prop APIs are stable — do not rename variants or props when redesigning a page.

- **`Button`** (`.tsx` + `.astro`) — `variant`: `primary` | `secondary` | `ghost` | `danger`. `size` (`.tsx` only): `sm` | `md` | `lg` | `icon`. `.astro` also accepts `href` to render as `<a>`.
- **`Card`** (`.tsx` + `.astro`) — no variants, just a bordered `bg-panel` surface. Pair with `card-padding`/`card-padding-sm`.
- **`Badge`** (`.tsx` + `.astro`) — `tone`: `default` | `live` | `warn` | `idle`. `dot` boolean for a status dot.
- **`Input` / `Textarea` / `Label` / `Select`** (`.tsx`) — all accept `label`, `description`, `error`, `mono`.
- **`Dialog`** family (`.tsx`) — `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`.
- **`Table`** family (`.tsx`) — `Table`, `TableHeader`, `TableBody`, `TableRow` (`clickable`), `TableHead` (`align`), `TableCell` (`align`, `mono`), `TableCaption`, `TableSkeleton`.
- **`Toggle` / `Switch`** (`.tsx`) — `Toggle` variants `default` | `outline` | `ghost`, sizes `sm` | `md` | `lg`. `Switch` is a separate boolean control with `label`/`description`.
- **`Markdown`** (`.tsx`) — renders GFM markdown styled with these tokens; no typography plugin.

## Shared layout shell

- **`AppShell`** (`app-shell.tsx`) — the dashboard sidebar/header/mobile-drawer chrome, auth gate, and project-scope switcher. Renders as a `client:only` React island from `DashboardLayout`.
- **`PageHeader`** (`components/dashboard/page-header.tsx`) — standard `title` + `description` + `actions` header. Use on every dashboard page instead of hand-rolling an `<h1>` block.
- **Layouts**: `MarketingLayout.astro` (marketing/docs/brand — full standalone `<html>`, top nav + footer), `RootLayout.astro` (bare `<html>` + Clerk-ready `<body>`, used by `DashboardLayout`), `DashboardLayout.astro` (thin wrapper around `RootLayout` for dashboard routes — the actual chrome is `AppShell`, rendered by the page).

## Do / Don't

- **Do** use `text-fg` / `text-fg-2` / `text-fg-3` / `text-fg-4` and `bg-panel` / `bg-panel2` / `bg-base`. **Don't** use the shadcn alias classes (`text-foreground`, `bg-card`, …) in new code — they're back-compat only.
- **Do** use `page-padding`, `gap-component`, `space-y-section`, etc. **Don't** hand-write ad-hoc padding/margin values for standard rhythms.
- **Do** reference `var(--radius)` / `var(--radius-lg)` / `var(--radius-xl)`. **Don't** use Tailwind's generic `rounded-md`/`rounded-lg`/`rounded-xl` scale.
- **Do** let `<h1>`–`<h5>` pick up the display font/weight/tracking from the base layer. **Don't** reapply `font-display`/`font-semibold`/`tracking-tight` by hand on headings.
- **Do** use `as-label`/`as-mono` utilities for mono eyebrows and data values. **Don't** hand-roll `font-mono text-[11px] uppercase tracking-[0.1em]`.
- **Do** gate theme-aware styles on the `dark:` variant or a token that already flips with `.dark`. **Don't** write new `[data-theme="..."]` CSS — that attribute is cosmetic-only now.
- **Do** keep primitive component prop APIs (`variant`, `size`, `tone`, …) stable when touching a page that uses them. **Don't** rename or remove a variant without updating every caller.
- **Never** hardcode a hex color. If a token doesn't exist for what you need, add one to `tokens.css` (with both light and dark values) rather than inlining a literal.
