'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production, this is where you'd send errors to a monitoring service
    // (see Sentry setup step below). For now, at least log it.
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0b0d] px-6 text-center text-white">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-[#8a8a90]">
        This page hit an unexpected error. It has been logged. You can try again,
        or head back to the homepage.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-[#e5231b] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-md border border-[#3a3a40] px-5 py-2.5 text-sm font-semibold text-white hover:border-white"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
