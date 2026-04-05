import { create } from 'zustand';
import type { Category, Expense, PaymentMethod } from '../types/expense';
import {
  getAllExpenses,
  insertExpense,
  deleteExpense as dbDeleteExpense,
} from './db';

interface AppState {
  // ── Expense data ──────────────────────────────────
  expenses: Expense[];
  loadExpenses: () => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;

  // ── Log sheet state ───────────────────────────────
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;

  // ── Last-used defaults ────────────────────────────
  lastCategory: Category;
  lastPayment: PaymentMethod;
  setLastCategory: (c: Category) => void;
  setLastPayment: (p: PaymentMethod) => void;

  // ── Toast ─────────────────────────────────────────
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // ── Expense data ──────────────────────────────────
  expenses: [],

  loadExpenses: async () => {
    const expenses = await getAllExpenses();
    set({ expenses });
  },

  addExpense: async (expense: Expense) => {
    await insertExpense(expense);
    // Optimistic update — prepend to list
    set((state) => ({ expenses: [expense, ...state.expenses] }));
  },

  removeExpense: async (id: string) => {
    await dbDeleteExpense(id);
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
  },

  // ── Log sheet state ───────────────────────────────
  sheetOpen: false,
  openSheet:  () => set({ sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false }),

  // ── Last-used defaults ────────────────────────────
  lastCategory: 'food',
  lastPayment:  'upi',
  setLastCategory: (c) => set({ lastCategory: c }),
  setLastPayment:  (p) => set({ lastPayment: p }),

  // ── Toast ─────────────────────────────────────────
  toastMessage: null,
  showToast: (msg: string) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      // Only clear if still the same message
      if (get().toastMessage === msg) set({ toastMessage: null });
    }, 2200);
  },
}));
