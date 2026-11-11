'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BookOpen, Building2, ChevronRight, FileText, GraduationCap, Grid2X2, Phone, School, Search } from 'lucide-react';

export type HubItem = { label: string; href: string; icon: string; price: string };
export type HubGroup = { id: string; label: string; icon: string; blurb: string; layout: 'grid' | 'list'; items: HubItem[] };
const ICONS: Record<string, any> = { phone: Phone, cap: GraduationCap, file: FileText, school: School, docs: FileText, book: BookOpen, building: Building2, grid: Grid2X2 };

export default function ServiceHub({ groups }: { groups: HubGroup[] }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return groups;
    return groups.map(g => ({ ...g, items: g.items.filter(i => (i.label + ' ' + g.label).toLowerCase().includes(t)) })).filter(g => g.items.length);
  }, [q, groups]);

  return (
    <div>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search services (e.g. airtime, JAMB, NECO)" className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none focus:border-[#0757d5]" />
      </div>

      {shown.length === 0 && <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No service matches “{q}”. Try a different word or contact us on WhatsApp.</p>}

      <div className="mt-6 space-y-8">
        {shown.map(g => {
          const Icon = ICONS[g.icon] || Grid2X2;
          return (
            <section key={g.id}>
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0757d5] text-white"><Icon size={20} /></span>
                <div><h2 className="text-lg font-black leading-tight">{g.label}</h2><p className="text-xs text-slate-500">{g.blurb}</p></div>
              </div>
              {g.layout === 'grid' ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {g.items.map(i => (
                    <Link key={i.href} href={i.href} className="group flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm transition hover:border-blue-200 hover:shadow-md">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f0f6ff] text-2xl">{i.icon}</span>
                      <span className="mt-2 text-sm font-bold text-slate-800">{i.label}</span>
                      <span className="mt-1 text-[11px] font-semibold text-[#0757d5]">{i.price}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  {g.items.map(i => (
                    <Link key={i.href} href={i.href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f0f6ff] text-lg">{i.icon}</span>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{i.label}</span>
                      <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#0757d5]">{i.price}</span>
                      <ChevronRight size={16} className="shrink-0 text-slate-300" />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
