import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogIn, MessageCircle, Smartphone, Wifi, Zap, Tv, GraduationCap, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const WA = 'https://wa.me/2347058391188';
const perks = [
  [Smartphone, 'Airtime & Data'], [Wifi, 'Internet plans'], [Tv, 'Cable TV'],
  [Zap, 'Electricity'], [GraduationCap, 'Exam & JAMB'], [ShieldCheck, 'PIN-secured wallet'],
] as const;

// The only public page: nothing is shown until the visitor signs in.
export default async function Landing() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');
  return (
    <main className="relative overflow-hidden bg-gradient-to-b from-[#eaf2ff] via-white to-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#0757d5]/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="relative mx-auto flex min-h-[82vh] w-full max-w-md flex-col items-center justify-center px-5 py-12 text-center">
        <Image src="/logo.png" alt="Promise Computer Research" width={96} height={96} className="h-24 w-24 rounded-3xl bg-white object-contain p-2 shadow-xl ring-1 ring-blue-100" priority unoptimized />
        <span className="mt-6 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-[#0757d5]">Ekpoma, Edo State</span>
        <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-[#0b1730]">Promise <span className="text-[#0757d5]">Computer Research</span></h1>
        <p className="mt-3 text-base leading-7 text-slate-600">Fast, reliable airtime, data, bills, exam PINs and JAMB services, all from one wallet.</p>

        <div className="mt-8 grid w-full gap-3">
          <Link href="/login" className="flex items-center justify-center gap-2 rounded-2xl bg-[#0757d5] px-6 py-5 text-lg font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-[#0646ad] active:scale-[.98]"><LogIn size={22} /> Log in</Link>
          <a href={WA} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-5 text-lg font-black text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 active:scale-[.98]"><MessageCircle size={22} /> Contact us</a>
          <Link href="/register" className="rounded-2xl border-2 border-[#0757d5] bg-white px-6 py-3.5 text-base font-bold text-[#0757d5] hover:bg-blue-50">New here? Create an account</Link>
        </div>

        <ul className="mt-10 grid w-full grid-cols-2 gap-3 text-left">
          {perks.map(([Icon, label]) => (
            <li key={label} className="flex items-center gap-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-100">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#0757d5]"><Icon size={18} /></span>{label}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
