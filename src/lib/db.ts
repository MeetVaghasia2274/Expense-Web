import { openDB, type IDBPDatabase } from 'idb';
import type { Expense } from '../types/expense';

const DB_NAME = 'expense-mobile';
const DB_VERSION = 1;
const STORE = 'expenses';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      },
    });
  }
  return dbPromise;
}

export async function insertExpense(expense: Expense): Promise<void> {
  const db = await getDB();
  await db.add(STORE, expense);
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
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}
