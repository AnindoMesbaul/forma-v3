# Improve readability while keeping it sleek

The app uses a near-black background (`oklch(0.145)`), 13px base font, dim muted text (`oklch(0.5)`), and 11–12px UI elements. Result: hard to read, cramped controls. This plan tunes the design tokens and a few component sizings — no functional changes.

## 1. Lighten and warm the dark palette (`src/styles.css`)

- `--background`: `0.145` → `0.19` (softer slate, less harsh)
- `--surface`: `0.18` → `0.235` (panels distinct from bg)
- `--surface-2`: `0.21` → `0.275`
- `--foreground`: `0.937` → `0.97` (crisper primary text)
- `--muted-foreground`: `0.5` → `0.66` (meets WCAG AA on new bg)
- `--border`: `0.245` → `0.32`
- `--border-strong`: `0.32` → `0.42`
- `--primary`: lightness `0.55` → `0.62` so it pops against lighter bg

Stays dark-only.

## 2. Bigger base typography

In `html, body`:
- font size `13px` → `14.5px`
- line height `1.45` → `1.55`

Then sweep small text:
- `TopBar`: `h-12` → `h-14`, stats `text-[12px]` → `text-[13px]`, buttons `px-2.5 py-1` → `px-3 py-1.5`
- `OrgNodeCard`: width `220 → 240`, name `13 → 14px`, title `12 → 13px`, dept badge `10 → 11px`, padding `px-3 py-2` → `px-3.5 py-2.5`
- `ProposalCard`, `ChangeLog`, `NodeDetail`, `AgentPanel`, `ChatBar`: replace any `text-[11px]/[12px]` with `text-xs`/`text-sm`; section headers `text-sm font-medium`

## 3. Larger interactive targets

- Buttons get `min-h-8`
- Costs dropdown: `py-1.5 → py-2`, width `w-56 → w-64`
- Widen `AgentPanel` and `NodeDetail` by ~24px for breathing room (verify current width during implementation)

## 4. Subtle elevation so panels read as layers

Add to `styles.css`:
```
--shadow-panel: 0 1px 0 0 color-mix(in oklab, white 4%, transparent),
                0 8px 24px -12px rgba(0,0,0,0.5);
```
Apply on `TopBar`, `AgentPanel`, `NodeDetail`, costs dropdown via `shadow-[var(--shadow-panel)]`. Keeps the flat Linear vibe without the everything-is-one-black-slab feel.

## What stays the same

Component logic, store, AI runner, routing, shadcn primitives, 6px radius, tabular-nums for numbers — all untouched.

## Out of scope (ask if wanted)

- Light theme toggle
- Restyling React Flow edges/handles beyond node size
- New icon set / logo redesign
