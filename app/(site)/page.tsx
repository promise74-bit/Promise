import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// The only public page: nothing is shown until the visitor signs in.
export default async function Landing() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');
  return (
    <main className="grid min-h-[78vh] place-items-center bg-gradient-to-b from-[#f0f6ff] to-white px-5 py-12">
      <div className="w-full max-w-md text-center">
        <Image src="/logo.png" alt="Promise Computer Research" width={96} height={96} className="mx-auto h-24 w-24 rounded-2xl object-contain shadow-lg" priority unoptimized />
        <h1 className="mt-6 text-3xl font-black tracking-tight text-[#0b1730]">Promise Computer Research</h1>
        <p className="mt-3 text-slate-600">Sign in to buy airtime, data, bills, exam PINs and JAMB services.</p>
        <div className="mt-8 grid gap-3">
          <Link href="/login" className="rounded-2xl bg-[#0757d5] px-6 py-4 text-base font-bold text-white shadow-md hover:bg-[#0646ad]">Log in</Link>
          <Link href="/register" className="rounded-2xl border-2 border-[#0757d5] bg-white px-6 py-4 text-base font-bold text-[#0757d5] hover:bg-blue-50">Create an account</Link>
        </div>
      </div>
    </main>
  );
}
