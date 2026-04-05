# Expense Mobile — PWA Web App Prompt

## Project Overview

Build a **Progressive Web App (PWA)** expense tracker using React + Vite.
It must work as both a regular web app (desktop/mobile browser) and as an
installable PWA (add to home screen on iPhone via Safari).

Primary use: iPhone home screen, used multiple times daily to log expenses quickly.
Design priority: SPEED. Logging an expense must take under 10 seconds.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | React 18 + Vite | Fast dev server, great PWA support |
| Language | TypeScript | Strict mode on |
| Styling | Tailwind CSS | Mobile-first utility classes |
| State | Zustand | Lightweight, no boilerplate |
| Local storage | IndexedDB via `idb` package | Offline-first, persists across sessions |
| PWA | `vite-plugin-pwa` | Service worker + manifest auto-generated |
| Charts | Recharts | Trends screen |
| Routing | React Router v6 | 3 routes only |

---

## PWA Requirements

- `manifest.json` with: name, short_name, icons (192px + 512px), theme_color, background_color, display: standalone, orientation: portrait
- Service worker that caches all assets for full offline use
- Works on Safari iOS (Add to Home Screen → opens fullscreen, no browser chrome)
- App icon: use a clean ₹ symbol on dark navy background — generate via canvas or use an SVG icon
- Splash screen color: `#0D1117`
- Theme color: `#2DD4BF` (teal)

---

## Design System

### Colors
```css
--bg-primary: #0D1117;       /* dark navy — main background */
--bg-secondary: #161B22;     /* slightly lighter — cards, sheets */
--bg-tertiary: #21262D;      /* inputs, inactive chips */
--accent: #2DD4BF;           /* teal — CTAs, selected states */
--accent-dim: #1A9E8F;       /* darker teal — pressed states */
--text-primary: #F0F6FC;     /* white — main text */
--text-secondary: #8B949E;   /* gray — labels, hints */
--text-amount: #2DD4BF;      /* teal — amount display */
--danger: #F85149;           /* red — delete */
--success: #3FB950;          /* green — save confirmation */
--border: #30363D;           /* subtle borders */
```

### Typography
- Amount display: `font-size: 56px`, monospaced font (`font-variant-numeric: tabular-nums`)
- Headings: 20px, weight 600
- Body: 15px, weight 400
- Labels/chips: 13px, weight 500

### Layout
- Max width: 430px (iPhone-sized), centered on desktop with dark background outside
- All interactive elements: minimum 48×48px tap targets
- Bottom safe area padding for iPhone notch: `padding-bottom: env(safe-area-inset-bottom)`
- No horizontal scroll ever

---

## App Structure

```
/src
  /components
    NumberPad.tsx         ← Custom number keypad
    CategoryGrid.tsx      ← 6 icon category selector
    PaymentChips.tsx      ← Cash / UPI / Card chips
    LogSheet.tsx          ← Bottom sheet for logging
    ExpenseRow.tsx        ← Single expense list item
    MonthHeader.tsx       ← Month name + total spent
    BottomNav.tsx         ← Home / Trends tab bar
  /screens
    HomeScreen.tsx        ← Today's expenses + FAB
    TrendsScreen.tsx      ← Charts + history
  /lib
    db.ts                 ← IndexedDB setup via idb
    store.ts              ← Zustand store
  /types
    expense.ts            ← TypeScript types
  App.tsx
  main.tsx
/public
  manifest.json
  icon-192.png
  icon-512.png
  sw.js                   ← handled by vite-plugin-pwa
```

---

## Data Model

```typescript
type Expense = {
  id: string;
  amount: number;
  category: Category;
  paymentMethod: PaymentMethod;
  note?: string;
  createdAt: string;       // ISO 8601
};

type Category =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'groceries'
  | 'health'
  | 'other';

type PaymentMethod = 'cash' | 'upi' | 'card';

const CATEGORY_META = {
  food:      { label: 'Food & Chai', emoji: '🍵' },
  transport: { label: 'Transport',   emoji: '🚗' },
  shopping:  { label: 'Shopping',    emoji: '🛍' },
  groceries: { label: 'Groceries',   emoji: '🛒' },
  health:    { label: 'Health',      emoji: '💊' },
  other:     { label: 'Other',       emoji: '⋯'  },
};
```

---

## Screen 1 — Home Screen

**Layout (top to bottom):**

