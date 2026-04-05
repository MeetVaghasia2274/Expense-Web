export type Category =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'groceries'
  | 'health'
  | 'other';

export type PaymentMethod = 'cash' | 'upi' | 'card';

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  paymentMethod: PaymentMethod;
  note?: string;
  createdAt: string; // ISO 8601
}

export const CATEGORY_META: Record<
  Category,
  { label: string; emoji: string; color: string }
> = {
  food:      { label: 'Food & Chai', emoji: '🍵', color: 'rgba(251,146,60,0.15)' },
  transport: { label: 'Transport',   emoji: '🚗', color: 'rgba(96,165,250,0.15)' },
  shopping:  { label: 'Shopping',    emoji: '🛍️', color: 'rgba(167,139,250,0.15)' },
  groceries: { label: 'Groceries',   emoji: '🛒', color: 'rgba(52,211,153,0.15)' },
  health:    { label: 'Health',      emoji: '💊', color: 'rgba(248,113,113,0.15)' },
  other:     { label: 'Other',       emoji: '✦',  color: 'rgba(156,163,175,0.15)' },
};

export const PAYMENT_META: Record<
  PaymentMethod,
  { label: string; icon: string }
> = {
  cash: { label: 'Cash',  icon: '💵' },
  upi:  { label: 'UPI',   icon: '📲' },
  card: { label: 'Card',  icon: '💳' },
};
