# CLAUDE.md

Guidance for Claude Code (and other agents via the `AGENTS.md` symlink) working in this repo.

## What this is

**GW2 EVTC Tools** — a static, browser-only Vite + React site for Guild Wars 2 raid log utilities. No backend, no database, no analytics. Deploys to GitHub Pages. Three tools, one SPA:

1. **ID Rewriter** — rewrite EVTC trigger/encounter ids locally in the browser (e.g. Gorseval `15429` → Sabetha `15375`, Twisted Castle `16247` → Xera `16246`).
2. **Raid Session Timer** — paste dps.report links or upload logs to dps.report, compute per-wing elapsed/combat/downtime, export CSV/JSON.
3. **Run History** — import/manage saved runs, view dashboards, wings, encounters, players, weeks, downtime.

## Stack

- Vite 8, React 19, TypeScript 7 (strict), ESM only (`"type": "module"`).
- Tailwind CSS 4 (via `@tailwindcss/vite`) + daisyUI 5 + shadcn (radix-nova style, `components.json`).
- `fflate` for client-side zip/gzip EVTC handling.
- `recharts` for charts, `lucide-react` icons, `theme-change` for light/dark.
- Import alias: `@/*` → `src/*` (set in both `vite.config.ts` and `tsconfig.json`).

Note: `README.md` says Vite 5 / React 18 — that is stale. Trust `package.json`.

## Commands

```bash
npm install       # install deps (.npmrc pins public npm registry)
npm run dev        # vite dev server on http://localhost:5175 (strict port)
npm run build      # tsc -b type-check, then vite build -> dist/
npm run preview    # preview production build
npm run lint       # eslint . (flat config)
npm run lint:fix   # eslint . --fix
```

There is no test runner. Verify changes with `npm run build` (catches type errors), `npm run lint`, and by running the app.

### Linting

ESLint (flat config, `eslint.config.js`) covers React hooks correctness (`eslint-plugin-react-hooks`) and general code-quality rules. Type checking is left to `tsc -b`.

Important: this project uses the native-port `typescript@7`, whose npm package no longer ships the classic compiler API. `typescript-eslint` cannot run against it, so ESLint parses TS/TSX with **Babel** (`@babel/eslint-parser` + `@babel/preset-typescript`/`preset-react`) — no dependency on the `typescript` package. Because Babel strips types before scope analysis, the core `no-unused-vars` and `no-undef` rules are turned off (they false-positive on type positions); `tsc` handles both. Don't add `typescript-eslint` back unless the project moves off the native port.

## Layout

```
src/
  App.tsx                  # shell: tab switcher for the 3 tools, theme toggle
  main.tsx                 # React entry
  styles.css               # Tailwind + daisyUI theme
  components/
    TriggerRewriter.tsx     # ID Rewriter tool
    SessionTimer.tsx        # Raid Session Timer tool
    SessionTimeline.tsx
    RunHistory.tsx          # Run History tool shell (tabs)
    run-history/            # per-tab views + shared logic
      DashboardTab.tsx      # Dashboard tab
      EncountersTab.tsx     # Encounters tab
      PlayersTab.tsx        # Players tab shell
      WeeksTab.tsx          # Weeks tab
      WingsTab.tsx          # Wings tab
      RunsTab.tsx           # Runs tab
      ManageRunsTab.tsx     # Manage runs tab
      DowntimeTab.tsx       # Downtime tab
      shared.tsx            # filter panel, stat cards, shared UI
      types.ts              # tab-level types (filters, summaries)
      utils.ts              # formatters, aggregation helpers (shared across tabs)
      useRunHistoryFilters.ts
      encounters/           # Encounters tab components
        EncounterDurationChart.tsx
        EncounterPhaseTable.tsx
        encounterGroups.ts, encounterPhases.ts  # encounter grouping logic
      players/              # Players tab components (segregated for clarity)
        PlayerMetricsTable.tsx     # table UI + expand state
        PlayerComparisonCell.tsx   # cell renderer for DPS comparisons
        ExpandedPlayerDetail.tsx   # expanded row content
        PlayerEncounterChart.tsx   # per-encounter LineChart
        ProfessionUsageChart.tsx   # profession pie + legend
        playerAggregation.ts       # types + pure data aggregation
        playerFormat.ts            # formatters (delta, consistency, ticks)
    ui/                     # shadcn/radix primitives (button, select, ...)
  lib/
    evtc.ts                 # EVTC parse/detect/rewrite (fflate)
    dpsReport.ts            # dps.report API + session/encounter types
    runHistory.ts           # RunRecord model, import/merge logic
    bundledRunHistory.ts    # bundled sample run data
    format.ts, ui.ts, utils.ts
  data/encounters.ts        # canonical encounter id/code/name/wing table
  run-data/                 # bundled run-history JSON
```

## Conventions

- TypeScript strict is on. Prefer explicit exported types (see `RunRecord`, `Encounter`, `EvtcHeaderInfo`).
- Use the `@/` alias for cross-directory imports; relative imports within a folder are fine.
- Styling is utility-first Tailwind + daisyUI class names (`btn`, `navbar`, `join`, ...). Match the existing className style rather than adding CSS files.
- Add shadcn primitives under `src/components/ui/`; app UI composes them.
- `src/data/encounters.ts` is the single source of truth for encounter ids/names/wings — extend it there, don't hardcode ids elsewhere.

## Folder organization patterns

When a component (e.g., `PlayersTab`) becomes complex, extract into a sibling folder (following the `encounters/` precedent):

- **Tab shell** (`PlayersTab.tsx`) stays at parent level — handles filters, wing selection, state coordination.
- **Subfolder** (`players/`) contains:
  - **Components** (PascalCase `.tsx`): `PlayerMetricsTable.tsx`, `PlayerEncounterChart.tsx` — React UI, import from `*Aggregation` and `*Format` modules.
  - **Pure logic** (camelCase `.ts`): `playerAggregation.ts` (types + aggregation functions), `playerFormat.ts` (formatters) — testable, no React imports.
- **Shared helpers** across tabs go in `utils.ts` (e.g., `shortEncounterName`, `compareEncounterSummaries`), not duplicated per tab.

## Domain notes

- **EVTC** is a third-party GW2 combat-log binary format. `evtc.ts` sniffs the boss/trigger id from the first bytes of the payload; rewriting is best-effort — advise verifying output in Elite Insights or dps.report.
- **dps.report** endpoints used from the browser: `GET /getUploadMetadata?permalink=...` and `POST /uploadContent?json=1&generator=ei`. Uploads are sequential and rate-limited; batches may need retries.
- Trigger id, encounter, wing terminology all map through `data/encounters.ts`.

## Privacy / constraints

- Keep it backend-free. EVTC rewriting stays fully local (read in browser, downloaded back).
- Only dps.report is contacted, and only for the Timer tool. Don't add servers, tracking, or third-party calls without explicit ask.
- The Vite `base` path auto-derives from `GITHUB_REPOSITORY` in CI for GitHub Pages — don't hardcode it.
