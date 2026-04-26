import { useState, useRef } from 'react';
import { useStore } from '../lib/store';
import { insertExpense, getAllExpenses } from '../lib/db';
import BottomNav from '../components/BottomNav';
import LogSheet from '../components/LogSheet';
import type { Expense, Category, PaymentMethod } from '../types/expense';
import { CATEGORY_META, PAYMENT_META, SYSTEM_GROUPS } from '../types/expense';
import { jsPDF } from 'jspdf';

export default function SettingsScreen() {
  const loadExpenses = useStore((s) => s.loadExpenses);
  const showToast    = useStore((s) => s.showToast);
  const toastMessage = useStore((s) => s.toastMessage);
  const deletedExpenses = useStore((s) => s.deletedExpenses);
  const permanentlyDeleteExpense = useStore((s) => s.permanentlyDeleteExpense);
  const restoreExpense = useStore((s) => s.restoreExpense);

  const budgets = useStore((s) => s.budgets);
  const loadBudgets = useStore((s) => s.loadBudgets);
  const updateBudget = useStore((s) => s.updateBudget);
  const removeBudget = useStore((s) => s.removeBudget);
  const customGroups = useStore((s) => s.customGroups);
  const loadGroups = useStore((s) => s.loadGroups);

  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showBudgets, setShowBudgets] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  const [exportRange, setExportRange] = useState<'all' | 'month' | 'last30' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async (filterData?: Expense[]) => {
    try {
      const data = filterData || (await getAllExpenses()).filter((e) => !e.deletedAt);
      if (data.length === 0) { showToast('No expenses to export'); return; }

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;
      const colW = pageW - margin * 2;
      let y = 18;

      // ── Header ─────────────────────────────────────────
      doc.setFillColor(30, 30, 46);
      doc.rect(0, 0, pageW, 28, 'F');
      doc.setTextColor(250, 170, 80);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Expense Report', margin, y);
      doc.setFontSize(9);
      doc.setTextColor(180, 180, 200);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageW - margin, y, { align: 'right' });
      y = 36;

      // ── Summary box ────────────────────────────────────
      const total = data.reduce((s, e) => s + e.amount, 0);
      doc.setFillColor(245, 245, 255);
      doc.roundedRect(margin, y, colW, 18, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 46);
      doc.text(`Total Spent: Rs. ${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, margin + 4, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 110);
      doc.text(`${data.length} transactions`, margin + 4, y + 13);
      y += 26;

      // ── Category Summary ───────────────────────────────
      const catTotals: Record<string, number> = {};
      data.forEach(e => {
        catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
      });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 46);
      doc.text('Category Summary', margin, y);
      y += 6;

      Object.entries(catTotals).sort((a,b) => b[1] - a[1]).forEach(([catId, amt]) => {
        const meta = CATEGORY_META[catId as Category];
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(90, 90, 110);
        doc.text(`${meta?.emoji || ''} ${meta?.label || catId}`, margin + 2, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 46);
        doc.text(`Rs. ${amt.toLocaleString('en-IN')}`, pageW - margin - 2, y, { align: 'right' });
        y += 5.5;
      });
      y += 10;

      // ── Table header ───────────────────────────────────
      const cols = { date: margin, cat: margin + 32, pay: margin + 82, note: margin + 110, amt: pageW - margin };
      doc.setFillColor(30, 30, 46);
      doc.rect(margin, y, colW, 8, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(250, 170, 80);
      doc.text('Date', cols.date + 1, y + 5.5);
      doc.text('Category', cols.cat + 1, y + 5.5);
      doc.text('Payment', cols.pay + 1, y + 5.5);
      doc.text('Note', cols.note + 1, y + 5.5);
      doc.text('Amount', cols.amt, y + 5.5, { align: 'right' });
      y += 10;

      // ── Rows ───────────────────────────────────────────
      doc.setFont('helvetica', 'normal');
      data.forEach((e, i) => {
        if (y > 270) {
          doc.addPage();
          y = 18;
        }
        if (i % 2 === 0) {
          doc.setFillColor(248, 248, 255);
          doc.rect(margin, y - 1, colW, 8, 'F');
        }
        doc.setFontSize(8);
        doc.setTextColor(30, 30, 46);
        const dateStr = new Date(e.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
        const catLabel = CATEGORY_META[e.category as Category].label;
        const payLabel = PAYMENT_META[e.paymentMethod as PaymentMethod].label;
        const noteStr = e.note ? (e.note.length > 22 ? e.note.slice(0, 20) + '…' : e.note) : '—';
        const amtStr = `Rs. ${e.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
        doc.text(dateStr, cols.date + 1, y + 4.5);
        doc.text(catLabel, cols.cat + 1, y + 4.5);
        doc.text(payLabel, cols.pay + 1, y + 4.5);
        doc.text(noteStr, cols.note + 1, y + 4.5);
        doc.setFont('helvetica', 'bold');
        doc.text(amtStr, cols.amt, y + 4.5, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 8;
      });

      // ── Footer line ────────────────────────────────────
      y += 4;
      doc.setDrawColor(200, 200, 220);
      doc.line(margin, y, pageW - margin, y);
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 170);
      doc.text('Generated by Expense Tracker', margin, y);

      doc.save(`expense_report_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('PDF exported!');
    } catch (error) {
      console.error(error);
      alert('Failed to export PDF');
    }
  };

  const handleExportCSV = async (filterData?: Expense[]) => {
    try {
      const data = filterData || (await getAllExpenses()).filter((e) => !e.deletedAt);
      if (data.length === 0) { showToast('No expenses to export'); return; }

      const headers = ['Date', 'Category', 'Group', 'Payment Method', 'Amount', 'Note'];
      const rows = data.map((e) => [
        new Date(e.createdAt).toLocaleDateString('en-IN'),
        CATEGORY_META[e.category]?.label || e.category,
        e.group || 'personal',
        PAYMENT_META[e.paymentMethod]?.label || e.paymentMethod,
        e.amount,
        e.note || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('CSV exported!');
    } catch (error) {
      console.error(error);
      alert('Failed to export CSV');
    }
  };
  const handleAdvancedExport = async (type: 'pdf' | 'csv') => {
    const all = (await getAllExpenses()).filter(e => !e.deletedAt);
    let filtered = all;

    if (exportRange === 'month') {
      const now = new Date();
      filtered = all.filter(e => {
        const d = new Date(e.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (exportRange === 'last30') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = all.filter(e => new Date(e.createdAt) >= thirtyDaysAgo);
    } else if (exportRange === 'custom' && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      filtered = all.filter(e => {
        const d = new Date(e.createdAt);
        return d >= start && d <= end;
      });
    }

    if (filtered.length === 0) {
      showToast('No expenses in this range');
      return;
    }

    if (type === 'pdf') await handleExport(filtered);
    else await handleExportCSV(filtered);
    setShowExportOptions(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Invalid format: Expected array');

      let importedCount = 0;
      for (const item of data) {
        if (item.id && typeof item.amount === 'number' && item.createdAt) {
          await insertExpense(item as Expense);
          importedCount++;
        }
      }
      await loadExpenses();
      showToast(`Imported ${importedCount} expenses!`);
    } catch (error) {
      alert('Failed to parse file. Make sure it is a valid JSON backup.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const generateDummyData = async () => {
    if (!confirm('This will insert 50 random expenses over the last 3 months. Continue?')) return;
    
    setLoading(true);
    const categories: Category[] = ['food', 'transport', 'shopping', 'groceries', 'health', 'other'];
    const payments: PaymentMethod[] = ['cash', 'upi', 'card'];
    
    const now = new Date();
    for (let i = 0; i < 50; i++) {
      // Random date in last 90 days
      const d = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      const expense: Expense = {
        id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        amount: Math.floor(Math.random() * 2000) + 50,
        category: categories[Math.floor(Math.random() * categories.length)],
        paymentMethod: payments[Math.floor(Math.random() * payments.length)],
        group: 'personal',
        createdAt: d.toISOString(),
      };
      await insertExpense(expense);
    }
    await loadExpenses();
    setLoading(false);
    showToast('Dummy data loaded!');
  };

  return (
    <div className="flex flex-col min-h-full pb-[80px]">
      <div 
        className="flex items-center px-4 pb-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}
      >
        <h1 className="text-text-primary font-semibold text-[24px]">Settings</h1>
      </div>

      <div className="px-4 flex flex-col gap-6 mt-4">
        
        {/* Data Management Section */}
        <section>
          <h2 className="text-text-secondary text-[12px] font-semibold uppercase tracking-wide mb-3 pl-1">
            Data Management
          </h2>
          <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden flex flex-col">
            
            <button 
              onClick={() => setShowExportOptions(true)}
              className="flex items-center justify-between px-4 py-4 border-b border-border text-left"
            >
              <div>
                <p className="text-text-primary font-medium text-[15px]">Export & Filter</p>
                <p className="text-text-secondary text-[13px] mt-0.5">Export PDF/CSV with date ranges</p>
              </div>
              <span className="text-[20px]">📤</span>
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex items-center justify-between px-4 py-4 border-b border-border text-left disabled:opacity-50"
            >
              <div>
                <p className="text-text-primary font-medium text-[15px]">Restore JSON Backup</p>
                <p className="text-text-secondary text-[13px] mt-0.5">Import from a previous export</p>
              </div>
              <span className="text-[20px]">⬆️</span>
            </button>
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImport} 
            />

            <button 
              onClick={generateDummyData}
              disabled={loading}
              className="flex items-center justify-between px-4 py-4 text-left disabled:opacity-50"
            >
              <div>
                <p className="text-text-primary font-medium text-[15px]">Generate Sample Data</p>
                <p className="text-text-secondary text-[13px] mt-0.5">Fill Trends page with demo data</p>
              </div>
              <span className="text-[20px]">🧪</span>
            </button>
          </div>
        </section>
        {/* Budgeting Section */}
        <section>
          <h2 className="text-text-secondary text-[12px] font-semibold uppercase tracking-wide mb-3 pl-1">
            Budgeting
          </h2>
          <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden flex flex-col">
            <button 
              onClick={() => {
                loadBudgets();
                loadGroups();
                setShowBudgets(true);
              }}
              className="flex items-center justify-between px-4 py-4 text-left"
            >
              <div>
                <p className="text-text-primary font-medium text-[15px]">Monthly Budgets</p>
                <p className="text-text-secondary text-[13px] mt-0.5">Set spending limits for categories & groups</p>
              </div>
              <span className="text-[20px]">🎯</span>
            </button>
          </div>
        </section>

        {/* Recently Deleted Section */}
        <section>
          <h2 className="text-text-secondary text-[12px] font-semibold uppercase tracking-wide mb-3 pl-1">
            Trash
          </h2>
          <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden flex flex-col">
            <button 
              onClick={() => setShowDeleted(true)}
              className="flex items-center justify-between px-4 py-4 text-left"
            >
              <div>
                <p className="text-text-primary font-medium text-[15px]">Recently Deleted</p>
                <p className="text-text-secondary text-[13px] mt-0.5">Recover or permanently delete items ({deletedExpenses.length})</p>
              </div>
              <span className="text-[20px]">🗑️</span>
            </button>
          </div>
        </section>

      </div>

      <BottomNav />
      <LogSheet />

      {toastMessage && (
        <div className="toast" role="status" aria-live="polite">
          ✓ {toastMessage}
        </div>
      )}

      {/* Full-screen Recently Deleted Overlay */}
      {showDeleted && (
        <div className="fixed inset-0 bg-bg-primary z-50 flex flex-col pb-[80px] overflow-y-auto max-w-[430px] left-1/2 -translate-x-1/2 border-x border-bg-tertiary shadow-2xl">
          <div 
            className="flex items-center px-4 pb-4 border-b border-border bg-bg-primary sticky top-0"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}
          >
            <button 
              onClick={() => setShowDeleted(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-tertiary text-text-primary text-lg mr-2"
            >
              ‹
            </button>
            <h1 className="text-text-primary font-semibold text-[20px]">Recently Deleted</h1>
          </div>

          <div className="flex-1 px-4 py-4">
            {deletedExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-text-secondary">
                <span className="text-[40px] mb-2">✨</span>
                <p className="text-[14px]">Trash is empty</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-text-secondary text-[13px] text-center mb-2">Items are permanently deleted after 7 days.</p>
                {deletedExpenses.map((e) => (
                  <div key={e.id} className="bg-bg-secondary border border-border rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-text-primary font-medium">{e.category} - {e.paymentMethod}</p>
                        <p className="text-text-secondary text-[12px]">
                          Deleted: {new Date(e.deletedAt!).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-text-primary font-bold">₹{e.amount}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button 
                        className="flex-1 py-2 bg-accent/10 text-accent rounded-lg font-medium text-[13px]"
                        onClick={async () => {
                          await restoreExpense(e.id);
                          showToast('Expense restored');
                        }}
                      >
                        Restore
                      </button>
                      <button 
                        className="flex-1 py-2 bg-red-500/10 text-red-500 rounded-lg font-medium text-[13px]"
                        onClick={async () => {
                          if (confirm('Permanently delete this expense?')) {
                            await permanentlyDeleteExpense(e.id);
                            showToast('Permanently deleted');
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-screen Budgets Overlay */}
      {showBudgets && (
        <div className="fixed inset-0 bg-bg-primary z-50 flex flex-col pb-[80px] overflow-y-auto max-w-[430px] left-1/2 -translate-x-1/2 border-x border-bg-tertiary shadow-2xl">
          <div 
            className="flex items-center px-4 pb-4 border-b border-border bg-bg-primary sticky top-0"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}
          >
            <button 
              onClick={() => setShowBudgets(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-tertiary text-text-primary text-lg mr-2"
            >
              ‹
            </button>
            <h1 className="text-text-primary font-semibold text-[20px]">Monthly Budgets</h1>
          </div>

          <div className="px-4 py-6">
            <div className="flex flex-col gap-8">
              
              {/* Category Budgets */}
              <section>
                <h3 className="text-text-secondary text-[12px] font-semibold uppercase tracking-wider mb-4 pl-1">Categories</h3>
                <div className="flex flex-col gap-3">
                  {(Object.keys(CATEGORY_META) as Category[]).map(catId => {
                    const meta = CATEGORY_META[catId];
                    const budget = budgets.find(b => b.id === catId && b.type === 'category');
                    return (
                      <div key={catId} className="bg-bg-secondary border border-border rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[20px]">{meta.emoji}</span>
                          <span className="text-text-primary font-medium">{meta.label}</span>
                        </div>
                        <input 
                          type="number"
                          placeholder="Set limit"
                          value={budget?.amount || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val) || val <= 0) {
                              removeBudget(catId);
                            } else {
                              updateBudget({ id: catId, type: 'category', amount: val });
                            }
                          }}
                          className="w-28 bg-bg-tertiary border border-border rounded-xl px-2 py-2 text-right text-text-primary font-semibold outline-none focus:border-accent"
                        />
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Group Budgets */}
              <section>
                <h3 className="text-text-secondary text-[12px] font-semibold uppercase tracking-wider mb-4 pl-1">Groups</h3>
                <div className="flex flex-col gap-3">
                  {[...customGroups, ...SYSTEM_GROUPS].map(group => {
                    const budget = budgets.find(b => b.id === group.id && b.type === 'group');
                    return (
                      <div key={group.id} className="bg-bg-secondary border border-border rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[20px]">{group.emoji}</span>
                          <span className="text-text-primary font-medium">{group.label}</span>
                        </div>
                        <input 
                          type="number"
                          placeholder="Set limit"
                          value={budget?.amount || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val) || val <= 0) {
                              removeBudget(group.id);
                            } else {
                              updateBudget({ id: group.id, type: 'group', amount: val });
                            }
                          }}
                          className="w-28 bg-bg-tertiary border border-border rounded-xl px-2 py-2 text-right text-text-primary font-semibold outline-none focus:border-accent"
                        />
                      </div>
                    );
                  })}
                </div>
              </section>

            </div>
          </div>
        </div>
      )}
      {/* Full-screen Export Options Overlay */}
      {showExportOptions && (
        <div className="fixed inset-0 bg-bg-primary z-50 flex flex-col pb-[80px] overflow-y-auto max-w-[430px] left-1/2 -translate-x-1/2 border-x border-bg-tertiary shadow-2xl">
          <div 
            className="flex items-center px-4 pb-4 border-b border-border bg-bg-primary sticky top-0"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}
          >
            <button 
              onClick={() => setShowExportOptions(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-tertiary text-text-primary text-lg mr-2"
            >
              ‹
            </button>
            <h1 className="text-text-primary font-semibold text-[20px]">Export Options</h1>
          </div>

          <div className="px-4 py-6">
            <div className="flex flex-col gap-6">
              
              <section>
                <h3 className="text-text-secondary text-[12px] font-semibold uppercase tracking-wider mb-4 pl-1">Date Range</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'month', label: 'Current Month' },
                    { id: 'last30', label: 'Last 30 Days' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map((range) => (
                    <button
                      key={range.id}
                      onClick={() => setExportRange(range.id as any)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        exportRange === range.id 
                        ? 'bg-accent/10 border-accent text-accent' 
                        : 'bg-bg-secondary border-border text-text-secondary'
                      }`}
                    >
                      <span className="font-medium">{range.label}</span>
                      {exportRange === range.id && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </section>

              {exportRange === 'custom' && (
                <section className="animate-fade-in">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-text-secondary text-[11px] font-semibold uppercase ml-1">Start Date</label>
                      <input 
                        type="date" 
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-text-primary outline-none focus:border-accent"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-text-secondary text-[11px] font-semibold uppercase ml-1">End Date</label>
                      <input 
                        type="date" 
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-text-primary outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </section>
              )}

              <section className="mt-4 flex flex-col gap-3">
                <h3 className="text-text-secondary text-[12px] font-semibold uppercase tracking-wider mb-1 pl-1">Format</h3>
                <button 
                  onClick={() => handleAdvancedExport('pdf')}
                  className="w-full py-4 rounded-2xl bg-bg-secondary border border-border flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                  <span className="text-[20px]">📄</span>
                  <span className="text-text-primary font-bold">Export as PDF</span>
                </button>
                <button 
                  onClick={() => handleAdvancedExport('csv')}
                  className="w-full py-4 rounded-2xl bg-bg-secondary border border-border flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                  <span className="text-[20px]">📊</span>
                  <span className="text-text-primary font-bold">Export as CSV</span>
                </button>
              </section>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
