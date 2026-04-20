<p align="center">
  <img src="docs/the_block_repo.png" alt="The Block — vehicle auction buyer experience" width="960" />
</p>

# The Block — Buyer Experience

A React + Vite prototype of the buyer side of a vehicle auction platform, built against the 200-vehicle dataset in [`data/vehicles.json`](data/vehicles.json). This is a submission for OPENLANE's [*The Block*](CHALLENGE.md) coding challenge.

## How to Run

Prerequisites: **Node.js 20+** and **npm**.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

Other scripts:

- `npm run build` — type-check and build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run typecheck` — run the TypeScript project check

## Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite 5
- **Styling:** Tailwind CSS 3
- **Routing:** React Router 7 (declarative mode)
- **Data:** `data/vehicles.json` imported directly at build time — no backend
- **State:** React Context for user bids, persisted in `localStorage`

## What I Built

A three-page buyer flow — list, detail, my bids — with a shared header and a `:id`-based route for individual vehicles.

**List page (`/`).** Responsive grid of all 200 vehicles with a photo, condition-grade pill, color swatch, and the live current bid on each card. Cards are split visually: vehicle details on top, price / auction state / your-bid annotation on the bottom edge (so equal-height rows read consistently). Lots with no bids show "Starting $X · No bids yet" instead of "$0 · 0 bids".

- **Search** is case-insensitive with word-boundary matching across year, make, model, trim, body style, VIN, lot, dealership, city, province, exterior/interior color, and fuel type. URL-synced via `?q=…`.
- **Status chips** (All / Live / Starting soon / Ended) filter by auction state, with live counts that recompute against the current filter set.
- **Sort** by lot order, name, price (effective current bid), mileage, year, or auction time.
- **Filter panel** (toggled from the header) gives multi-select make / body / color chips, a condition-grade threshold, and range inputs for price and year. All filter state round-trips through the URL, so a filtered view is shareable and survives reload. Inverted ranges (e.g. min $10k, max $5k) are normalized at compare time so typed values stay where you put them.

**Detail page (`/vehicles/:id`).** Gallery with clickable thumbnails, title block with location and selling dealership, a specs table, and a condition section with grade + report + damage notes. The auction panel lives as a mobile-first sibling and a desktop sticky sidebar (see below). Inside the panel: opening/current bid, bids count, three-state reserve copy ("No reserve" / "Reserve met" / "Reserve not yet met"), a tabbed bid form (Bid now / Max bid), and a Buy-now button when the listing supports one. Min increment is $100; invalid bids show an inline error; the form disables outside the live window.

**My bids (`/my-bids`).** Per-vehicle rollup of every bid you've placed, sorted by most recent. Each row resolves to one of five outcomes given the live auction state: **Bought**, **Won**, **High bidder**, **Outbid**, or **Auction ended** — so returning users can tell at a glance what happened while they were away.

**Auction state + countdowns.** Each vehicle is labelled `upcoming` / `live` / `ended` with a ticking countdown — "Starts in 2d 2h" or "Live · Ends in 1d 19h". Because the JSON timestamps are synthetic, `src/auction.ts` shifts every auction by a single delta so the dataset's median start lands at page-load time, guaranteeing a spread of states for any reviewer at any point in time.

**Bidding.** Placed bids persist in `localStorage` under `the-block:bids`; max-bid ceilings under `the-block:max-bids`. Effective auction state — current bid, bid count, your last bid, top-bidder status — is derived by layering user bids over the JSON seed via a pure `getEffectiveBid` helper, so the list card, detail panel, my-bids row, and header badges all stay in sync automatically.

## Notable Decisions

**Frontend-only, no backend.** The prompt explicitly allows it, and the core loop (browse → detail → bid) is fully demonstrable client-side. A backend would have eaten hours that paid off more in craft. Trade-off: bids don't persist across devices, and there's no "live" multi-bidder simulation. If this went further, the swap point is a single file (`src/data.ts` + the bids context).

**Direct JSON import, not fetch.** Vite bundles `data/vehicles.json` at build time through a tiny typed wrapper (`src/data.ts`). This removes a class of loading/error states that would exist purely to handle a fetch that can't fail. If the data moved behind an API, I'd swap in React Query at the same boundary.

**Bids are layered, not overwritten.** `getEffectiveBid(vehicle, userBids)` computes the visible state from the JSON seed plus your bids, rather than mutating a local copy of the dataset. Keeps the "source of truth" seed bid cleanly recoverable and makes rendering trivially consistent.

**Mobile-first grid reorder on the detail page.** On mobile the auction panel renders directly after the vehicle title — before specs and condition — so buyers don't scroll past everything to bid. On desktop (≥1024px) the same panel becomes a sticky right-column sidebar. One DOM, two layouts, driven by CSS grid row/col placement instead of duplicated markup.

**Data-accurate copy, not literal.** "$0 · 0 bids" technically matched the data for unbid lots but looked broken at a glance. The list card and detail panel switch to "Starting $X · No bids yet" / "Opening bid" when `bid_count === 0`.

## Testing

- `npm run typecheck` passes with strict TypeScript settings.
- `npm test` runs Vitest coverage for `getEffectiveBid` (seed-only, user-above-seed, below-seed, multi-bid ordering, buy-now terminal state, cross-vehicle isolation, max-bid map, null `current_bid`).
- Responsive layout verified with headless Chromium screenshots at 375×667 (mobile), 768×1024 (tablet), and 1280×800 (desktop). The `playwright` devDep was used as an inspection tool during development — it isn't wired into CI and can be removed without affecting the app.
- Manually exercised the bid flow: valid bids, below-minimum rejection, non-numeric input, max-bid ceiling, buy-now terminal state, reload persistence, and effective state propagating back from the detail page to the list cards and my-bids rollup.

## What I'd Do With More Time

- **Simulated competing bidders** so the max-bid mechanic can actually fire — today the UI accepts a ceiling and places the minimum, but with no opposing bids the proxy never raises. A simple ticker that nibbles at live auctions would make the feature demonstrable.
- **Runtime schema validation** on `data/vehicles.json` and `localStorage` reads (Zod or a hand-rolled guard) — currently both paths trust the cast.
- **Error boundary + image-load fallback** so one bad CDN request or thrown render doesn't blank the page.
- **Sticky mobile bid bar** on the detail page — a condensed "Current $X · Bid" bar pinned to the bottom, so the action stays within thumb reach while scrolling specs.
- **Lightbox + keyboard navigation** on the gallery.
- **Accessibility pass** — focus trap + Escape-to-close on the filter panel, ARIA `live` region on the bid confirmation, contrast audit on the thinnest text.
- **Component-level tests** for the filter/sort pipeline and auction state machine, plus a Playwright smoke test covering the browse → bid → confirm loop.

## Time Spent

Roughly 4–5 hours end to end.
