export function EmailListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-line" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-3 w-28 animate-pulse rounded bg-line" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-line" />
          <div className="h-3 flex-1 animate-pulse rounded bg-line" />
        </li>
      ))}
    </ul>
  );
}
