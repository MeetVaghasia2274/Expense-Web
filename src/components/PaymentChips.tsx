import type { PaymentMethod } from '../types/expense';
import { PAYMENT_META } from '../types/expense';

interface PaymentChipsProps {
  selected: PaymentMethod;
  onSelect: (p: PaymentMethod) => void;
}

const METHODS = Object.keys(PAYMENT_META) as PaymentMethod[];

export default function PaymentChips({ selected, onSelect }: PaymentChipsProps) {
  return (
    <div className="flex gap-2 px-4">
      {METHODS.map((method) => {
        const { label, icon } = PAYMENT_META[method];
        const isSelected = selected === method;
        return (
          <button
            key={method}
            className={`payment-chip ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(method)}
            aria-pressed={isSelected}
            aria-label={label}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
