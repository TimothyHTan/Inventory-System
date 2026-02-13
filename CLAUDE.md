# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StockCard — a full-stack inventory management app digitizing paper-based "Kartu Stock" (stock card) for an Indonesian distribution company. Built with Next.js 16 (App Router) + Convex (real-time backend) + TypeScript. Uses Bun as the package manager/runtime.

## Commands

```bash
bun install                # Install dependencies
bun run dev                # Next.js dev server (Turbopack)
bun run dev:convex         # Convex backend dev server (separate terminal)
bun run dev:all            # Both servers via concurrently
bun run build              # Production build
bun run lint               # ESLint (Next.js config)
npx convex deploy          # Deploy Convex backend to production
```

Both `dev` and `dev:convex` must be running simultaneously during development.

## Architecture

### Frontend (Next.js App Router)
- All page components are client components (`"use client"`) because they use Convex hooks
- `app/layout.tsx` — root layout, wraps app in `ConvexClientProvider` for auth + real-time
- `app/page.tsx` — root redirect: auth check → org dashboard or `/onboarding`
- **Multi-tenant URL structure**: `/org/[slug]/dashboard`, `/org/[slug]/products/[id]`, `/org/[slug]/settings`, `/org/[slug]/analytics/...`
- Legacy routes (`/dashboard`, `/settings`, `/products/*`) redirect to `/`
- No Next.js middleware — all auth protection is client-side in layouts/pages

### Backend (Convex)
- `convex/schema.ts` — tables: `users`, `organizations`, `organizationMembers`, `invites`, `products`, `transactions`, `stockRequests`, `passwordResetOtps`
- `convex/helpers.ts` — shared auth helpers (`requireMinRole`, `getOrgMembership`, `isWithinDeleteWindow`, `generateSlug`, `generateInviteCode`)
- `convex/organizations.ts` — org CRUD, invites, membership management
- `convex/products.ts` — CRUD + full-text search + bulk delete
- `convex/transactions.ts` — add/list/listInbound/remove/bulkRemove (updates product stock atomically)
- `convex/stockRequests.ts` — stock request workflow (create/fulfill/cancel)
- `convex/analytics.ts` — aggregate queries for summary, product, and transaction analytics
- `convex/users.ts` — user lookup, role management
- `convex/passwordReset.ts` + `convex/passwordResetActions.ts` — OTP-based password reset via Gmail SMTP
- `convex/auth.ts` + `convex/auth.config.ts` — password-based email auth via `@convex-dev/auth`
- `convex/_generated/` — auto-generated types, never edit manually

### Data Flow
- No REST API — React components call Convex queries/mutations directly via `useQuery(api.*)` and `useMutation(api.*)`
- All data updates are real-time (Convex reactivity), except analytics which uses a custom `useAnalyticsQuery` hook (poll-based, avoids subscription overhead on expensive aggregates)
- Transactions and stock updates are atomic — both happen in the same mutation
- Organization context provided via `OrganizationProvider` React context
- Use `"skip"` as query args when org is not yet loaded: `useQuery(api.x, org ? { ... } : "skip")`

## Auth & Roles

### 5-Tier Role Hierarchy (org-scoped)
| Role | Tier | Capabilities |
|------|------|-------------|
| `employee` | 1 | View products, submit stock-out requests |
| `logistic` | 2 | Fulfill/cancel requests, record MASUK (inbound), delete own transactions within 60 min |
| `manager` | 3 | Delete any transaction, access analytics, manage members |
| `owner` | 4 | Rename org, create invites, delete org |
| `admin` | 5 | Same as owner + can assign admin role |

- Backend: `requireMinRole(ctx, userId, organizationId, "logistic")` — throws if user is below the required tier
- Frontend: `OrganizationProvider` exposes `isEmployee`, `isLogistic`, `isManager`, `isOwner`, `isAdmin` booleans
- Every query/mutation calls `getAuthUserId(ctx)` — returns `null`/`[]` for unauthenticated (never throws)

### Stock Request Workflow (KELUAR flow)
KELUAR (stock-out) transactions **cannot** be created directly. They only happen through request fulfillment:
1. Any user creates a stock request → `stockRequests.create` (status: `pending`)
2. Logistic+ fulfills it → `stockRequests.fulfill` atomically creates a KELUAR transaction with `source: "request"` and deducts stock
3. `transactions.add` enforces this: rejects `type: "out"` without `_internal_source: "request"`

