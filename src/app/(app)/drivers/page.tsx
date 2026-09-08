import { createClient } from '@/lib/supabase/server';
import StatusSwitch from './status-switch';
import NewDriverForm from './new-driver-form';
import StarRating from './star-rating';

const TABS = [
  { key: 'profiles', label: 'Profiles' },
  { key: 'performance', label: 'Performance' },
];

const PROFILE_COLS = 'grid-cols-[200px_220px_200px_160px]';
const PERFORMANCE_COLS = 'grid-cols-[180px_150px_150px_150px_150px_150px_110px]';

function average(values: (number | null)[]) {
  const nums = values.filter((v): v is number => v != null);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view ?? 'profiles';

  const supabase = await createClient();
  const { data: drivers, error } = await supabase
    .from('drivers')
    .select(
      'id, name, license_no, license_expiry, status, trips_completed, communication_rating, punctuality_rating, neatness_rating, composure_rating',
    )
    .order('name');

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Driver Management</h1>
          <p className="text-sm text-neutral-500">Profiles, licences and performance.</p>
        </div>
        <NewDriverForm />
      </div>

      <div className="mb-5 flex gap-6 border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((t) => (
          <a
            key={t.key}
            href={`/drivers?view=${t.key}`}
            className={`pb-2.5 text-sm font-medium ${
              view === t.key
                ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">Could not load drivers: {error.message}</p>}

      {view === 'profiles' && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="min-w-[900px]">
            <div
              className={`grid ${PROFILE_COLS} items-center justify-between bg-neutral-50 px-4 py-2.5 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400`}
            >
              <div>Name</div>
              <div>Licence no.</div>
              <div>Expiry</div>
              <div className="text-right">Status</div>
            </div>

            {(drivers ?? []).map((d) => (
              <div
                key={d.id}
                className={`grid ${PROFILE_COLS} items-center justify-between border-t border-neutral-100 px-4 py-2.5 text-sm dark:border-neutral-800`}
              >
                <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">{d.name}</div>
                <div className="truncate font-mono text-neutral-700 dark:text-neutral-300">{d.license_no}</div>
                <div className="truncate text-neutral-700 dark:text-neutral-300">{d.license_expiry ?? '\u2014'}</div>
                <div className="flex justify-end">
                  <StatusSwitch id={d.id} status={d.status} />
                </div>
              </div>
            ))}

            {!drivers?.length && !error && (
              <div className="px-4 py-8 text-center text-neutral-400">No drivers yet.</div>
            )}
          </div>
        </div>
      )}

      {view === 'performance' && (
        <div>
          <p className="mb-4 text-xs text-neutral-400">
            Rated across four categories by the ops team. Click a star in any category to update it, overall is the
            average of the four.
          </p>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[1200px]">
              <div
                className={`grid ${PERFORMANCE_COLS} items-center justify-between bg-neutral-50 px-4 py-2.5 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400`}
              >
                <div>Name</div>
                <div>Communication</div>
                <div>Punctuality</div>
                <div>Neatness</div>
                <div>Composure</div>
                <div>Trips</div>
                <div className="text-right">Overall</div>
              </div>

              {(drivers ?? []).map((d) => {
                const overall = average([
                  d.communication_rating,
                  d.punctuality_rating,
                  d.neatness_rating,
                  d.composure_rating,
                ]);
                return (
                  <div
                    key={d.id}
                    className={`grid ${PERFORMANCE_COLS} items-center justify-between border-t border-neutral-100 px-4 py-2.5 text-sm dark:border-neutral-800`}
                  >
                    <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">{d.name}</div>
                    <StarRating id={d.id} column="communication_rating" value={d.communication_rating} />
                    <StarRating id={d.id} column="punctuality_rating" value={d.punctuality_rating} />
                    <StarRating id={d.id} column="neatness_rating" value={d.neatness_rating} />
                    <StarRating id={d.id} column="composure_rating" value={d.composure_rating} />
                    <div className="truncate text-neutral-700 dark:text-neutral-300">{d.trips_completed ?? 0}</div>
                    <div className="text-right text-neutral-700 dark:text-neutral-300">
                      {overall != null ? overall.toFixed(1) : '\u2014'}
                    </div>
                  </div>
                );
              })}

              {!drivers?.length && !error && (
                <div className="px-4 py-8 text-center text-neutral-400">No drivers yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
