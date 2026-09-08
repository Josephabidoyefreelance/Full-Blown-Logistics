import { createClient } from '@/lib/supabase/server';
import ApplyForm from './apply-form';

export default async function CareerApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: posting } = await supabase
    .from('career_postings')
    .select('id, title, location, employment_type, description')
    .eq('id', id)
    .single();

  if (!posting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
        <div className="text-center text-neutral-500">This role is no longer available.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-10">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between bg-black px-6 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="JAAD Logistics" className="h-10 w-10 rounded" />
          <div className="text-xl font-bold tracking-wide text-white">JAAD LOGISTICS CAREERS</div>
        </div>

        <div className="p-6">
          <h1 className="mb-1 text-xl font-bold uppercase text-neutral-900">{posting.title}</h1>
          <div className="mb-5 text-sm text-neutral-500">
            {posting.location} &middot; {posting.employment_type}
          </div>

          <div className="mb-8 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
            {posting.description}
          </div>

          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Apply for this role</h2>
          <ApplyForm jobTitle={posting.title} />
        </div>
      </div>
    </div>
  );
}
