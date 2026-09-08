'use client';

import { useRef, useState, useTransition } from 'react';
import { submitApplication } from './actions';

export default function ApplyForm({ jobTitle }: { jobTitle: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
        Thank you, your application has been received. Our team will be in touch if you&apos;re shortlisted.
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const res = await submitApplication(fd);
          if (res?.error) {
            setError(res.error);
            return;
          }
          setSubmitted(true);
        });
      }}
      className="space-y-3"
    >
      <input type="hidden" name="role_applied_for" value={jobTitle} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Full name</label>
        <input
          name="name"
          required
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Email</label>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Phone</label>
          <input
            name="phone"
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Cover message (optional)</label>
        <textarea
          name="message"
          rows={4}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? 'Submitting...' : 'Submit application'}
      </button>
    </form>
  );
}
