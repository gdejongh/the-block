# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This is **the starting point for an OPENLANE coding challenge**, not a running application. The candidate forks this repo and builds the **buyer side of a vehicle auction web app** on top of it. At `main`, the repo contains only: the challenge prompt (`README.md`), a submission template (`SUBMISSION.md`), walkthrough expectations (`WALKTHROUGH.md`), the vehicle dataset, and the script that generated it. There is no application code, build system, package manager, or test suite yet — those are introduced by the candidate's implementation.

When the user asks you to "start the project" or "build the feature," the expectation is that you are scaffolding fresh inside this repo (or a subdirectory of it), not modifying an existing app.

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

No build/test/lint commands exist yet — they will be defined by whatever stack the candidate chooses. When a `package.json` (or equivalent) is added, update this section with the real commands rather than guessing.
