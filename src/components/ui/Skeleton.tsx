export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-overlay rounded ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-surface border border-b1 rounded-lg p-4 space-y-3">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}
