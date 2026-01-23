export function TableSkeleton() {
  return (
    <div className="glass-card rounded-xl overflow-hidden animate-pulse">
      {/* Header */}
      <div className="border-b border-border bg-secondary/50 px-4 py-3">
        <div className="flex gap-8">
          {[60, 100, 150, 80, 140].map((w, i) => (
            <div key={i} className="h-4 bg-secondary rounded" style={{ width: w }} />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-border/50">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex gap-8 px-4 py-3">
            <div className="h-4 w-8 bg-secondary/50 rounded" />
            <div className="h-5 w-24 bg-secondary/50 rounded-md" />
            <div className="h-4 w-32 bg-secondary/50 rounded" />
            <div className="h-4 w-16 bg-secondary/50 rounded" />
            <div className="h-4 w-28 bg-secondary/50 rounded" />
          </div>
        ))}
      </div>
      {/* Footer */}
      <div className="border-t border-border bg-secondary/30 px-4 py-3 flex justify-between">
        <div className="h-4 w-24 bg-secondary/50 rounded" />
        <div className="flex gap-2">
          <div className="h-7 w-16 bg-secondary/50 rounded" />
          <div className="h-4 w-28 bg-secondary/50 rounded" />
          <div className="h-7 w-16 bg-secondary/50 rounded" />
        </div>
      </div>
    </div>
  );
}
