# Production Analytics Dashboard

A SaaS analytics dashboard built with Next.js 15 (App Router), React 19, TypeScript, and Tailwind CSS, for the Future Studios Bangladesh frontend assignment.

**Live demo:** https://production-analytics-dashboard-oyjizq1g3.vercel.app
**Repository:** https://github.com/aliakbermehedi1/production-analytics-dashboard.git

---

## 1. Setup Instructions

Requirements: Node.js 20+ and npm.

```bash
git clone <your-repo-url>
cd analytics-dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run build      # production build
npm run start      # run the production build locally
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

No environment variables or external services are required. The dataset is generated in-process from a fixed seed (see [§3](#3-data--api-approach)), so the app works fully offline.

---

## 2. Architecture & Folder Structure

```
src/
├── app/                    # Routes (App Router)
│   ├── page.tsx            # Dashboard
│   ├── orders/
│   │   ├── page.tsx        # Orders list (reads searchParams)
│   │   └── [id]/page.tsx   # Order detail
│   ├── api/                # Route handlers (mock backend)
│   │   ├── analytics/route.ts
│   │   ├── orders/route.ts
│   │   ├── orders/[id]/route.ts
│   │   ├── orders/recent/route.ts
│   │   └── activities/route.ts
│   ├── layout.tsx, globals.css, error.tsx, not-found.tsx
├── components/
│   ├── ui/          # Presentational primitives (Card, Badge, Skeleton, EmptyState, ErrorState)
│   ├── dashboard/   # StatCard, TrendChart, RecentOrders, ActivityFeed
│   ├── orders/      # OrdersFilters, OrdersTable, Pagination
│   └── layout/      # Sidebar, Header
├── lib/
│   ├── api/         # client.ts (fetch wrapper), services.ts (typed endpoints), envelope.ts
│   ├── transforms/  # guards.ts — runtime validation, unknown → domain type
│   └── utils/       # format.ts, query.ts
├── server/data/     # seed.ts (mock dataset), repository.ts (query/filter/aggregate)
└── types/           # domain.ts, api.ts
```

**Why it's organised this way:** the folder boundaries mirror the direction data flows —
`server/data` (raw dataset) → `app/api` (HTTP layer) → `lib/api` (typed client) → `components`
(rendering). Each layer only imports from the one below it. This is a **feature-adjacent, layered**
structure rather than a strict feature-folder split, which fits a single-domain assignment of this
size; at real ERP scale (the kind of multi-module product this task is modelling) each business
domain — orders, customers, inventory — would get its own top-level folder containing its own
components/lib/types, so teams can work in parallel without touching shared code.

**Component reusability:** `Card`, `StatusBadge`, `Skeleton`, `EmptyState`, and `ErrorState` in
`components/ui` are used across the dashboard, orders list, and order detail — none of those pages
define their own card or badge markup.

---

## 3. Data & API Approach

- `src/server/data/seed.ts` generates a deterministic dataset (180 customers, 420 orders, 60
  activity events) from a fixed random seed, so the demo is stable across runs instead of showing
  different numbers on every restart.
- `src/server/data/repository.ts` is the only module that touches that dataset. It exposes
  functions (`findOrders`, `findOrderById`, `getAnalyticsSummary`, …) that already look like a
  database layer, so swapping the seed for Prisma/Postgres later would not require touching
  anything above it. It's marked `import "server-only"` so a Client Component importing it directly
  is a **build error**, not a code-review catch. Every function is wrapped in React's `cache()`, so
  calling the same function twice in one render (the dashboard's metrics and charts sections both
  need `getAnalyticsSummary(30)`) computes it once, not twice.
- `src/app/api/**/route.ts` are Next.js Route Handlers acting as a real REST API, wrapped in an
  `{ ok: true, data }` / `{ ok: false, error }` envelope so success and failure are distinguishable
  independent of HTTP status. **Pages do not call these routes internally** — see the callout below.
- `src/lib/api/client.ts` and `src/lib/api/services.ts` are a typed fetch client + service layer
  (timeouts, error normalisation into one `ApiError` type, runtime-validated responses via
  `src/lib/transforms/guards.ts`). This is the layer a genuine client-side consumer uses —
  currently that's `ActivityFeed`'s "Refresh" button, the one interaction on this app that actually
  originates in the browser after the initial page load.
- **UI components never see raw, unvalidated API data** — server-rendered pages get it from the
  repository directly (typed by TypeScript, no network boundary to validate), and the one
  client-fetch path runs the same runtime guards as everything else. No component hardcodes data.

### Server Components do not fetch their own API routes

Early versions of the three pages (`/`, `/orders`, `/orders/[id]`) had their Server Components call
`ordersService.list()` / `analyticsService.getSummary()` — a `fetch()` to this app's own
`/api/orders`, `/api/analytics`, etc., resolved to an absolute URL (`VERCEL_URL` in production,
`localhost` in dev).

**That worked locally and failed in production** — the dashboard rendered fine with `npm run dev` /
`npm run start`, but the same route on Vercel showed the generic error boundary ("We couldn't load
this page"). The cause: on `localhost`, the self-fetch really is local and cheap. On Vercel, each
request runs in its own serverless function invocation; that function making an HTTP round trip
back out to its own public URL is a well-documented Next.js/Vercel anti-pattern — it doubles
function invocations, adds real network latency for no benefit, and depending on the platform's
routing/protection for that specific deployment it can fail outright rather than just being slow.

The fix: since a Server Component already executes on the server, it calls the repository function
directly —

```tsx
// Before: an unnecessary HTTP round trip to this app's own API
const summary = await analyticsService.getSummary(30, { cache: "no-store" });

