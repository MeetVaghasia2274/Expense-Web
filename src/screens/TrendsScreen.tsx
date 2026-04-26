import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';
import { useStore } from '../lib/store';
import { getExpensesByMonth } from '../lib/db';
import type { Category, Expense, Group } from '../types/expense';
import { CATEGORY_META, SYSTEM_GROUPS } from '../types/expense';
import BottomNav from '../components/BottomNav';
import ExpenseRow from '../components/ExpenseRow';
import LogSheet from '../components/LogSheet';

const CATEGORY_COLORS: Record<Category, string> = {
  food: '#FB923C',
  transport: '#60A5FA',
  shopping: '#A78BFA',
  groceries: '#34D399',
  health: '#F87171',
  other: '#9CA3AF',
};

function getMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: '2-digit',
  });
}

// Custom tooltip for bar chart
const BarTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-secondary border border-border rounded-xl px-3 py-2 text-[13px]">
      <span className="text-accent font-semibold">
        ₹{payload[0].value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </span>
    </div>
  );
};

export default function TrendsScreen() {
  const expenses = useStore((s) => s.expenses);
  const customGroups = useStore((s) => s.customGroups);
  const budgets      = useStore((s) => s.budgets);
  const loadExpenses = useStore((s) => s.loadExpenses);
  const loadGroups   = useStore((s) => s.loadGroups);
  const loadBudgets  = useStore((s) => s.loadBudgets);
  const removeGroup  = useStore((s) => s.removeGroup);
  const toastMessage = useStore((s) => s.toastMessage);

  useEffect(() => {
    loadExpenses();
    loadGroups();
    loadBudgets();
  }, [loadExpenses, loadGroups, loadBudgets]);

  // ── Month navigation ────────────────────────────────
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedGroup, setSelectedGroup] = useState<Group | 'all'>('all');
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    getExpensesByMonth(viewYear, viewMonth).then(setMonthExpenses);
  }, [viewYear, viewMonth, expenses]); // re-fetch when global list changes

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  // ── Last 6 months for bar chart ─────────────────────
  const [barData, setBarData] = useState<{ name: string; total: number }[]>([]);
  useEffect(() => {
    async function fetchBars() {
      const results = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const data = await getExpensesByMonth(d.getFullYear(), d.getMonth());
        results.push({
          name: getMonthLabel(d.getFullYear(), d.getMonth()),
          total: data.reduce((s, e) => s + e.amount, 0),
        });
      }
      return results;
    }
    fetchBars().then(setBarData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses]);

  // ── Category donut ──────────────────────────────────
  const pieData = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    const filtered = selectedGroup === 'all'
      ? monthExpenses
      : monthExpenses.filter(e => e.group === selectedGroup);

    for (const e of filtered) {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    }
    return Object.entries(map)
      .map(([cat, value]) => ({
        name: CATEGORY_META[cat as Category].label,
        value: value ?? 0,
        color: CATEGORY_COLORS[cat as Category],
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, selectedGroup]);

  // ── Group breakdown ─────────────────────────────────
  const groupData = useMemo(() => {
    const map: Partial<Record<string, number>> = {};
    const allGroups = [...SYSTEM_GROUPS, ...customGroups];

    for (const e of monthExpenses) {
      const g = e.group || 'personal';
      map[g] = (map[g] ?? 0) + e.amount;
    }

    return allGroups
      .map((g) => ({
        id: g.id,
        name: g.label,
        emoji: g.emoji,
        value: map[g.id] ?? 0,
        isSystem: g.isSystem,
      }))
      .filter(g => g.value > 0 || !g.isSystem) // Show system groups or custom groups with value
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, customGroups]);

  const filteredExpenses = useMemo(() => {
    return selectedGroup === 'all'
      ? monthExpenses
      : monthExpenses.filter(e => e.group === selectedGroup);
  }, [monthExpenses, selectedGroup]);

  const filteredTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  // ── Group by date ────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filteredExpenses) {
      const d = new Date(e.createdAt);
      const key = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [filteredExpenses]);

  const radarData = useMemo(() => {
    return (Object.keys(CATEGORY_META) as Category[]).map(catId => ({
      subject: CATEGORY_META[catId].label,
      value: monthExpenses.filter(e => e.category === catId).reduce((sum, e) => sum + e.amount, 0),
    })).filter(d => d.value > 0);
  }, [monthExpenses]);

  const [comparisonData, setComparisonData] = useState<{ name: string; thisMonth: number; prevMonth: number }[]>([]);
  useEffect(() => {
    async function fetchComparison() {
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevExpenses = await getExpensesByMonth(prevYear, prevMonthIdx);
      
      const data = (Object.keys(CATEGORY_META) as Category[]).map(catId => {
        const thisAmt = monthExpenses.filter(e => e.category === catId).reduce((s, e) => s + e.amount, 0);
        const prevAmt = prevExpenses.filter(e => e.category === catId).reduce((s, e) => s + e.amount, 0);
        return {
          name: CATEGORY_META[catId].label,
          thisMonth: thisAmt,
          prevMonth: prevAmt
        };
      }).filter(d => d.thisMonth > 0 || d.prevMonth > 0);
      setComparisonData(data);
    }
    fetchComparison();
  }, [viewYear, viewMonth, monthExpenses]);

  return (
    <div className="flex flex-col min-h-full pb-[80px] overflow-x-hidden">

      {/* Month selector */}
      <div
        className="flex items-center justify-between px-4 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <button
          onClick={prevMonth}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-tertiary text-text-primary text-lg"
          aria-label="Previous month"
          id="prev-month-btn"
        >
          ‹
        </button>
        <h1 className="text-text-primary font-semibold text-[17px]">{monthLabel}</h1>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-tertiary text-lg disabled:opacity-30"
          aria-label="Next month"
          id="next-month-btn"
        >
          ›
        </button>
      </div>

      {/* Group Selector */}
      <div className="mb-4">
        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
          <button
            className={`payment-chip ${selectedGroup === 'all' ? 'selected' : ''}`}
            onClick={() => setSelectedGroup('all')}
          >
            <span>🌎</span>
            <span>All</span>
          </button>
          {[...SYSTEM_GROUPS, ...customGroups].map((g) => (
            <button
              key={g.id}
              className={`payment-chip ${selectedGroup === g.id ? 'selected' : ''}`}
              onClick={() => setSelectedGroup(g.id)}
            >
              <span>{g.emoji}</span>
              <span>{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Total card */}
      <div className="mx-4 mb-4 rounded-2xl bg-bg-secondary border border-border px-5 py-4">
        <p className="text-text-secondary text-[12px] font-medium uppercase tracking-wide">
          {selectedGroup === 'all'
            ? 'Total spent'
            : `${[...SYSTEM_GROUPS, ...customGroups].find(g => g.id === selectedGroup)?.label || 'Group'} Total`}
        </p>
        <p className="text-accent font-mono font-bold text-[36px] mt-1 leading-none">
          ₹{filteredTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </p>
        <p className="text-text-secondary text-[12px] mt-1">
          {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Group breakdown summary */}
      {selectedGroup === 'all' && groupData.length > 0 && (
        <div className="mx-4 mb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {groupData.map((g) => (
            <div key={g.id} className="flex-shrink-0 bg-bg-secondary border border-border rounded-xl px-3 py-2 relative group">
              <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                <span>{g.emoji}</span>
                <span className="font-medium">{g.name}</span>
              </div>
              <div className="text-[14px] font-semibold text-text-primary mt-0.5">
                ₹{g.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              {!g.isSystem && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete group "${g.name}"?`)) removeGroup(g.id);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Budget Progress Section */}
      {isCurrentMonth && budgets.length > 0 && (
        <div className="mx-4 mb-4 rounded-2xl bg-bg-secondary border border-border px-4 py-4">
          <p className="text-text-secondary text-[12px] font-semibold uppercase tracking-wide mb-3 pl-1">
            Budget Progress
          </p>
          <div className="flex flex-col gap-4">
            {budgets.map((b) => {
              // Calculate spent for this budget item
              let spent = 0;
              let label = '';
              let emoji = '';
              
              if (b.type === 'category') {
                spent = monthExpenses
                  .filter(e => e.category === b.id)
                  .reduce((sum, e) => sum + e.amount, 0);
                label = CATEGORY_META[b.id as Category]?.label || b.id;
                emoji = CATEGORY_META[b.id as Category]?.emoji || '🎯';
              } else {
                spent = monthExpenses
                  .filter(e => e.group === b.id)
                  .reduce((sum, e) => sum + e.amount, 0);
                const g = [...SYSTEM_GROUPS, ...customGroups].find(g => g.id === b.id);
                label = g?.label || b.id;
                emoji = g?.emoji || '🎯';
              }

              const percent = Math.min((spent / b.amount) * 100, 100);
              const isOver = spent > b.amount;
              const colorClass = percent > 90 ? 'bg-danger' : percent > 70 ? 'bg-orange-500' : 'bg-success';

              return (
                <div key={`${b.type}-${b.id}`} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-end px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px]">{emoji}</span>
                      <span className="text-text-primary text-[14px] font-medium">{label}</span>
                    </div>
                    <span className="text-[12px] font-semibold">
                      <span className={isOver ? 'text-danger' : 'text-text-primary'}>₹{spent.toLocaleString()}</span>
                      <span className="text-text-secondary"> / ₹{b.amount.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-bg-tertiary rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${colorClass}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bar chart — last 6 months */}
      <div className="mx-4 mb-4 rounded-2xl bg-bg-secondary border border-border px-2 py-4">
        <p className="text-text-secondary text-[12px] font-semibold uppercase tracking-wide px-3 mb-3">
          Last 6 months
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={barData} barSize={20} style={{ outline: 'none' }}>
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(128,128,128,0.1)' }} />
            <Bar dataKey="total" fill="var(--accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar Chart — Spending Profile */}
      {radarData.length >= 3 && (
        <div className="mx-4 mb-4 rounded-2xl bg-bg-secondary border border-border px-2 py-4">
          <p className="text-text-secondary text-[12px] font-semibold uppercase tracking-wide px-3 mb-2">
            Spending Profile
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <Radar
                name="Spent"
                dataKey="value"
                stroke="var(--accent)"
                fill="var(--accent)"
                fillOpacity={0.3}
              />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12 }}
                itemStyle={{ color: 'var(--accent)' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Month-over-Month Comparison */}
      {comparisonData.length > 0 && (
        <div className="mx-4 mb-4 rounded-2xl bg-bg-secondary border border-border px-2 py-4">
          <p className="text-text-secondary text-[12px] font-semibold uppercase tracking-wide px-3 mb-3">
            Month Comparison
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comparisonData} barGap={4}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12 }}
                cursor={{ fill: 'rgba(128,128,128,0.05)' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="prevMonth" name="Last Month" fill="var(--text-secondary)" opacity={0.3} radius={[4, 4, 0, 0]} />
              <Bar dataKey="thisMonth" name="This Month" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category donut */}
      {pieData.length > 0 && (
        <div className="mx-4 mb-4 rounded-2xl bg-bg-secondary border border-border px-2 py-4">
          <p className="text-text-secondary text-[12px] font-semibold uppercase tracking-wide px-3 mb-2">
            By Category
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart style={{ outline: 'none' }}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>
                )}
              />
              <Tooltip
                formatter={(val: number) => [
                  `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                  '',
                ]}
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: 13,
                  color: 'var(--text-primary)'
                }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transaction list */}
      {grouped.length > 0 ? (
        <div className="flex flex-col gap-4 px-4 mb-4">
          <p className="text-text-secondary text-[12px] font-semibold uppercase tracking-wide px-1">
            Transactions
          </p>
          {grouped.map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="flex items-baseline justify-between mb-2 px-1">
                <span className="text-text-secondary text-[13px] font-semibold">{dateLabel}</span>
                <span className="text-text-secondary text-[13px]">
                  ₹{items.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((e) => <ExpenseRow key={e.id} expense={e} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-text-secondary">
          <span className="text-[40px]">📭</span>
          <p className="text-[14px]">No expenses this month</p>
        </div>
      )}

      <BottomNav />
      <LogSheet />

      {toastMessage && (
        <div className="toast" role="status" aria-live="polite">
          ✓ {toastMessage}
        </div>
      )}
    </div>
  );
}
