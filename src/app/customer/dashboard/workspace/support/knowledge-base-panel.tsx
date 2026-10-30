'use client';

import { useMemo, useState } from 'react';
import NewKbForm from './new-kb-form';
import EditKbForm from './edit-kb-form';

type Article = { id: string; question: string; answer: string };
const CATEGORIES = ['All', 'Shipping and delivery', 'Tracking', 'Pickup and booking', 'Pricing and payments', 'Claims and damages', 'Customs and documents', 'Contact and hours'];
function categoryFor(article: Article) {
  const text = `${article.question} ${article.answer}`.toLowerCase();
  if (/track|tracking|shipment status|tracking number/.test(text)) return 'Tracking';
  if (/price|payment|pay|cost|fee|invoice|refund/.test(text)) return 'Pricing and payments';
  if (/pickup|booking|book|schedule|collection/.test(text)) return 'Pickup and booking';
  if (/claim|damage|lost|missing|broken|insurance/.test(text)) return 'Claims and damages';
  if (/customs|document|clearance|import|export/.test(text)) return 'Customs and documents';
  if (/contact|phone|email|hours|open|office|address/.test(text)) return 'Contact and hours';
  return 'Shipping and delivery';
}

export default function KnowledgeBasePanel({ articles }: { articles: Article[] }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const filtered = useMemo(() => articles.filter((article) => {
    const matchesCategory = category === 'All' || categoryFor(article) === category;
    const matchesSearch = !search || `${article.question} ${article.answer}`.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  }), [articles, category, search]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 gap-2">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="⌕  Search articles..." className="h-10 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-red-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100" />
        <NewKbForm />
      </div>
      <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ${category === item ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'}`}>{item}</button>)}
      </div>
      <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        The live chat bot answers from these articles. Keep answers accurate and replace any bracketed placeholders with your real company details.
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {filtered.map((article) => <article key={article.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-2 flex items-start justify-between gap-3">
            <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{categoryFor(article)}</span>
            <div className="flex shrink-0 items-center gap-2"><EditKbForm id={article.id} question={article.question} answer={article.answer} /></div>
          </div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{article.question}</h3>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-neutral-600 dark:text-neutral-400">{article.answer}</p>
        </article>)}
        {!filtered.length && <div className="rounded-xl border border-neutral-200 bg-white px-5 py-10 text-center text-sm text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">No articles match your search.</div>}
      </div>
    </div>
  );
}