// After: a plain server-side function call
const summary = await getAnalyticsSummary(30);
```

The Route Handlers under `app/api/` are unchanged and still real, working endpoints — they're what
a genuinely client-originated request (like `ActivityFeed`'s refresh button) correctly calls over
HTTP, and what an external consumer of this API would use.

---

## 4. Server vs. Client Components

Default is Server; `"use client"` is added only where the reason is one of the two things that
actually require it.

| Component | Type | Why |
|---|---|---|
| `app/page.tsx`, `app/orders/page.tsx`, `app/orders/[id]/page.tsx` | Server | Fetch data directly; nothing here is interactive |
| `OrdersTable`, `RecentOrders`, all of `components/ui/*` | Server | Pure rendering from props |
| `Sidebar` | Client | Reads `usePathname()` for active-link state |
| `OrdersFilters` | Client | Owns form inputs, debounces search, pushes to the router |
| `Pagination` | Client | `onClick` handlers, `useTransition` for pending state |
| `TrendChart` | Client | Tracks hovered point for the tooltip (`useState`) |
| `ActivityFeed` | Client | Has a "Refresh" button — a genuine client-initiated fetch |

**The filter/pagination flow is deliberately server-driven, not client-fetched:** `OrdersFilters` and
`Pagination` don't hold results in `useState` — they only write to the URL (`router.push`). The
Orders page (`app/orders/page.tsx`) is a Server Component that reads `searchParams` and re-fetches
on the server for every navigation. This means:
- filtered views are shareable/bookmarkable URLs,
- the browser back button steps through filter history for free,
- the results table never ships to the client bundle.

`useTransition` is what keeps that from feeling like a full page reload — `isPending` dims the
current results while the server re-renders, instead of showing a blank page or a full-screen
spinner.

**The one genuine client-fetch** is `ActivityFeed`'s refresh button: it receives
`initialActivities` as a prop (server-rendered, so first paint has real data — no
mount → fetch → spinner → content waterfall), and only fetches again in response to a user click,
with `AbortController` cleanup on unmount.

### A real example of the boundary being enforced

`TrendChart`'s formatter was originally passed as a function prop from the Server Component
(`app/page.tsx`) straight into the Client Component:

```tsx
<TrendChart data={summary.revenueSeries} formatValue={formatCompactCurrency} />
```

This throws at runtime: **"Functions cannot be passed directly to Client Components."** The RSC
boundary only allows serializable values — strings, numbers, plain objects/arrays — to cross from
server to client, because a function reference means nothing in the browser; the function's code
never gets sent. The fix was to send a plain string tag instead and resolve the real formatter
*inside* the Client Component, where it actually lives:

```tsx
// Server Component: passes a serializable string
<TrendChart data={summary.revenueSeries} formatType="currency" />

// Client Component: resolves it locally
const FORMATTERS = { currency: formatCompactCurrency, number: formatNumber } as const;
const formatValue = FORMATTERS[formatType];
```

This is worth knowing cold for the follow-up round — it's exactly the kind of Server/Client boundary
question the JD's "React Fiber, rendering lifecycle" line is testing for.

---

## 5. Performance Decisions

- **`useMemo`** — `TrendChart` computes SVG path strings (point coordinates, area/line path,
  scale) from the `data` prop. Without memoisation, hovering to show the tooltip (a `useState`
  update) would rebuild every path string on every mouse move, for geometry that hasn't changed.
  `Pagination`'s page-window calculation (which pages/ellipses to render) is memoised for the same
  reason — it depends on `{ page, totalPages }`, not on the component's other renders.
- **`useCallback`** — event handlers passed to elements rendered in a loop
  (`TrendChart`'s per-point hit-area rectangles, `OrdersFilters`'s debounce/reset handlers) are
  wrapped so they don't get a new function identity — and therefore don't force those children to
  treat every parent render as a prop change — each time the component re-renders.
- **`useEffect`** is used exactly twice, both for synchronising with something *outside* React,
  which is what the hook is for: (1) `OrdersFilters` debounces the search input before pushing a URL
  change, and (2) `ActivityFeed` aborts an in-flight fetch on unmount. There is no
  `useEffect(() => fetchData(), [])` anywhere — Server Components fetch directly during render, so
  first paint never waits on a client-side effect.
- **Streaming with `<Suspense>`** — the dashboard splits into three independent boundaries (metrics,
  charts, recent-orders/activity) instead of one top-level `await`. A slow endpoint degrades one
  section instead of blocking the whole page, and fast sections paint as soon as they're ready.
- **No chart library** — `TrendChart` is hand-rolled SVG. Recharts/Chart.js/etc. cost roughly
  90–130 kB gzipped for what is, geometrically, a polyline and a set of rectangles; writing the two
  shapes used here is cheaper than shipping a general-purpose charting engine for them.
- **Route-level code splitting is automatic** via the App Router — `orders/[id]` ships **164 B** of
  route-specific JS because the whole page is a Server Component with zero client interactivity.
- **`React.memo`** on `TrendChart` avoids re-running its (memoised) geometry calculation when a
  sibling Suspense boundary on the dashboard resolves and re-renders the tree around it.

---

## 6. Notes on AI-Assisted Development

Built with AI assistance (Claude), used for scaffolding and implementation. Every architectural
decision above — the repository/service/guard layering, the Server/Client boundary choices, the
`useMemo`/`useCallback` placements — was made deliberately for this task and is something I can
walk through and justify, not generated blindly. I reviewed the code, ran the type checker and
production build myself, and the explanations in this README reflect my own understanding of why
each piece is built the way it is.

---

## Working Demo

Run locally with the setup steps above, or visit the deployed link at the top of this file.
