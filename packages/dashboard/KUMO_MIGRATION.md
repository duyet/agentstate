# Kumo UI Migration — Working Spec

> Temporary working doc for the `claude/kumo-rebuild` branch. Delete after merge.
> Captures the proven integration facts so parallel rebuild agents work from one source of truth.

## Status

- **Foundation PROVEN.** `@cloudflare/kumo@2.5.2` builds under Next 16 (Turbopack) + React 19 + `output:"export"` + Tailwind v4. 18-page static export green. Smoke route at `/kumo-smoke`.
- Deps added: `@cloudflare/kumo`, `@phosphor-icons/react`, `echarts`, `zod` (peer deps).
- Decision: **adopt Kumo native look** (drop the vermilion/AgentState brand tokens), **big-bang on this branch**.

## CSS wiring (DONE — do not touch)

`src/app/globals.css` already has:

```css
@source "../../node_modules/@cloudflare/kumo/dist/**/*.{js,jsx,ts,tsx}";
@import "@cloudflare/kumo/styles/tailwind";   /* must precede tailwindcss */
@import "tailwindcss";
```

- `@source` is **mandatory** — without it Tailwind v4 won't scan `node_modules` and Kumo utility classes silently vanish (e.g. Dialogs not centered).
- Biome flags `@import` ordering as an error — **false positive** against Tailwind v4 `@source`. Ignore it. (Resolved fully when globals.css is rewritten to drop shadcn tokens.)
- During transition, `shadcn/tailwind.css` is still imported (un-migrated pages need it). Remove at cleanup.

## Dark mode — set BOTH during transition

shadcn uses `.dark` **class**; Kumo uses `data-mode="dark"` **attribute**. While both systems coexist, every theme toggle must set **both**:

```js
document.documentElement.classList.toggle("dark", isDark);
document.documentElement.setAttribute("data-mode", isDark ? "dark" : "light");
```

At cleanup (shadcn removed), drop the `.dark`-class logic and keep only `data-mode`.

## Import conventions

- Prefer **granular** imports (tree-shaking): `import { Button } from "@cloudflare/kumo/components/button"`.
- Barrel is fine for small/scope files: `import { Button, Badge } from "@cloudflare/kumo"`.
- Components live under `@cloudflare/kumo/components/<name>`. Primitives (Base UI re-export) under `@cloudflare/kumo/primitives/<name>`.

## Icon swap: lucide-react → @phosphor-icons/react

```ts
import { Moon, Sun, House, Gear, ChatCircle, Activity } from "@phosphor-icons/react";
```

Phosphor names differ from lucide. Common map (verify exact names in `@phosphor-icons/react`):

| lucide | phosphor |
|---|---|
| Home | House |
| Settings | Gear |
| MessageCircle | ChatCircle |
| Activity | Activity |
| GitBranch | GitBranch |
| LayoutDashboard | SquaresFour |
| BookOpen | BookOpen |
| Blocks | SquaresFour / Puzzle |
| Moon / Sun | Moon / Sun |
| CircleUserRound | UserCircle |
| LogIn | SignIn |
| UserPlus | UserPlus |
| Copy | Copy |
| Check | Check |
| ChevronDown | CaretDown |
| X | X |
| Plus | Plus |
| Trash | Trash |
| ExternalLink | ArrowUpRight |
| Eye / EyeOff | Eye / EyeSlash |

Phosphor icons accept `size` (px number), `weight`, and standard svg props including `className`.

## Chart swap: recharts → Kumo Chart (echarts)

Kumo chart components wrap echarts. See `@cloudflare/kumo/components/chart`. Use `bunx kumo doc Chart` for the API. `recharts` removed at cleanup.

## shadcn → Kumo component map

