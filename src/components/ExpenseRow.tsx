import { useRef, useState } from 'react';
import type { Expense } from '../types/expense';
import { CATEGORY_META, PAYMENT_META } from '../types/expense';
import { useStore } from '../lib/store';

interface ExpenseRowProps {
  expense: Expense;
}

export default function ExpenseRow({ expense }: ExpenseRowProps) {
  const removeExpense = useStore((s) => s.removeExpense);
  const setExpenseToEdit = useStore((s) => s.setExpenseToEdit);
  const openSheet = useStore((s) => s.openSheet);
  const showToast = useStore((s) => s.showToast);

  const { emoji, label, color } = CATEGORY_META[expense.category];
  const { label: payLabel, icon: payIcon } = PAYMENT_META[expense.paymentMethod];

  // ── Swipe to delete ────────────────────────────────
  const startX = useRef<number | null>(null);
  const hasSwiped = useRef(false);
  const [offsetX, setOffsetX] = useState(0);
  const THRESHOLD = 72;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    hasSwiped.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (Math.abs(dx) > 10) hasSwiped.current = true;
    if (dx < 0) setOffsetX(Math.max(dx, -THRESHOLD - 20));
  };

  const onTouchEnd = () => {
    if (offsetX < -THRESHOLD) {
      // Delete
      if (window.confirm('Are you sure you want to delete this expense?')) {
        removeExpense(expense.id);
        showToast('Expense deleted');
      } else {
        setOffsetX(0);
      }
    } else {
      setOffsetX(0);
    }
    startX.current = null;
  };

  const handleClick = () => {
    if (hasSwiped.current) return;
    if (!window.confirm('Edit this expense?')) return;
    setExpenseToEdit(expense);
    openSheet();
  };

  // Format amount
  const formatted = expense.amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });

  // Format time
  const time = new Date(expense.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="swipe-wrapper">
      {/* Red delete background */}
      <div className="delete-reveal">🗑️</div>

      {/* Row */}
      <div
        className="expense-row"
        style={{ transform: `translateX(${offsetX}px)`, transition: offsetX === 0 ? 'transform 0.25s ease' : 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
      >
        {/* Emoji icon */}
        <div className="expense-emoji-wrap" style={{ background: color }}>
          {emoji}
        </div>

        {/* Middle text */}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-text-primary font-medium text-[15px] truncate">{label}</span>
          <span className="text-text-secondary text-[12px] flex items-center gap-1 mt-0.5">
            <span>{payIcon} {payLabel}</span>
            <span className="text-border">·</span>
            <span>{time}</span>
          </span>
          {expense.note && (
            <span className="text-text-secondary text-[12px] truncate italic mt-0.5">
              {expense.note}
            </span>
          )}
        </div>

        {/* Amount */}
        <span className="text-accent font-mono font-semibold text-[17px] flex-shrink-0">
          ₹{formatted}
        </span>
      </div>
    </div>
  );
}
