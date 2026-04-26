import { openDB, type IDBPDatabase } from 'idb';
import type { Expense, CustomGroup, Budget } from '../types/expense';

const DB_NAME = 'expense-mobile';
const DB_VERSION = 3;
const STORE = 'expenses';
const GROUP_STORE = 'groups';
const BUDGET_STORE = 'budgets';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
        if (oldVersion < 2) {
          db.createObjectStore(GROUP_STORE, { keyPath: 'id' });
        }
        if (oldVersion < 3) {
          db.createObjectStore(BUDGET_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function insertExpense(expense: Expense): Promise<void> {
  const db = await getDB();
  await db.add(STORE, expense);
}

export async function updateExpense(expense: Expense): Promise<void> {
  const db = await getDB();
  await db.put(STORE, expense);
}

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDB();
  const all = await db.getAll(STORE);
  // Sort newest first
  return (all as Expense[]).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getExpensesByMonth(
  year: number,
  month: number
): Promise<Expense[]> {
  const all = await getAllExpenses();
  return all.filter((e) => {
    const d = new Date(e.createdAt);
    return d.getFullYear() === year && d.getMonth() === month && !e.deletedAt;
  });
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

export async function getAllGroups(): Promise<CustomGroup[]> {
  const db = await getDB();
  return db.getAll(GROUP_STORE);
}

export async function insertGroup(group: CustomGroup): Promise<void> {
  const db = await getDB();
  await db.put(GROUP_STORE, group);
}

export async function deleteGroup(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(GROUP_STORE, id);
}

export async function getAllBudgets(): Promise<Budget[]> {
  const db = await getDB();
  return db.getAll(BUDGET_STORE);
}

export async function saveBudget(budget: Budget): Promise<void> {
  const db = await getDB();
  await db.put(BUDGET_STORE, budget);
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(BUDGET_STORE, id);
}
