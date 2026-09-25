# Expense Web

A fast, offline-first Progressive Web App for personal expense tracking. Designed for mobile use — installable on iOS and Android with full native-like behavior including cloud sync, push notifications and local data persistence.

---

## Features

### Expense Logging
- Minimal-tap logging flow via a bottom sheet with a custom numeric keypad
- Categorize expenses by type (Food, Transport, Shopping, Groceries, Health, Other)
- Tag expenses by payment method (Cash, UPI, Card) and group (Personal, Office, College, custom)
- Swipe left on any entry to edit or delete
- Soft-delete with a 7-day trash recovery window

### Data & Sync
- Offline-first architecture using IndexedDB for local persistence
- Cloud backup and multi-device sync via Supabase (PostgreSQL)
- Email and password authentication with secure session management
- Automatic sync on login and on any data mutation
- CSV import via paste, PDF export with category summaries

### Push Notifications
- Web Push notifications delivered to the device lock screen even when the app is closed
- Weekly spending summary delivered every Sunday
- Month-end summary delivered on the last day of each month
- Subscription stored in Supabase, triggered via scheduled Edge Functions
- Compatible with iOS 16.4+ (Home Screen PWA) and Android Chrome

### Analytics
- Monthly and 6-month trend views with bar, radar, and pie charts via Recharts
- Per-category and per-group budget tracking with progress indicators
- Payment method breakdown

### PWA
- Installable on iOS via Safari Share > Add to Home Screen
- Installable on Android via Chrome Install prompt
- Fully cached assets via Workbox service worker
- Works entirely offline after first load

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, CSS custom properties |
| State Management | Zustand |
| Local Database | IndexedDB via `idb` |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| Push Notifications | Web Push API, VAPID, Supabase Edge Functions, pg_cron |
| Service Worker | vite-plugin-pwa (Workbox) |
| Charts | Recharts |
| PDF Export | jsPDF |

---

## Environment Variables

Create a `.env` file at the project root with the following:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
```

The VAPID private key must be stored as a secret in Supabase Edge Functions and is never exposed to the frontend.

---

## Local Development

```sh
# Install dependencies
npm install

# Start development server
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build
```



## Deployment

The project is configured for Vercel. Add all environment variables listed above to the Vercel project settings before deploying.

```sh
git push origin main
```

Vercel will build and deploy automatically on each push to `main`.

---

## Project Structure

```
src/
  components/       Reusable UI components (BottomNav, LogSheet, ExpenseRow, etc.)
  lib/              Core logic (store, db, supabase client, push notification helpers)
  screens/          Top-level page components (Home, Trends, Settings)
  types/            TypeScript type definitions
public/
  push-worker.js    Service worker push event handler
supabase/
  functions/        Edge Functions (send-push)
  migrations/       SQL migration files
```