## Multi-Tenancy

- Users can only belong to **one organization** at a time (enforced in create/join mutations)
- `OrganizationProvider` resolves slug → org + membership, detects role changes in real-time with notification banner
- Invite system: 8-char alphanumeric codes, new members join as `employee`
- `organizationId` is optional on `products`/`transactions` for backward compatibility with pre-multi-tenancy data
- `organizations.migrate` mutation assigns orphaned data to a specified org

## UI Conventions

### Language & Terminology
- **Language**: Indonesian for all UI text and error messages; English for code/comments
- **Key terms**: MASUK (stock in), KELUAR (stock out), SISA (balance), KETERANGAN (description)

### Design System
- **Styling**: Tailwind CSS with custom color tokens:
  - `carbon` — warm dark grays (all backgrounds/text/borders)
  - `copper` (#D4915C) — primary accent, SISA indicator
  - `sage` (#7B9E6B) — MASUK/stock-in/success
  - `rust` (#C75C5C) — KELUAR/stock-out/danger
- **Fonts**: Instrument Serif (display), Outfit (body), IBM Plex Mono (numbers)
- **Animations**: Motion library (import from `"motion/react"`)
  - Duration: 0.2–0.35s, easing: `[0.16, 1, 0.3, 1]`
  - Page transitions via `PageTransition`, stagger for lists (0.02–0.04s delay)
- **CSS utility classes** in `globals.css`: `.card`, `.card-hover`, `.ledger-line`, `.mono-num`, `.stencil`, `.accent-underline`
- **Background effects**: Engineering grid overlay + film grain texture on `body`

### Component Conventions
- **Button variants**: `primary`, `secondary`, `ghost`, `danger` (sizes: `sm`/`md`/`lg`)
- **Badge variants**: `copper`, `sage`, `rust`, `muted`, `warning`
- **Confirmation**: Always use `<ConfirmDialog>`, never `window.confirm()`
- **Responsive**: Mobile-first with hamburger menu at `md` breakpoint (768px)

### Formatting Helpers (`lib/utils.ts`)
- `formatDate("2026-01-15")` → `"15/1/2026"` (Indonesian locale)
- `formatNumber(5102)` → `"5.102"` (id-ID locale)
- `formatMonth("2026-02")` → `"Februari 2026"`
- `timeAgo(timestamp)` → `"baru saja"`, `"5m lalu"`, `"2j lalu"`, `"3h lalu"`
- `validatePassword(pw)` → error string or null (8-16 chars, 1 uppercase, 1 digit)

## Key Features

### Analytics (manager+ only)
- 3 sub-pages: ringkasan (summary), produk (product), transaksi (transaction)
- Uses `useAnalyticsQuery` hook (non-reactive, polls every 5 min, 20s timeout, preserves stale data on errors)
- Charts via Recharts, styled to match design system (carbon bg, copper grid, sage/rust data colors)
- Date range selector: 7d/30d/90d

### Product Management
- Search via Convex `searchIndex` on `products.name` with `organizationId` filter
- Bulk delete (manager+) with `ConfirmDialog`
- Inline rename (name + description) on detail page

### Transaction Management
- MASUK added directly by logistic+ via `TransactionForm`
- KELUAR only via stock request fulfillment
- Month-based filtering, running balance calculation
- Delete window: 60 minutes for logistic, unlimited for manager+

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL
- `AUTH_SECRET` — auth signing secret (`openssl rand -base64 32`)
- `CONVEX_SITE_URL` — site URL for auth callbacks (e.g., `http://localhost:3000`)
- `GMAIL_USER` + `GMAIL_APP_PASSWORD` — for password reset OTP emails (referenced in `passwordResetActions.ts`)

## Development Notes

- **Organization-scoped data**: Always filter by `organizationId` in queries
- **Permission checks**: Use `requireMinRole()` in mutations, `getOrgMembership()` in queries
- **URL structure**: Always include org slug in paths (`/org/[slug]/...`)
- **Mobile-first**: Test responsive behavior at `md` breakpoint (768px)
- **Confirmation dialogs**: Use `ConfirmDialog` component, never browser `confirm()`
- **Delete operations**: Respect `isWithinDeleteWindow()` for transaction deletions by logistic role
- **Analytics queries**: Use `useAnalyticsQuery` hook, not `useQuery`, to avoid subscription overhead