| shadcn (`@/components/ui/*`) | Kumo |
|---|---|
| button | Button (variant: primary\|secondary\|ghost\|destructive\|outline; default **secondary**) |
| input | Input (has built-in Field via `label`/`description`/`error`) |
| textarea | InputArea |
| label | Label |
| badge | Badge (variant includes primary\|secondary\|success\|warning\|error\|info\|beta\|outline\|red\|green\|neutral\|orange\|purple\|teal\|blue) |
| card | LayerCard / Surface |
| alert | Banner |
| alert-dialog | Dialog |
| dialog | Dialog |
| sheet | Dialog (no separate Sheet) |
| dropdown-menu | DropdownMenu (compound: `.Trigger` `.Content` `.Item` `.Group` `.Label` `.Separator` ...) |
| select | Select |
| checkbox | Checkbox |
| switch | Switch |
| tabs | Tabs |
| tooltip | Tooltip (needs `<TooltipProvider>` from `@cloudflare/kumo/components/tooltip`) |
| table | Table (compound: `.Header` `.Head` `.Body` `.Row` `.Cell` `.CheckCell` ...) |
| skeleton | SkeletonLine |
| avatar | (no Kumo Avatar — keep Clerk's, or use a plain img) |
| separator | Table/DropdownMenu `.Separator`, or a styled `<hr>` |
| toggle / toggle-group | Switch / Radio / primitives |
| breadcrumb | Breadcrumbs |
| pagination | Pagination |
| sidebar | Sidebar (compound: `.Provider` `.Header` `.Content` `.Footer` `.Group` `.GroupLabel` `.Menu` `.MenuItem` `.MenuButton` `.MenuSub` `.Trigger` `.Rail` ...) |

## API gotchas (verified via `bunx kumo doc`)

- **`Text` uses a discriminated union.** Heading variants (`heading1`/`heading2`/`heading3`) **require `as`** (the element tag, e.g. `"h1"`) and forbid `size`/`bold`. Body variants (`body`/`secondary`/`success`/`error`/`mono`/`mono-secondary`) make `as` optional and allow `size`/`bold`.
- **`Button.variant` default is `secondary`**, not `primary`. Map shadcn `default` → Kumo `primary` when it's the primary CTA.
- **`Input` self-wraps in a Field** when you pass `label`/`description`/`error`. Don't compose a separate Field wrapper around it.
- **`Button` supports `render={<a/>}` / `render={<Link/>}`** for link-buttons (replaces shadcn `asChild`). Use this for anchor/navigation buttons.
- **`Button` has `loading` and `icon` props** (`icon` = ReactNode, typically a Phosphor icon).
- **Compound components** use dot notation: `DropdownMenu.Trigger`, `Sidebar.Menu`, `Table.Row`, `Tabs.Tab`, etc.

## Local docs (web is rate-limited — use this)

```bash
cd packages/dashboard
bunx kumo ls              # list all 42 components
bunx kumo doc Button      # full props + examples for one component
```

## Keep as-is during migration

- **Clerk** components (`UserButton`, `SignIn`, `OrganizationSwitcher`) — Kumo has no auth components. Style Clerk via `appearance` if needed.
- **`sonner` toast** — keep during transition (migrating every `toast()` call is a separate pass). Revisit adopting Kumo `Toasty` later.
- **next-themes** stays unless it conflicts.

## Build / verify (do NOT run inside parallel agents — OOM)

```bash
cd packages/dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder bun run build
bunx tsc --noEmit -p tsconfig.json
bunx biome check packages/dashboard/src/
```

Sandbox env (if tempdir/config blocked):
```bash
export BUN_TMPDIR=/private/tmp/codex-bun-tmp BUN_INSTALL_CACHE_DIR=/private/tmp/codex-bun-cache XDG_CONFIG_HOME=/private/tmp/codex-wrangler-config
```

## Rebuild partition (parallel agents — disjoint file sets)

1. **Shell** (main session): `providers.tsx`, root `layout.tsx`, `theme-toggle.tsx`, `app-sidebar.tsx`, `site-header.tsx`, `topbar-auth.tsx`, `organization-switcher.tsx`, `components/sidebar/*`, `components/organization/*`, `footer.tsx`.
2. **Marketing**: `src/app/page.tsx` + `_*.tsx` privates, `src/app/brand/*`, `src/app/docs/*`.
3. **Dashboard core**: `src/app/dashboard/*` (root: page, `_dashboard-*`, `_create-project-form*`, `_projects-*`), `src/app/dashboard/project/*`.
4. **Dashboard data**: `src/app/dashboard/conversations/*`, `analytics/*` (+ `components/analytics/*` recharts→echarts), `traces/*`.
5. **Dashboard config**: `src/app/dashboard/domains/*`, `settings/*`, `integrate/*`.

Cleanup (after all above): delete `components/ui/*` (shadcn), drop `recharts`, `lucide-react`, `@base-ui/react`, `shadcn`, remove `shadcn/tailwind.css` + brand tokens from globals.css, remove `.dark`-class logic, delete `/kumo-smoke` and this doc.
