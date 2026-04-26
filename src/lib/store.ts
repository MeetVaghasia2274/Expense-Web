import { create } from 'zustand';
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';
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
  // ── Auth state ──────────────────────────────────
  user: User | null;
  session: Session | null;
  lastSynced: number | null;
  isSyncing: boolean;
  initializeAuth: () => void;
  signOut: () => Promise<void>;
  syncWithCloud: () => Promise<void>;

  // ── Expense data ──────────────────────────────────
  expenses: Expense[];
  deletedExpenses: Expense[];
  isLoading: boolean;
  loadExpenses: () => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  removeExpense: (id: string) => Promise<void>; // Soft delete
  permanentlyDeleteExpense: (id: string) => Promise<void>;
  restoreExpense: (id: string) => Promise<void>;
  clearTrash: () => Promise<void>;

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
  // ── Auth state ──────────────────────────────────
  user: null,
  session: null,
  lastSynced: Number(localStorage.getItem('last_synced')) || null,
  isSyncing: false,

  initializeAuth: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session) {
        // Trigger sync when user logs in
        get().syncWithCloud();
      }
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  // ── Expense data ──────────────────────────────────
  expenses: [],
  deletedExpenses: [],
  isLoading: true,
  customGroups: [],
  budgets: [],

  loadExpenses: async () => {
    set({ isLoading: true });
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

    set({ expenses: active, deletedExpenses: deleted, isLoading: false });
  },

  addExpense: async (expense: Expense) => {
    await insertExpense(expense);
    set((state) => ({ expenses: [expense, ...state.expenses] }));

    // Cloud Sync
    const { session } = get();
    if (session) {
      await supabase.from('expenses').upsert({ ...expense, user_id: session.user.id });
      const now = Date.now();
      localStorage.setItem('last_synced', String(now));
      set({ lastSynced: now });
    }
  },

  updateExpense: async (expense: Expense) => {
    await dbUpdateExpense(expense);
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === expense.id ? expense : e)),
    }));

    // Cloud Sync
    const { session } = get();
    if (session) {
      await supabase.from('expenses').upsert({ ...expense, user_id: session.user.id });
      const now = Date.now();
      localStorage.setItem('last_synced', String(now));
      set({ lastSynced: now });
    }
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

    // Cloud Sync
    const { session } = get();
    if (session) {
      await supabase.from('expenses').upsert({ ...deletedExpense, user_id: session.user.id });
      const now = Date.now();
      localStorage.setItem('last_synced', String(now));
      set({ lastSynced: now });
    }
  },

  permanentlyDeleteExpense: async (id: string) => {
    await dbDeleteExpense(id);
    set((state) => ({
      deletedExpenses: state.deletedExpenses.filter((e) => e.id !== id),
    }));

    // Cloud Sync
    const { session } = get();
    if (session) {
      await supabase.from('expenses').delete().eq('id', id);
      const now = Date.now();
      localStorage.setItem('last_synced', String(now));
      set({ lastSynced: now });
    }
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

  clearTrash: async () => {
    const { deletedExpenses, session } = get();
    if (deletedExpenses.length === 0) return;
    
    for (const e of deletedExpenses) {
      await dbDeleteExpense(e.id);
      if (session) {
        await supabase.from('expenses').delete().eq('id', e.id);
      }
    }
    
    set({ deletedExpenses: [] });
    get().showToast('Trash cleared!');
  },

  // ── Group data ────────────────────────────────────
  loadGroups: async () => {
    const groups = await getAllGroups();
    set({ customGroups: groups });
  },

  addGroup: async (group: CustomGroup) => {
    await insertGroup(group);
    set((state) => ({ customGroups: [...state.customGroups, group] }));

    // Cloud Sync
    const { session } = get();
    if (session) {
      await supabase.from('groups').upsert({ ...group, user_id: session.user.id });
      const now = Date.now();
      localStorage.setItem('last_synced', String(now));
      set({ lastSynced: now });
    }
  },

  removeGroup: async (id: string) => {
    await dbDeleteGroup(id);
    set((state) => ({
      customGroups: state.customGroups.filter((g) => g.id !== id),
      // If lastGroup was the one deleted, reset to personal
      lastGroup: get().lastGroup === id ? 'personal' : get().lastGroup,
    }));

    // Cloud Sync
    const { session } = get();
    if (session) {
      await supabase.from('groups').delete().eq('id', id);
      const now = Date.now();
      localStorage.setItem('last_synced', String(now));
      set({ lastSynced: now });
    }
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

    // Cloud Sync
    const { session } = get();
    if (session) {
      await supabase.from('budgets').upsert({ ...budget, user_id: session.user.id });
      const now = Date.now();
      localStorage.setItem('last_synced', String(now));
      set({ lastSynced: now });
    }
  },

  removeBudget: async (id: string) => {
    await dbDeleteBudget(id);
    set((state) => ({
      budgets: state.budgets.filter(b => b.id !== id)
    }));

    // Cloud Sync
    const { session } = get();
    if (session) {
      await supabase.from('budgets').delete().eq('id', id);
      const now = Date.now();
      localStorage.setItem('last_synced', String(now));
      set({ lastSynced: now });
    }
  },

  // ── Log sheet state ───────────────────────────────
  sheetOpen: false,
  expenseToEdit: null,
  openSheet: () => set({ sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false, expenseToEdit: null }),
  setExpenseToEdit: (e) => set({ expenseToEdit: e }),

  // ── Last-used defaults ────────────────────────────
  lastCategory: 'food',
  lastPayment: 'upi',
  lastGroup: 'personal',
  setLastCategory: (c) => set({ lastCategory: c }),
  setLastPayment: (p) => set({ lastPayment: p }),
  setLastGroup: (g) => set({ lastGroup: g }),

  // ── Toast ─────────────────────────────────────────
  toastMessage: null,
  showToast: (msg: string) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      // Only clear if still the same message
      if (get().toastMessage === msg) set({ toastMessage: null });
    }, 2200);
  },

  // ── Cloud Sync ────────────────────────────────────
  syncWithCloud: async () => {
    const { session, isSyncing } = get();
    if (!session || isSyncing) return;

    set({ isSyncing: true });
    try {
      const expenses = await getAllExpenses();
      const groups = await getAllGroups();
      const budgets = await getAllBudgets();

      // Sync expenses
      if (expenses.length > 0) {
        const { error: eErr } = await supabase
          .from('expenses')
          .upsert(expenses.map(e => ({ ...e, user_id: session.user.id })), { onConflict: 'id' });
        if (eErr) console.error('Sync Expenses Error:', eErr);
      }

      // Sync groups
      if (groups.length > 0) {
        const { error: gErr } = await supabase
          .from('groups')
          .upsert(groups.map(g => ({ ...g, user_id: session.user.id })), { onConflict: 'id' });
        if (gErr) console.error('Sync Groups Error:', gErr);
      }

      // Sync budgets
      if (budgets.length > 0) {
        const { error: bErr } = await supabase
          .from('budgets')
          .upsert(budgets.map(b => ({ ...b, user_id: session.user.id })), { onConflict: 'id' });
        if (bErr) console.error('Sync Budgets Error:', bErr);
      }

      // ── Pull from cloud (cloud is source of truth) ──────
      const { data: cloudExpenses } = await supabase.from('expenses').select('*');
      if (cloudExpenses) {
        const cloudIds = new Set(cloudExpenses.map(e => e.id));
        // Delete local expenses not present in cloud
        for (const localE of expenses) {
          if (!cloudIds.has(localE.id)) {
            await dbDeleteExpense(localE.id);
          }
        }
        // Upsert all cloud expenses locally
        for (const e of cloudExpenses) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { user_id, ...expense } = e;
          await dbUpdateExpense(expense as Expense);
        }
      }

      const { data: cloudGroups } = await supabase.from('groups').select('*');
      if (cloudGroups) {
        const cloudGroupIds = new Set(cloudGroups.map(g => g.id));
        for (const localG of groups) {
          if (!cloudGroupIds.has(localG.id)) {
            await dbDeleteGroup(localG.id);
          }
        }
        for (const g of cloudGroups) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { user_id, ...group } = g;
          await insertGroup(group as CustomGroup);
        }
      }

      const { data: cloudBudgets } = await supabase.from('budgets').select('*');
      if (cloudBudgets) {
        const cloudBudgetIds = new Set(cloudBudgets.map(b => b.id));
        for (const localB of budgets) {
          if (!cloudBudgetIds.has(localB.id)) {
            await dbDeleteBudget(localB.id);
          }
        }
        for (const b of cloudBudgets) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { user_id, ...budget } = b;
          await dbSaveBudget(budget as Budget);
        }
      }

      await get().loadExpenses();
      await get().loadGroups();
      await get().loadBudgets();

      const now = Date.now();
      localStorage.setItem('last_synced', String(now));
      set({ lastSynced: now });
      get().showToast('Cloud Sync Complete');
    } catch (err) {
      console.error('Sync Error:', err);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
