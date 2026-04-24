import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../lib/store';
import type { Category, Group, PaymentMethod } from '../types/expense';
import NumberPad from './NumberPad';
import CategoryGrid from './CategoryGrid';
import PaymentChips from './PaymentChips';
import GroupChips from './GroupChips';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function LogSheet() {
  const sheetOpen    = useStore((s) => s.sheetOpen);
  const closeSheet   = useStore((s) => s.closeSheet);
  const addExpense   = useStore((s) => s.addExpense);
  const updateExpense = useStore((s) => s.updateExpense);
  const expenseToEdit = useStore((s) => s.expenseToEdit);
  const showToast    = useStore((s) => s.showToast);
  const lastCategory = useStore((s) => s.lastCategory);
  const lastPayment  = useStore((s) => s.lastPayment);
  const lastGroup    = useStore((s) => s.lastGroup);
  const setLastCategory = useStore((s) => s.setLastCategory);
  const setLastPayment  = useStore((s) => s.setLastPayment);
  const setLastGroup    = useStore((s) => s.setLastGroup);

  const [rawAmount, setRawAmount]     = useState('0');
  const [category, setCategory]       = useState<Category>(lastCategory);
  const [payment, setPayment]         = useState<PaymentMethod>(lastPayment);
  const [group, setGroup]             = useState<Group>(lastGroup);
  const [note, setNote]               = useState('');
  const [noteOpen, setNoteOpen]       = useState(false);

  // Reset form whenever sheet opens with last-used defaults or edit data
  useEffect(() => {
    if (sheetOpen) {
      if (expenseToEdit) {
        setRawAmount(expenseToEdit.amount.toString());
        setCategory(expenseToEdit.category);
        setPayment(expenseToEdit.paymentMethod);
        setGroup(expenseToEdit.group || 'personal');
        setNote(expenseToEdit.note || '');
        setNoteOpen(!!expenseToEdit.note);
      } else {
        setRawAmount('0');
        setCategory(lastCategory);
        setPayment(lastPayment);
        setGroup(lastGroup);
        setNote('');
        setNoteOpen(false);
      }
    }
  }, [sheetOpen, expenseToEdit, lastCategory, lastPayment, lastGroup]);

  // Lock body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sheetOpen]);

  const handleKey = useCallback((key: string) => {
    setRawAmount((prev) => {
      if (key === '⌫') {
        const next = prev.slice(0, -1);
        return next === '' ? '0' : next;
      }
      if (key === '.' && prev.includes('.')) return prev;
      if (prev === '0' && key !== '.') return key;
      // Max 7 digits before decimal
      const [int] = prev.split('.');
      if (!prev.includes('.') && int.length >= 7) return prev;
      // Max 2 decimal places
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev;
      return prev + key;
    });
  }, []);

  const amountValue = parseFloat(rawAmount) || 0;
  const displayAmount = amountValue.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });

  const handleSave = async () => {
    if (amountValue <= 0) return;
    
    if (expenseToEdit) {
      const updatedExpense = {
        ...expenseToEdit,
        amount: amountValue,
        category,
        paymentMethod: payment,
        group,
        note: note.trim() || undefined,
      };
      await updateExpense(updatedExpense);
      showToast(`Updated ₹${displayAmount}`);
    } else {
      const expense = {
        id: generateId(),
        amount: amountValue,
        category,
        paymentMethod: payment,
        group,
        note: note.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      await addExpense(expense);
      showToast(`Saved ₹${displayAmount}`);
    }
    
    setLastCategory(category);
    setLastPayment(payment);
    setLastGroup(group);
    closeSheet();
  };

  const handleCategoryChange = (c: Category) => setCategory(c);
  const handlePaymentChange  = (p: PaymentMethod) => setPayment(p);
  const handleGroupChange    = (g: Group) => setGroup(g);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`sheet-backdrop ${sheetOpen ? 'open' : ''}`}
        onClick={closeSheet}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`sheet ${sheetOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Log expense"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Amount display */}
        <div className="flex items-center justify-center gap-2 py-5 px-4">
          <span className="amount-display">₹{displayAmount}</span>
        </div>

        {/* Number pad */}
        <NumberPad onKey={handleKey} />

        {/* Divider */}
        <div className="h-px bg-border mx-4 my-4" />

        {/* Category grid */}
        <CategoryGrid selected={category} onSelect={handleCategoryChange} />

        {/* Divider */}
        <div className="h-px bg-border mx-4 my-4" />

        {/* Payment chips */}
        <PaymentChips selected={payment} onSelect={handlePaymentChange} />

        {/* Divider */}
        <div className="h-px bg-border mx-4 my-4" />

        {/* Group chips */}
        <GroupChips selected={group} onSelect={handleGroupChange} />

        {/* Note toggle */}
        <div className="px-4 mt-3">
          {!noteOpen ? (
            <button
              className="text-text-secondary text-[13px] flex items-center gap-1.5 py-1"
              onClick={() => setNoteOpen(true)}
              id="add-note-btn"
            >
              <span>＋</span>
              <span>Add note</span>
            </button>
          ) : (
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's this for?"
              maxLength={60}
              autoFocus
              className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-3 text-text-primary text-[14px] placeholder-text-secondary outline-none focus:border-accent transition-colors"
              id="note-input"
            />
          )}
        </div>

        {/* Save button */}
        <div className="px-4 pt-4 pb-2">
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={amountValue <= 0}
            id="save-expense-btn"
          >
            {amountValue > 0 ? (expenseToEdit ? `Update ₹${displayAmount}` : `Save  ₹${displayAmount}`) : 'Enter an amount'}
          </button>
        </div>
      </div>
    </>
  );
}
