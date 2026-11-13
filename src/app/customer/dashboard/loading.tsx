export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[55vh] w-full items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-neutral-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-600 border-t-red-600" aria-hidden="true" />
        Loading workspace…
      </div>
    </div>
  );
}
