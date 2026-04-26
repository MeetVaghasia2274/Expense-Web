import { useEffect, useMemo } from 'react';
import { useStore } from '../lib/store';
import MonthHeader from '../components/MonthHeader';
import ExpenseRow from '../components/ExpenseRow';
import { SkeletonSection, SkeletonHomeHeader } from '../components/SkeletonLoader';

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function formatSectionDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (isToday(dateStr)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function HomeScreen() {
  const expenses   = useStore((s) => s.expenses);
  const isLoading  = useStore((s) => s.isLoading);
  const loadExpenses = useStore((s) => s.loadExpenses);
  const loadGroups   = useStore((s) => s.loadGroups);

  useEffect(() => {
    loadExpenses();
    loadGroups();
  }, [loadExpenses, loadGroups]);

  // ── Derived data ────────────────────────────────────
  const now = new Date();
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const monthTotal = useMemo(
    () => expenses.filter((e) => isThisMonth(e.createdAt)).reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const todayTotal = useMemo(
    () => expenses.filter((e) => isToday(e.createdAt)).reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  // ── Group by date section ───────────────────────────
  type Section = { title: string; subtitle: string; items: typeof expenses };
  const sections = useMemo<Section[]>(() => {
    const map = new Map<string, typeof expenses>();
    for (const e of expenses) {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).map(([, items]) => {
      const dateStr = items[0].createdAt;
      const dayTotal = items.reduce((s, e) => s + e.amount, 0);
      return {
        title: formatSectionDate(dateStr),
        subtitle: `₹${dayTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        items,
      };
    });
  }, [expenses]);

  return (
    <div className="flex flex-col min-h-full pb-[80px]">
      {/* Month header */}
      <MonthHeader month={monthName} total={monthTotal} />

      {/* Today callout card */}
      <div className="mx-4 mb-3 rounded-2xl bg-bg-secondary border border-border px-4 py-3 flex justify-between items-center">
        <div>
          <p className="text-text-secondary text-[12px] font-medium uppercase tracking-wide">Today</p>
          <p className="text-text-primary font-semibold text-[17px] mt-0.5">
            {todayTotal > 0
              ? `₹${todayTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
              : '—'}
          </p>
        </div>
        <div className="text-[28px]">📅</div>
      </div>

      {/* Expense list — skeleton while loading */}
      {isLoading ? (
        <div className="flex flex-col gap-4 px-4">
          <SkeletonHomeHeader />
          <SkeletonSection />
          <SkeletonSection />
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-text-secondary mt-16">
          <span className="text-[52px]">🧾</span>
          <p className="text-[15px] font-medium">No expenses yet</p>
          <p className="text-[13px]">Tap + to log your first one</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4">
          {sections.map((section) => (
            <div key={section.title}>
              {/* Section header */}
              <div className="flex items-baseline justify-between mb-2 px-1">
                <span className="text-text-secondary text-[13px] font-semibold">{section.title}</span>
                <span className="text-text-secondary text-[13px]">{section.subtitle}</span>
              </div>
              {/* Rows */}
              <div className="flex flex-col gap-2">
                {section.items.map((e) => (
                  <ExpenseRow key={e.id} expense={e} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
