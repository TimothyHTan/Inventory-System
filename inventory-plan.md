# StockCard — Digital Inventory System

## Description

StockCard is a web-based inventory management system that digitizes the paper-based "Kartu Stock" (stock card) workflow used by a small distribution company in Indonesia. The system tracks product inventory through incoming shipments (MASUK) and outgoing sales/distributions (KELUAR), automatically computing running balances (SISA) — replacing handwritten ledger cards with a simple, cloud-hosted interface.

**The problem it solves:** The current paper system works, but it's fragile. Cards get lost, numbers get miscalculated, and there's no way to check stock levels remotely. The owner's son studies in China and needs visibility into operations from overseas.

**What it is not:** This is not an ERP, a POS system, or an accounting tool. It does one thing — track what comes in, what goes out, and what's left — and it does it simply.

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14+ (App Router, TypeScript) | Full-stack in one codebase. Server components for fast loads. |
| Styling | Tailwind CSS | Utility-first, no separate CSS files to manage. |
| Animation | Motion (formerly Framer Motion) | Declarative animations for page transitions, list reordering, and micro-interactions. Lightweight and works natively with React. |
| Database + Backend | Convex | Real-time by default, no REST API to build, auto-generated TypeScript types. Handles auth, database, and server functions in one service. |
| Hosting | Vercel | Zero-config deployment for Next.js. Free tier is sufficient. |
| Runtime + Package Manager | Bun | Faster installs, faster scripts, drop-in replacement for Node + npm. |
| Auth | Convex Auth (email/password) | Built into the same platform. No third-party auth service needed. |

### Key Constraints

