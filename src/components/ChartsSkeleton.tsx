import { Skeleton } from "@/components/ui/skeleton";

export function ChartsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-5">
            <div className="mb-4">
              <Skeleton className="h-5 w-40 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-[250px] w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
