'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateKbArticle, deleteKbArticle } from './actions';

export default function EditKbForm({ id, question, answer }: { id: string; question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 text-xs font-medium text-red-700 hover:underline dark:text-red-500"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Edit article</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <form
              ref={formRef}
              action={(fd) => {
                setError(null);
                startTransition(async () => {
                  const res = await updateKbArticle(id, fd);
                  if (res?.error) {
                    setError(res.error);
                    return;
                  }
                  setOpen(false);
                  router.refresh();
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Question</label>
                <input
                  name="question"
                  required
                  defaultValue={question}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Answer</label>
                <textarea
                  name="answer"
                  required
                  rows={5}
                  defaultValue={answer}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await deleteKbArticle(id);
                      if (res?.error) {
                        setError(res.error);
                        return;
                      }
                      setOpen(false);
                      router.refresh();
                    });
                  }}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/30"
                >
                  Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
