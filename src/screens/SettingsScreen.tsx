import { useState, useRef } from 'react';
import { useStore } from '../lib/store';
import { insertExpense, getAllExpenses } from '../lib/db';
import BottomNav from '../components/BottomNav';
import LogSheet from '../components/LogSheet';
import type { Expense, Category, PaymentMethod } from '../types/expense';

export default function SettingsScreen() {
  const loadExpenses = useStore((s) => s.loadExpenses);
  const showToast    = useStore((s) => s.showToast);
  const toastMessage = useStore((s) => s.toastMessage);
  const deletedExpenses = useStore((s) => s.deletedExpenses);
  const permanentlyDeleteExpense = useStore((s) => s.permanentlyDeleteExpense);
  const restoreExpense = useStore((s) => s.restoreExpense);
  
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const data = await getAllExpenses();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Export successful!');
    } catch (error) {
      alert('Failed to export data');
    }
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
              onClick={handleExport}
              className="flex items-center justify-between px-4 py-4 border-b border-border text-left disabled:opacity-50"
            >
              <div>
                <p className="text-text-primary font-medium text-[15px]">Backup Data</p>
                <p className="text-text-secondary text-[13px] mt-0.5">Download expenses as JSON file</p>
              </div>
              <span className="text-[20px]">⬇️</span>
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex items-center justify-between px-4 py-4 border-b border-border text-left disabled:opacity-50"
            >
              <div>
                <p className="text-text-primary font-medium text-[15px]">Restore Data</p>
                <p className="text-text-secondary text-[13px] mt-0.5">Import from a JSON backup file</p>
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
        <div className="fixed inset-0 bg-bg-primary z-50 flex flex-col pb-[80px] overflow-y-auto">
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
    </div>
  );
}
