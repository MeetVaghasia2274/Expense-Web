import { create } from 'zustand';
import {
  getAllExpenses,
  insertExpense,
  updateExpense as dbUpdateExpense,
  deleteExpense as dbDeleteExpense,
  getAllGroups,
  insertGroup,
  deleteGroup as dbDeleteGroup,
  getAllBudgets,
  saveBudget as dbSaveBudget,
  deleteBudget as dbDeleteBudget,
} from './db';
import type { Category, CustomGroup, Expense, Group, PaymentMethod, Budget } from '../types/expense';

interface AppState {
  // ── Expense data ──────────────────────────────────
  expenses: Expense[];
  deletedExpenses: Expense[];
  loadExpenses: () => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  removeExpense: (id: string) => Promise<void>; // Soft delete
  permanentlyDeleteExpense: (id: string) => Promise<void>;
  restoreExpense: (id: string) => Promise<void>;

  // ── Group data ────────────────────────────────────
  customGroups: CustomGroup[];
  loadGroups: () => Promise<void>;
  addGroup: (group: CustomGroup) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;

  // ── Budget data ───────────────────────────────────
  budgets: Budget[];
  loadBudgets: () => Promise<void>;
  updateBudget: (budget: Budget) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;

  // ── Log sheet state ───────────────────────────────
  sheetOpen: boolean;
  expenseToEdit: Expense | null;
  openSheet: () => void;
  closeSheet: () => void;
  setExpenseToEdit: (e: Expense | null) => void;

  // ── Last-used defaults ────────────────────────────
  lastCategory: Category;
  lastPayment: PaymentMethod;
  lastGroup: Group;
  setLastCategory: (c: Category) => void;
  setLastPayment: (p: PaymentMethod) => void;
  setLastGroup: (g: Group) => void;

  // ── Toast ─────────────────────────────────────────
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // ── Expense data ──────────────────────────────────
  expenses: [],
  deletedExpenses: [],
  customGroups: [],
  budgets: [],

  loadExpenses: async () => {
    const all = await getAllExpenses();
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    
    const active: Expense[] = [];
    const deleted: Expense[] = [];

    for (const e of all) {
      if (e.deletedAt) {
        if (now - new Date(e.deletedAt).getTime() > SEVEN_DAYS_MS) {
          // Permanently delete
          await dbDeleteExpense(e.id);
        } else {
          deleted.push(e);
        }
      } else {
        active.push(e);
      }
    }
    
    set({ expenses: active, deletedExpenses: deleted });
  },

  addExpense: async (expense: Expense) => {
    await insertExpense(expense);
    set((state) => ({ expenses: [expense, ...state.expenses] }));
  },

  updateExpense: async (expense: Expense) => {
    await dbUpdateExpense(expense);
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === expense.id ? expense : e)),
    }));
  },

  removeExpense: async (id: string) => {
    const expense = get().expenses.find((e) => e.id === id);
    if (!expense) return;
    const deletedExpense = { ...expense, deletedAt: new Date().toISOString() };
    await dbUpdateExpense(deletedExpense);
    
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
      deletedExpenses: [deletedExpense, ...state.deletedExpenses],
    }));
  },

  permanentlyDeleteExpense: async (id: string) => {
    await dbDeleteExpense(id);
    set((state) => ({
      deletedExpenses: state.deletedExpenses.filter((e) => e.id !== id),
    }));
  },

  restoreExpense: async (id: string) => {
    const expense = get().deletedExpenses.find((e) => e.id === id);
    if (!expense) return;
    const restoredExpense = { ...expense };
    delete restoredExpense.deletedAt;
    await dbUpdateExpense(restoredExpense);
    
    set((state) => ({
      deletedExpenses: state.deletedExpenses.filter((e) => e.id !== id),
      // keep it sorted roughly
      expenses: [restoredExpense, ...state.expenses].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));
  },

  // ── Group data ────────────────────────────────────
  loadGroups: async () => {
    const groups = await getAllGroups();
    set({ customGroups: groups });
  },

  addGroup: async (group: CustomGroup) => {
    await insertGroup(group);
    set((state) => ({ customGroups: [...state.customGroups, group] }));
  },

  removeGroup: async (id: string) => {
    await dbDeleteGroup(id);
    set((state) => ({
      customGroups: state.customGroups.filter((g) => g.id !== id),
      // If lastGroup was the one deleted, reset to personal
      lastGroup: get().lastGroup === id ? 'personal' : get().lastGroup,
    }));
  },

  // ── Budget data ───────────────────────────────────
  loadBudgets: async () => {
    const b = await getAllBudgets();
    set({ budgets: b });
  },

  updateBudget: async (budget: Budget) => {
    await dbSaveBudget(budget);
    set((state) => ({
      budgets: state.budgets.find(b => b.id === budget.id)
        ? state.budgets.map(b => b.id === budget.id ? budget : b)
        : [...state.budgets, budget]
    }));
  },

  removeBudget: async (id: string) => {
    await dbDeleteBudget(id);
    set((state) => ({
      budgets: state.budgets.filter(b => b.id !== id)
    }));
  },

  // ── Log sheet state ───────────────────────────────
  sheetOpen: false,
  expenseToEdit: null,
  openSheet:  () => set({ sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false, expenseToEdit: null }),
  setExpenseToEdit: (e) => set({ expenseToEdit: e }),

  // ── Last-used defaults ────────────────────────────
  lastCategory: 'food',
  lastPayment:  'upi',
  lastGroup:    'personal',
  setLastCategory: (c) => set({ lastCategory: c }),
  setLastPayment:  (p) => set({ lastPayment: p }),
  setLastGroup:    (g) => set({ lastGroup: g }),

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
