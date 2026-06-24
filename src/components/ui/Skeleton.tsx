export function SkeletonCard() {
  return <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />;
}

export function PageLoader() {
  return (
    <div className="grid gap-6">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
    </div>
  );
}