- **Users:** 2–5 staff members in one warehouse, plus 1 remote user (owner's son in China)
- **Scale:** ~20–50 products, ~10–30 transactions per day
- **Budget:** Free tier for everything. Only cost is a custom domain (~$10/year)
- **Maintenance:** Must be simple enough that a college student can fix issues remotely
- **Access:** Must work from both Indonesia and China (firewall considerations)

---

## Structure

### Data Schema (Convex Tables)

```
// schema.ts — Convex schema definition

products
├── name: string              // e.g. "Typhonium Plus"
├── description?: string      // optional notes
├── currentStock: number      // denormalized running total
├── createdAt: number         // timestamp
└── updatedAt: number         // timestamp

transactions
├── productId: Id<"products"> // foreign key
├── date: string              // "2026-01-15" — the business date (may differ from entry time)
├── type: "in" | "out"        // MASUK or KELUAR
├── quantity: number           // always positive
├── description: string        // customer/supplier name (KETERANGAN)
├── runningBalance: number     // SISA — snapshot at time of transaction
├── createdAt: number          // when the record was actually entered
└── createdBy?: Id<"users">   // who entered it (for audit trail)

users (managed by Convex Auth)
├── email: string
├── name: string
└── role: "admin" | "staff"   // admin can add products + users; staff can only log transactions
```

### Page Map

```
/                           → redirects to /dashboard
/login                      → email + password login

/dashboard                  → product list with current stock levels
                              - search bar (filter by product name)
                              - each row shows: product name, current stock, last updated
                              - click row → goes to /products/[id]
                              - "Add Product" button (admin only)

/products/[id]              → single product stock card (the digital Kartu Stock)
                              - header: product name, current stock count
                              - transaction table: date | keterangan | masuk | keluar | sisa
                              - "Add Transaction" button → opens modal/form
                              - date filter (month picker)

/products/[id]/add          → add transaction form (or modal on the same page)
                              - type toggle: MASUK / KELUAR
                              - quantity (number input)
                              - description (text — customer/supplier name)
                              - date (defaults to today, editable)

/products/new               → add new product form (admin only)
                              - product name
                              - initial stock count
                              - optional description

/settings                   → user management (admin only)
                              - list users, invite new user
```

### Project File Structure

```
stockcard/
├── app/
│   ├── layout.tsx              # root layout (providers, fonts)
│   ├── page.tsx                # redirect to /dashboard
│   ├── login/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── products/
│   │   ├── [id]/
│   │   │   └── page.tsx        # stock card view
│   │   └── new/
│   │       └── page.tsx
│   └── settings/
│       └── page.tsx
│
├── components/
│   ├── ui/                     # reusable primitives (Button, Input, Modal, etc.)
│   ├── motion/                 # animation wrappers (PageTransition, AnimatedList, etc.)
│   ├── TransactionTable.tsx    # the stock card table
│   ├── TransactionForm.tsx     # add transaction modal/form
│   ├── ProductCard.tsx         # dashboard list item
│   ├── SearchBar.tsx
│   └── Navbar.tsx
│
├── convex/
│   ├── schema.ts               # table definitions (products, transactions)
│   ├── products.ts             # queries + mutations for products
│   ├── transactions.ts         # queries + mutations for transactions
│   ├── users.ts                # user-related functions
│   └── auth.config.ts          # Convex Auth configuration
│
├── lib/
│   └── utils.ts                # formatters, helpers
│
├── tailwind.config.ts
├── next.config.ts
├── convex.json
└── package.json
```

---

## How It Works

### Core Flow

The entire app revolves around one action: **logging a transaction**. Here's exactly what happens:

```
Staff opens /products/typhonium-plus
  → sees current stock: 5102
  → clicks "Add Transaction"
  → selects: KELUAR (out)
  → enters: quantity = 48, description = "Sentosa Palembang"
  → clicks Save

What happens on save:
  1. Convex mutation fires (addTransaction)
  2. Reads current product stock: 5102
  3. Calculates new balance: 5102 - 48 = 5054
  4. Inserts transaction record:
       { productId, date: "2026-02-05", type: "out",
         quantity: 48, description: "Sentosa Palembang",
         runningBalance: 5054 }
  5. Updates product.currentStock → 5054
  6. Both writes happen in one Convex mutation (atomic)
  7. UI updates in real-time — no refresh needed
```

Because Convex mutations are transactional, steps 4–5 either both succeed or both fail. No inconsistent state.

### Convex Functions (Server Logic)

All business logic lives in the `convex/` folder and runs server-side. No API routes to write.

**Key mutations:**

```typescript
// convex/transactions.ts — pseudocode

addTransaction(productId, type, quantity, description, date):
  // 1. get current stock
  product = db.get(productId)

  // 2. calculate new balance
  if type === "out" and quantity > product.currentStock:
    throw "Not enough stock"  // prevent negative inventory

  newBalance = type === "in"
    ? product.currentStock + quantity
    : product.currentStock - quantity

  // 3. insert transaction with running balance
  db.insert("transactions", {
    productId, type, quantity, description, date,
    runningBalance: newBalance,
    createdAt: Date.now()
  })

  // 4. update product (atomic — same mutation)
  db.patch(productId, {
    currentStock: newBalance,
    updatedAt: Date.now()
  })
```

**Key queries:**

```typescript
// convex/products.ts — pseudocode

listProducts():
  return db.query("products").order("desc").collect()

getProduct(productId):
  return db.get(productId)

// convex/transactions.ts

getTransactions(productId, month?):
  query = db.query("transactions")
    .withIndex("by_product", q => q.eq("productId", productId))
    .order("desc")

  if month:
    filter by date prefix  // e.g. "2026-01"

  return query.collect()
```

### Convex Indexes

```typescript
// schema.ts — indexes for fast queries
transactions: defineTable({...})
  .index("by_product", ["productId"])           // all transactions for one product
  .index("by_product_date", ["productId", "date"])  // filter by product + date range
```

### Auth Flow

Convex Auth handles session management. Simple email/password — no OAuth needed for this scale.

```
1. Admin creates accounts for staff (or staff self-registers with a shared invite code)
2. Staff logs in at /login → Convex issues session token
3. All Convex queries/mutations check auth — unauthenticated users see nothing
4. Admin role can: add products, manage users
5. Staff role can: view products, add transactions
```

### Real-Time Updates

Convex queries are reactive. If two staff members are looking at the same product page and one adds a transaction, the other sees the update instantly — no polling, no WebSocket setup, no refresh button. This is built into how Convex works.

### How the Transaction Table Renders

The stock card table mirrors the paper format:

```
┌──────────┬──────────────────────┬───────┬────────┬──────┐
│   DATE   │     KETERANGAN       │ MASUK │ KELUAR │ SISA │
├──────────┼──────────────────────┼───────┼────────┼──────┤
│ 2/5/2026 │ Sentosa Palembang    │       │   48   │ 5102 │
│ 2/5/2026 │ Sentosa Palembang    │       │   15   │ 5150 │
│ 2/5/2026 │ Aman Jelutung        │       │   30   │ 5165 │
│ 2/5/2026 │ Stok Hendrik         │  25   │        │ 5195 │
│ 2/5/2026 │ Asep Mulyono         │       │   12   │ 5207 │
│   ...    │         ...          │  ...  │  ...   │ ...  │
└──────────┴──────────────────────┴───────┴────────┴──────┘
```

Each row is one transaction record. MASUK column shows quantity if `type === "in"`, KELUAR if `type === "out"`. SISA is always `runningBalance`.

---

## Animation (Motion)

Keep animations subtle and functional — this is a warehouse tool, not a portfolio site. Motion is used for three things:

### Page Transitions

Wrap page content in a `<motion.div>` with a simple fade + slight upward slide on mount. Keeps navigation feeling smooth without being distracting.

```typescript
// components/motion/PageTransition.tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
>
  {children}
</motion.div>
```

### List Animations

Use `AnimatePresence` + `layout` on the product list and transaction table. When a new transaction is logged (Convex pushes the update in real-time), the new row slides in at the top instead of just appearing. Existing rows shift down smoothly.

```typescript
// Inside TransactionTable.tsx
<AnimatePresence>
  {transactions.map(tx => (
    <motion.tr
      key={tx._id}
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    />
  ))}
</AnimatePresence>
```

### Micro-interactions

- **Transaction form modal**: slides up from bottom on mobile, fades in on desktop
- **Stock count badge**: number animates when stock changes (brief scale pulse)
- **Success feedback**: checkmark animation after saving a transaction
- **Buttons**: subtle scale on press (`whileTap={{ scale: 0.97 }}`)

### What NOT to animate

- Navigation bar — keep it static
- Table sorting/filtering — just swap data, no animation
- Login page — keep it plain
- Anything that slows down data entry for warehouse staff

---

## Deployment & Access

### First Deploy

```
0. Initialize project         → bun create next-app stockcard --typescript --tailwind --app
                               → bun add convex motion
1. Create Convex project     → bunx convex dev (sets up cloud database)
2. Push schema + functions   → bunx convex deploy
3. Deploy frontend to Vercel → vercel deploy (or connect GitHub repo for auto-deploy)
4. Set environment variable  → NEXT_PUBLIC_CONVEX_URL in Vercel dashboard
5. Buy domain                → point DNS to Vercel
```

### China Firewall Considerations

- **Vercel**: Generally accessible from China, but `*.vercel.app` subdomains can be unreliable. A custom domain with proper DNS is more stable.
- **Convex**: Uses WebSocket connections. Test from your campus network in China early. If blocked, you may need to access via a VPN (which you likely already use for development).
- **Recommendation**: Buy a `.com` domain. Set it up on Vercel. Test from China before going live in Indonesia.

### Migration from Paper

Don't backfill history. For each product:

1. Look at the latest SISA on the paper card
2. Create the product in the app with that number as initial stock
3. Start logging new transactions digitally
4. Keep paper cards as archive for anything before the cutover date

---

## Build Order

| Phase | What | Estimated Time |
|-------|------|---------------|
| 1 | Project setup: `bun create next-app`, add Tailwind + Convex + Motion, deploy empty app to Vercel | 1–2 hours |
| 2 | Schema + basic Convex functions (products CRUD, transactions CRUD) | 2–3 hours |
| 3 | Auth: login page, role-based access | 2–3 hours |
| 4 | Dashboard: product list with search | 2–3 hours |
| 5 | Product detail: transaction table (the stock card view) | 3–4 hours |
| 6 | Transaction form: add MASUK/KELUAR entries | 2–3 hours |
| 7 | Polish: loading states, error handling, mobile responsiveness | 2–3 hours |
| 8 | Custom domain + test from China and Indonesia | 1 hour |
| **Total** | | **~15–22 hours** |

---

## Monthly Cost

| Service | Tier | Cost |
|---------|------|------|
| Vercel | Free (Hobby) | $0 |
| Convex | Free | $0 |
| Domain | .com | ~$10/year |
| **Total** | | **~$0.83/month** |

---

## Future Additions (Not for v1)

- **Export to Excel**: download transaction history as `.xlsx` for accounting
- **Low stock alerts**: notification when a product drops below a threshold
- **Batch entry**: enter multiple transactions at once (for catching up after a busy day)
- **Product categories**: group products by type
- **Print stock card**: generate a PDF that looks like the paper card