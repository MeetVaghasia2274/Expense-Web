interface MonthHeaderProps {
  month: string; // e.g. "April 2025"
  total: number;
}

export default function MonthHeader({ month, total }: MonthHeaderProps) {
  const formatted = total.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <h1 className="text-text-primary font-semibold text-[20px]">{month}</h1>
      <div className="flex flex-col items-end">
        <span className="text-text-secondary text-[11px] font-medium uppercase tracking-wide">
          Total spent
        </span>
        <span className="text-accent font-mono font-bold text-[18px]">
          ₹{formatted}
        </span>
      </div>
    </div>
  );
}
