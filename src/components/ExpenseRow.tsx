import React from 'react';
import { useStore } from '../lib/store';
import { CATEGORY_META, PAYMENT_META, type Expense } from '../types/expense';

interface ExpenseRowProps {
  expense: Expense;
}

export default function ExpenseRow({ expense }: ExpenseRowProps) {
  const setExpenseToEdit = useStore((s) => s.setExpenseToEdit);
  const openSheet = useStore((s) => s.openSheet);
  const removeExpense = useStore((s) => s.removeExpense);
  const showToast = useStore((s) => s.showToast);

  const meta = CATEGORY_META[expense.category];
  const payMeta = PAYMENT_META[expense.paymentMethod];

  const handleEdit = () => {
    setExpenseToEdit(expense);
    openSheet();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Move to trash?')) {
      await removeExpense(expense.id);
      showToast('Moved to trash');
    }
  };

  return (
    <div 
      className="group bg-bg-secondary border border-border rounded-2xl p-3 flex items-center gap-3 active:bg-bg-tertiary transition-all"
      onClick={handleEdit}
    >
      <div 
        className="w-11 h-11 rounded-full flex items-center justify-center text-[20px] flex-shrink-0"
        style={{ background: meta.color }}
      >
        {meta.emoji}
      </div>
      
      <div className="flex-1 overflow-hidden">
        <p className="text-text-primary font-semibold text-[15px] truncate">{meta.label}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[12px] opacity-80">{payMeta.icon}</span>
          <span className="text-text-secondary text-[12px] font-medium">{payMeta.label}</span>
          {expense.group && expense.group !== 'personal' && (
            <>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-text-secondary text-[12px] font-medium truncate">
                {expense.group}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="text-right flex flex-col items-end flex-shrink-0">
        <p className="text-accent font-bold text-[16px]">
          ₹{expense.amount.toLocaleString('en-IN')}
        </p>
        {expense.note && (
          <p className="text-text-secondary text-[11px] truncate max-w-[80px] mt-0.5 italic">
            {expense.note}
          </p>
        )}
      </div>

      <button 
        onClick={handleDelete}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 text-sm opacity-0 group-hover:opacity-100 active:bg-red-500/20 transition-opacity ml-1"
        aria-label="Delete expense"
      >
        ✕
      </button>
    </div>
  );
}
