// Reusable skeleton shimmer components

export function SkeletonExpenseRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary border border-border rounded-2xl">
      {/* Icon placeholder */}
      <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        {/* Category label */}
        <div className="skeleton h-3.5 w-24 rounded" />
        {/* Payment method */}
        <div className="skeleton h-3 w-16 rounded" />
      </div>
      {/* Amount */}
      <div className="skeleton h-4 w-14 rounded" />
    </div>
  );
}

export function SkeletonSection() {
  return (
    <div className="flex flex-col gap-2">
      {/* Date label */}
      <div className="skeleton h-3 w-20 rounded mx-1 mb-1" />
      <SkeletonExpenseRow />
      <SkeletonExpenseRow />
    </div>
  );
}

export function SkeletonHomeHeader() {
  return (
    <div className="px-4 pb-4 flex flex-col gap-3">
      {/* Month total card */}
      <div className="bg-bg-secondary border border-border rounded-2xl px-5 py-4 flex flex-col gap-2">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-9 w-36 rounded" />
        <div className="skeleton h-3 w-24 rounded" />
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="mx-4 mb-4 rounded-2xl bg-bg-secondary border border-border px-4 py-4 flex flex-col gap-3">
      <div className="skeleton h-3 w-24 rounded" />
      <div className="flex items-end gap-2 h-24 mt-2">
        {[40, 70, 55, 90, 45, 80].map((h, i) => (
          <div
            key={i}
            className="skeleton flex-1 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
