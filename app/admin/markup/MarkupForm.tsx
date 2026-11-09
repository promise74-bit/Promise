'use client';

import { useState } from 'react';

type Rule = { mode: 'percent' | 'flat'; value: number };
type Row = { category: string; label: string; rule: Rule };

export default function MarkupForm({ rows }: { rows: Row[] }) {
  const [state, setState] = useState<Record<string, Rule>>(Object.fromEntries(rows.map(r => [r.category, r.rule])));
  const [msg, setMsg] = useState<Record<string, string>>({});
  const example = (r: Rule) => (r.mode === 'flat' ? Math.round(r.value) : Math.ceil((1000 * r.value) / 100));

  async function save(category: string) {
    setMsg(m => ({ ...m, [category]: 'Saving…' }));
    const rule = state[category];
    const res = await fetch('/api/admin/markup', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, ...rule }) });
    const data = await res.json().catch(() => ({}));
    setMsg(m => ({ ...m, [category]: res.ok ? 'Saved' : data.error || 'Could not save.' }));
  }

  return (
    <div className="mt-5 space-y-4">
      {rows.map(r => {
        const rule = state[r.category];
        return (
          <div key={r.category} className="rounded-2xl border border-slate-200 p-4">
            <p className="font-black">{r.label}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select value={rule.mode} onChange={e => setState(s => ({ ...s, [r.category]: { ...rule, mode: e.target.value as Rule['mode'] } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat (₦)</option>
              </select>
              <input type="number" min={0} step="any" value={rule.value} onChange={e => setState(s => ({ ...s, [r.category]: { ...rule, value: Number(e.target.value) } }))} className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <button onClick={() => save(r.category)} className="rounded-xl bg-[#0757d5] px-4 py-2 text-sm font-bold text-white">Save</button>
              <span className="text-xs text-slate-500">On a ₦1,000 order you add ₦{example(rule).toLocaleString()}. {msg[r.category] || ''}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
