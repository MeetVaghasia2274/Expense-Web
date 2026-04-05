# Expense Mobile
A lightning-fast, offline-first Progressive Web App (PWA) expense tracker designed for iOS & Android mobile browsers.

## 🚀 Features
- **Extremely Fast Logging**: Designed to minimize time taken to log expenses, under 10 seconds. Snappy Bottom Sheet with custom numpad. 
- **Offline First**: Fully caches core assets and uses IndexedDB for storing expenses. It works perfectly without an internet connection.
- **PWA Ready**: Can be installed to the home screen (iOS Safari "Add to Home Screen"). Works seamlessly like a native app.
- **Swipe Actions**: Swipe left on items in the ledger to quickly delete.
- **Trends & Charts**: Visual data breakdown across 6 months via Recharts (Bar & Pie donuts).

## 🛠 Tech Stack
- Frontend: `React 18`, `TypeScript`, `Vite`
- DB/State: `IndexedDB` (via `idb`) & `Zustand`
- Styling: `Tailwind CSS`, custom Variables + Reset properties
- Service Worker: `vite-plugin-pwa`

## 📦 Local Development
1. Install dependencies
   ```sh
   npm install
   ```

2. Start the dev server
   ```sh
   npm run dev
   ```

3. Build for production
   ```sh
   npm run build
   ```
