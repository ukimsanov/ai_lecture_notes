import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <div className="relative min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>

        {/* Search/Filter Skeleton */}
        <Card className="backdrop-blur-xl bg-background/80 border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full max-w-md" />
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <Card className="backdrop-blur-xl bg-background/80 border-border/50">
          <CardContent className="pt-6">
            {/* Table Header */}
            <div className="flex items-center gap-4 pb-4 border-b">
              {[180, 150, 100, 120, 80].map((width, i) => (
                <Skeleton key={i} className="h-5" style={{ width: `${width}px` }} />
              ))}
            </div>

            {/* Table Rows */}
            <div className="space-y-3 pt-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  {[180, 150, 100, 120, 80].map((width, j) => (
                    <Skeleton key={j} className="h-4" style={{ width: `${width}px` }} />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
