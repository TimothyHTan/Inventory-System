# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StockCard — a full-stack inventory management app digitizing paper-based "Kartu Stock" (stock card) for an Indonesian distribution company. Built with Next.js 15 (App Router) + Convex (real-time backend) + TypeScript. Uses Bun as the package manager/runtime.

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
- `app/page.tsx` — redirects to `/dashboard`
- Pages: `/login`, `/dashboard`, `/products/[id]`, `/products/new`, `/settings`

### Backend (Convex)
- `convex/schema.ts` — three tables: `users`, `products`, `transactions`
- `convex/products.ts` — CRUD + full-text search on product name
- `convex/transactions.ts` — add/list/remove transactions (updates product stock atomically)
- `convex/users.ts` — user lookup, role management, first-admin setup
- `convex/auth.ts` + `convex/auth.config.ts` — password-based email authentication
- `convex/_generated/` — auto-generated types, never edit manually

### Data Flow
- No REST API — React components call Convex queries/mutations directly via `useQuery(api.*)` and `useMutation(api.*)`
- All data updates are real-time (Convex reactivity)
- Transactions and stock updates are atomic — both happen in the same mutation

### Key Data Model Details
- `products.currentStock` is denormalized (updated on every transaction)
- `transactions.runningBalance` is a snapshot of stock at transaction time
- `transactions.date` is a user-selected business date (string, ISO format) — distinct from `createdAt` system timestamp, since staff may log transactions from previous days
- Products have a search index on `name` for dashboard search

## Auth & Roles

- Two roles: `admin` and `staff`
- First user can self-promote to admin via `setupFirstAdmin()` mutation
- Admin: manage products, manage users, log transactions
- Staff: log transactions only
- Every query/mutation checks `getAuthUserId(ctx)` for authentication; admin-only operations additionally check `user.role === "admin"`

## UI Conventions

- **Language**: Indonesian for all UI text and error messages; English for code/comments
- **Key Indonesian terms**: MASUK (stock in), KELUAR (stock out), SISA (balance), KETERANGAN (description)
- **Styling**: Tailwind CSS with custom color tokens — `carbon` (neutrals), `copper` (accent), `sage` (stock-in/green), `rust` (stock-out/red)
- **Fonts**: Instrument Serif (display), Outfit (body), IBM Plex Mono (numbers)
- **Animations**: Motion library (formerly Framer Motion) — `components/motion/` for page transitions and animated lists
- **Component variants**: Button supports `primary`/`secondary`/`ghost`/`danger` variants
- `lib/utils.ts` — formatting helpers (`formatDate`, `formatNumber`, `formatMonth`, `timeAgo`) use Indonesian locale

## Environment Variables

Required in `.env.local` (see `.env.local.example`):
- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL
- `AUTH_SECRET` — auth signing secret (generate with `openssl rand -base64 32`)
- `CONVEX_SITE_URL` — site URL for auth callbacks (e.g., `http://localhost:3000`)
