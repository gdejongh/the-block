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

A two-page buyer flow with a shared header and a `:id`-based route for individual vehicles.

**List page (`/`).** Responsive grid of all 200 vehicles with case-insensitive text search across year, make, model, trim, body style, VIN, lot, dealership, city, and province. Search is URL-synced via `?q=…` so filtered views are shareable (history uses `replace`, so typing doesn't pollute back-button state). Each card shows the live current bid and bid count; lots with no bids show "Starting $X · No bids yet" instead of a confusing "$0 · 0 bids". If you've placed a bid, the card is annotated "You bid $X".

**Detail page (`/vehicles/:id`).** Gallery (hero + thumbnails), title block with location and selling dealership, a specs table, a condition section with grade + report + damage notes, and an auction panel with opening/current bid, bids count, reserve-met status, and a bid form. Min increment is $100. Invalid bids show an inline error. Your last bid is confirmed below the form with its timestamp.

**Auction state + countdowns.** Each vehicle is labelled `upcoming` / `live` / `ended` with a ticking countdown — "Starts in 2d 2h" or "Live · Ends in 1d 19h". On the detail page the bid form is disabled outside the live window. Because the JSON timestamps are synthetic, `src/auction.ts` shifts every auction by a single delta so the dataset's median start lands at page-load time, guaranteeing a spread of states for any reviewer at any point in time.

**Bidding.** Placed bids persist in `localStorage` under the key `the-block:bids`. Effective auction state — current bid, bid count, your last bid — is derived by layering user bids over the JSON seed values via a pure `getEffectiveBid` function, so the list card, detail panel, and header badges all stay in sync automatically.

## Notable Decisions

**Frontend-only, no backend.** The prompt explicitly allows it, and the core loop (browse → detail → bid) is fully demonstrable client-side. A backend would have eaten hours that paid off more in craft. Trade-off: bids don't persist across devices, and there's no "live" multi-bidder simulation. If this went further, the swap point is a single file (`src/data.ts` + the bids context).

**Direct JSON import, not fetch.** Vite bundles `data/vehicles.json` at build time through a tiny typed wrapper (`src/data.ts`). This removes a class of loading/error states that would exist purely to handle a fetch that can't fail. If the data moved behind an API, I'd swap in React Query at the same boundary.

**Bids are layered, not overwritten.** `getEffectiveBid(vehicle, userBids)` computes the visible state from the JSON seed plus your bids, rather than mutating a local copy of the dataset. Keeps the "source of truth" seed bid cleanly recoverable and makes rendering trivially consistent.

**Mobile-first grid reorder on the detail page.** On mobile the auction panel renders directly after the vehicle title — before specs and condition — so buyers don't scroll past everything to bid. On desktop (≥1024px) the same panel becomes a sticky right-column sidebar. One DOM, two layouts, driven by CSS grid row/col placement instead of duplicated markup.

**Data-accurate copy, not literal.** "$0 · 0 bids" technically matched the data for unbid lots but looked broken at a glance. The list card and detail panel switch to "Starting $X · No bids yet" / "Opening bid" when `bid_count === 0`.

## Testing

- `npm run typecheck` passes with strict TypeScript settings.
- Responsive layout verified with headless Chromium screenshots at 375×667 (mobile), 768×1024 (tablet), and 1280×800 (desktop). The `playwright` devDep was used as an inspection tool during development — it isn't wired into CI and can be removed without affecting the app.
- Manually exercised the bid flow: valid bids, below-minimum rejection, non-numeric input, reload persistence, and effective state propagating back from the detail page to the list cards.

## What I'd Do With More Time

- **Filter chips** for make, body style, and province, living next to the search input with the same URL-sync pattern.
- **Sticky mobile bid bar** on the detail page — a condensed "Current $X · Bid" bar pinned to the bottom, so the action stays within thumb reach while scrolling specs.
- **Lightbox + keyboard navigation** on the gallery.
- **Unit tests for `getEffectiveBid`** — the most logic-heavy pure function in the app.
- **Accessibility pass** — focus rings audit, ARIA `live` on the bid confirmation, contrast check on the emerald "you bid" text.
- **Bid history view** — per-vehicle log and a user-wide "Your activity" page, both of which are trivially addable given the shape of what's already in `localStorage`.

## Time Spent

_Placeholder — fill in before submitting._
