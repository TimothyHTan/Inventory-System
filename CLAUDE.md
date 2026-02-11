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
- `app/page.tsx` — redirects to onboarding or organization dashboard
- **Multi-tenant structure**: `/org/[slug]/dashboard`, `/org/[slug]/products/[id]`, `/org/[slug]/settings`
- Legacy routes redirect to organization-scoped equivalents

### Backend (Convex)
- `convex/schema.ts` — tables: `users`, `organizations`, `organizationMembers`, `invites`, `products`, `transactions`
- `convex/organizations.ts` — org CRUD, invites, membership management
- `convex/products.ts` — CRUD + full-text search + bulk delete
- `convex/transactions.ts` — add/list/remove transactions + bulk delete (updates product stock atomically)
- `convex/users.ts` — user lookup, role management
- `convex/helpers.ts` — shared auth helpers (`requireOrgRole`, `getOrgMembership`)
- `convex/auth.ts` + `convex/auth.config.ts` — password-based email authentication with 2FA/OTP support
- `convex/_generated/` — auto-generated types, never edit manually

### Data Flow
- No REST API — React components call Convex queries/mutations directly via `useQuery(api.*)` and `useMutation(api.*)`
- All data updates are real-time (Convex reactivity)
- Transactions and stock updates are atomic — both happen in the same mutation
- Organization context provided via `OrganizationProvider` React context

### Key Data Model Details
- **Multi-tenancy**: All products and transactions scoped to `organizationId`
- **Organizations**: Users can belong to multiple orgs with different roles per org
- **Invites**: 8-character alphanumeric codes for inviting users to organizations
- `products.currentStock` is denormalized (updated on every transaction)
- `transactions.runningBalance` is a snapshot of stock at transaction time
- `transactions.date` is a user-selected business date (string, ISO format) — distinct from `createdAt` system timestamp
- Products have a search index on `name` with `organizationId` filter

## Auth & Roles

- **Organization-scoped roles**: `admin`, `member`, `viewer`
- Admin: full control (manage products, users, invites, delete operations)
- Member: can add/edit products and transactions
- Viewer: read-only access
- Every query/mutation checks `getAuthUserId(ctx)` for authentication
- Org-specific operations check role via `requireOrgRole()` helper

## Multi-Tenancy

### Organization Structure
- Users can create or join multiple organizations
- Each org has a unique slug for URLs (`/org/[slug]/...`)
- Organization membership tracked in `organizationMembers` table
- Invites use 8-char codes, support max uses and revocation

### Organization Provider
- `OrganizationProvider` — React context that resolves slug → org + membership
- Provides: `org`, `membership`, `isAdmin`, `canEdit`, `isLoading`
- All org pages wrapped in this provider

### Key Components
- `OrgSwitcher` — dropdown for switching between user's organizations
- `Navbar` — org-aware navigation with mobile hamburger menu
- `ProductCard` — supports delete mode with checkboxes
- `TransactionTable` — supports delete mode with animated checkboxes
- `ConfirmDialog` — custom confirmation modal matching design system

## UI Conventions

### Language & Terminology
- **Language**: Indonesian for all UI text and error messages; English for code/comments
- **Key Indonesian terms**: MASUK (stock in), KELUAR (stock out), SISA (balance), KETERANGAN (description)

### Design System
- **Styling**: Tailwind CSS with custom color tokens:
  - `carbon` (neutrals) — warm dark grays
  - `copper` (#D4915C) — primary accent
  - `sage` (#7B9E6B) — stock-in/success
  - `rust` (#C75C5C) — stock-out/danger
- **Fonts**:
  - Instrument Serif (display)
  - Outfit (body)
  - IBM Plex Mono (numbers)
- **Animations**: Motion library (formerly Framer Motion)
  - Page transitions via `PageTransition` component
  - Staggered list animations with `AnimatePresence`
  - Smooth enter/exit animations (0.3s duration, cubic-bezier easing)
- **Component variants**:
  - Button: `primary`, `secondary`, `ghost`, `danger`
  - Badge: `copper`, `muted`
- **Responsive**: Mobile-first with hamburger menu (`md` breakpoint)

### Key UI Features
- **Delete Mode**: Toggle mode for bulk deletion with checkboxes
  - ProductCard: Checkbox appears top-right, stock number shifts down
  - TransactionTable: Checkbox column animates in/out
  - Custom ConfirmDialog replaces browser `confirm()`
- **Inline Edit**: Product name/description editable directly on detail page
- **Mobile Navigation**: Hamburger menu with smooth animations
- **Loading States**: Spinners during async operations

### Formatting Helpers
- `lib/utils.ts` — `formatDate`, `formatNumber`, `formatMonth`, `timeAgo` (Indonesian locale)

## Key Features

### Product Management
- Search with real-time filtering
- Bulk delete with confirmation dialog
- Inline rename (name + description)
- Stock level indicators (empty/low/normal)
- Automatic transaction tracking

### Transaction Management
- Add MASUK/KELUAR transactions
- Month-based filtering
- Bulk delete with stock adjustment
- Running balance calculation
- Business date selection (independent of creation time)

### Organization Management
- Create/join organizations
- Invite system with shareable codes
- Role-based access control per org
- Organization switching via dropdown

## Environment Variables

Required in `.env.local` (see `.env.local.example`):
- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL
- `AUTH_SECRET` — auth signing secret (generate with `openssl rand -base64 32`)
- `CONVEX_SITE_URL` — site URL for auth callbacks (e.g., `http://localhost:3000`)

## Animation Guidelines

All animations use Motion library with consistent timing:
- **Duration**: 0.3s for most transitions
- **Easing**: `[0.16, 1, 0.3, 1]` (custom cubic-bezier)
- **Patterns**:
  - Fade + scale for modals/dialogs
  - Fade + slide for button groups
  - Stagger for lists (0.02-0.04s delay per item)
  - Layout animations for conditional rendering

## Development Notes

- **Organization-scoped data**: Always filter by `organizationId` in queries
- **Permission checks**: Use `requireOrgRole()` in mutations, `getOrgMembership()` in queries
- **URL structure**: Always include org slug in paths (`/org/[slug]/...`)
- **Mobile-first**: Test responsive behavior at `md` breakpoint (768px)
- **Confirmation dialogs**: Use `ConfirmDialog` component, never browser `confirm()`
- **Delete operations**: Admin-only, with proper confirmation and loading states