1. **Month header** — current month name left, total spent right (e.g. `April` · `₹4,250`)
2. **Today section** — "Today" label + today's subtotal
3. **Expense list** — scrollable, most recent first
4. **FAB** — `+` button fixed at bottom center, opens LogSheet on tap
5. **Bottom nav** — Home · Trends (fixed at very bottom)

**Expense row layout:**
- Left: category emoji in colored circle
- Middle: category name (top) + payment chip (bottom)
- Right: amount in teal `₹150`
- Swipe left to delete (with red background reveal)

---

## Screen 2 — Log Expense (Bottom Sheet)

This is the most critical screen. Animate it sliding up from the bottom.

**Layout inside sheet (top to bottom):**

1. **Handle bar** — small gray pill at top center (drag indicator)

2. **Amount display** — large teal number showing current input
   - Shows `₹ 0` by default, updates as user taps keypad
   - Monospaced font so digits don't shift layout

3. **Number pad** — 3×4 grid of buttons
   ```
   1  2  3
   4  5  6
   7  8  9
   .  0  ⌫
   ```
   - Large buttons, fill the width
   - Tap sound / haptic if supported (`navigator.vibrate(10)`)

4. **Category grid** — 2 rows × 3 columns of icon buttons
   - Each shows emoji + label below
   - Selected state: teal border + teal emoji background

5. **Payment chips** — horizontal row: `Cash` · `UPI` · `Card`
   - UPI pre-selected by default
   - Selected chip: teal background, dark text

6. **Save button** — full width, teal background, `Save ₹{amount}`
   - Disabled (grayed) if amount is 0
   - On tap: save to IndexedDB → close sheet → show success toast

**Smart defaults:**
- Remember last used category and payment method
- Pre-select them when sheet opens next time

---

## Screen 3 — Trends Screen

- **Month selector** — `< April 2025 >` with left/right arrows
- **Total card** — big number showing month total
- **Bar chart** — last 6 months spending (Recharts BarChart)
- **Category donut** — current month breakdown by category (Recharts PieChart)
- **Transaction list** — all expenses for selected month, grouped by date

---

## IndexedDB Storage

```typescript
import { openDB } from 'idb';

const DB_NAME = 'expense-mobile';
const STORE = 'expenses';

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('createdAt', 'createdAt');
    },
  });
}

export async function insertExpense(expense: Expense) {
  const db = await initDB();
  await db.add(STORE, expense);
}

export async function getExpensesByMonth(year: number, month: number): Promise<Expense[]> {
  const db = await initDB();
  const all = await db.getAll(STORE);
  return all.filter(e => {
    const d = new Date(e.createdAt);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export async function deleteExpense(id: string) {
  const db = await initDB();
  await db.delete(STORE, id);
}
```

---

## Bottom Sheet Animation

Use CSS + React state, no external library:

```css
.sheet {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) translateY(100%);
  width: 100%;
  max-width: 430px;
  background: var(--bg-secondary);
  border-radius: 20px 20px 0 0;
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 100;
}

.sheet.open {
  transform: translateX(-50%) translateY(0);
}

.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  opacity: 0;
  transition: opacity 0.35s;
  z-index: 99;
}

.sheet-backdrop.open {
  opacity: 1;
}
```

---

## PWA Installation UX

Show an "Add to Home Screen" banner the first time a user visits on mobile Safari:

```typescript
// Detect iOS Safari
const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
const isInStandaloneMode = ('standalone' in navigator) && navigator.standalone;

if (isIOS && !isInStandaloneMode) {
  // Show banner: "Tap Share → Add to Home Screen for the best experience"
}
```

---

## What NOT to Build

- No user authentication
- No cloud sync (Phase 2 if needed)
- No receipt photo capture
- No budgets or alerts
- No multi-currency
- No dark/light toggle — dark only
- No animations beyond sheet open/close and toast

---

## Definition of Done

- [ ] Logs a new expense in under 10 seconds
- [ ] Works fully offline after first visit
- [ ] Installable on iPhone via Safari "Add to Home Screen"
- [ ] All data persists in IndexedDB across sessions
- [ ] Home screen shows today's total and expense list
- [ ] Trends screen shows bar chart + category donut
- [ ] Swipe to delete works on mobile
- [ ] No horizontal scroll on any screen
- [ ] Tap targets minimum 48×48px throughout