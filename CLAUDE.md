# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A submission for OPENLANE's *The Block* coding challenge — a React + Vite prototype of the **buyer side of a vehicle auction web app**. The original challenge prompt lives in [`CHALLENGE.md`](CHALLENGE.md); the submission README at the repo root replaces it.

Key application files:

- `src/App.tsx` — `BidsProvider` wrapping a `BrowserRouter` with four routes (`/`, `/vehicles/:id`, `/my-bids`, `*`)
- `src/pages/ListPage.tsx` — inventory grid with URL-synced search (`?q=…`) and sort (`?sort=…`)
- `src/pages/DetailPage.tsx` — vehicle gallery, specs, condition, and the auction panel; grid reorder places the bid form directly after the title on mobile and as a sticky right-column sidebar on `lg+`
- `src/pages/MyBidsPage.tsx` — per-vehicle rollup of every bid the user has placed, read from the same context
- `src/bids.tsx` — React Context for user bids, `localStorage` persistence under `the-block:bids`, and the pure `getEffectiveBid()` helper that layers user bids over the JSON baseline. This helper is called from the list card, detail panel, and my-bids rows — keep them in sync via this function rather than duplicating merge logic.
- `src/auction.ts` — auction state machine (`upcoming`/`live`/`ended`), countdown formatting, and the `useNow` ticker. Applies a single median-based `SHIFT_MS` to every `auction_start` so the synthetic timestamps always span around "now" at page load.
- `src/data.ts` — typed wrapper around `data/vehicles.json` with an O(1) `getVehicleById` map lookup
- `src/format.ts` — shared `Intl` formatters

## Challenge constraints that shape implementation choices

These come from `README.md` and should guide architectural decisions:

- **Scope is buyer-only**: browse/search inventory, vehicle detail pages, place bids. Do **not** build seller workflows, checkout, payments, dealer admin, or auth.
- **Time budget ~4–8 hours.** Prefer simple, legible solutions over frameworks-for-the-sake-of-it. A frontend-only implementation is explicitly acceptable — bids can live in client state or localStorage unless a backend is clearly justified.
- **Stack is open**, but React + Vite is called out as matching OPENLANE's current web stack. Tailwind is mentioned as reasonable. Don't pick an exotic stack without a reason.
- **Responsive web** (desktop + mobile) is a minimum-bar requirement, not a stretch goal.
- **Auction timestamps in `data/vehicles.json` are synthetic.** If showing countdowns or "live" states, normalize them relative to "now" — do not treat the raw `auction_start` values as real.
- Evaluation weighs **product thinking, craft, and judgment** alongside code quality. Scope decisions and their rationale matter as much as the code.

## The dataset

`data/vehicles.json` holds 200 synthetic vehicle listings. Each record includes identification (`id`, `vin`, `lot`), vehicle specs, condition data (`condition_grade`, `condition_report`, `damage_notes`, `title_status`), auction fields (`starting_bid`, `reserve_price`, `buy_now_price`, `auction_start`, `current_bid`, `bid_count`), location, selling dealership, and placeholder image URLs. The full shape is documented in `README.md`. Treat this file as the single source of truth for inventory — import it directly rather than re-deriving data.

`scripts/generate_vehicles.mjs` is the deterministic generator that produced `vehicles.json` (seeded mulberry32 RNG, seed `42`). Regenerate with:

```
node scripts/generate_vehicles.mjs
```

Only rerun if you intentionally want to change the dataset; the committed JSON is what the reviewer will evaluate against.

## Submission workflow

The candidate's README should follow `SUBMISSION.md` (how to run, time spent, assumptions, stack, decisions, tradeoffs). Submission is via **fork + shared repo link**, not PR back to this repo. When the user is finalizing, the top-level `README.md` they ship should replace or augment the challenge prompt with run instructions.

## Commands

- `npm run dev` — Vite dev server at <http://localhost:5173>
- `npm run build` — TS project build + Vite production build to `dist/`
- `npm run typecheck` — TypeScript-only check, no emit
- `npm run preview` — serve the production build

No test runner is wired up. `playwright` is installed as a devDep and was used for manual screenshot-based responsive QA during development; it isn't invoked by any script. If you add tests, prefer Vitest for unit coverage over spinning up Playwright for everything — the logic worth testing first is `getEffectiveBid` in `src/bids.tsx`.

## Behaviors worth knowing before editing

- **Bid state is derived, not stored.** Never write through to a "current_bid" on the vehicle record. The single source of truth is the JSON seed + `userBids` array; `getEffectiveBid` combines them. If a view needs the effective value, call the helper.
- **Auction timestamps are synthetic and normalized at runtime.** Raw `auction_start` values come through `getAuctionTimes` in `src/auction.ts`, which adds a single module-level `SHIFT_MS` (computed from the dataset median at load) to every vehicle. Never read `auction_start` directly in UI code — always go through `getAuctionTimes` so state and countdowns stay consistent. The bid form on the detail page is disabled when `state !== "live"`.
- **Search is URL-first.** `ListPage` reads `q` from `useSearchParams`; the input is a controlled reflection of the URL. Update via `setSearchParams(..., { replace: true })` so typing doesn't flood history.
- **Detail grid is order-sensitive on mobile.** The three grid children are Gallery+Title / AuctionPanel / Specs+Condition, in that DOM order, with `lg:col-start`/`lg:row-start` classes rearranging them into a 2-col + sidebar layout on desktop. Don't reorder the JSX to match desktop — it'd break mobile UX (bid form would get buried again).
