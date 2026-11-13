'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, MessageCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName,setFullName]=useState(''); const [phone,setPhone]=useState('');
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [show,setShow]=useState(false); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [message,setMessage]=useState('');

  async function submit(e:React.FormEvent){
    e.preventDefault(); setLoading(true); setError(''); setMessage('');
    if(mode==='register'){
      try{
        const res=await fetch('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({fullName,phone,email,password})});
        const j=await res.json().catch(()=>({}));
        if(!res.ok) setError(j.error||'Could not create account.');
        else setMessage(j.emailSent===false?'Account created, but we could not send the welcome email. Use "Forgot password" to get a link.':'Account created! Check your inbox for a welcome email and tap the button to confirm your email.');
      }catch{ setError('Network error. Please try again.'); }
    } else {
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error) setError(error.message);
      else {
        const next=searchParams.get('next');
        const safeNext=next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
        router.push(safeNext);
      }
    }
    setLoading(false);
  }
  const field="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none transition focus:border-[#0757d5] focus:bg-white focus:ring-4 focus:ring-blue-100";
  const label="block text-sm font-bold text-slate-700";
  return <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
    <div className="bg-gradient-to-br from-[#0757d5] to-[#063b93] px-6 py-8 text-center text-white sm:px-8">
      <Image src="/logo.png" alt="Promise Computer Research" width={64} height={64} className="mx-auto h-16 w-16 rounded-2xl bg-white object-contain p-1.5 shadow-lg" unoptimized/>
      <h1 className="mt-4 text-2xl font-black">{mode==='login'?'Welcome back':'Create your account'}</h1>
      <p className="mt-1 text-sm text-blue-100">{mode==='login'?'Log in to buy airtime, data, bills and more.':'Join to buy and track your services in one place.'}</p>
    </div>
    <div className="p-6 sm:p-8">
    {error&&<div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {message&&<div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}
    <form onSubmit={submit} className="space-y-4">
      {mode==='register'&&<><label className={label}>Full name<input required value={fullName} onChange={e=>setFullName(e.target.value)} className={field} placeholder="Your full name" autoComplete="name" /></label><label className={label}>Phone number<input required inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} className={field} placeholder="080..." autoComplete="tel" /></label></>}
      <label className={label}>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className={field} placeholder="you@example.com" autoComplete="email" /></label>
      <label className={label}>Password<span className="relative block"><input required minLength={6} type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className={field+' pr-12'} placeholder="At least 6 characters" autoComplete={mode==='login'?'current-password':'new-password'} /><button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?'Hide password':'Show password'} className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-[#0757d5]">{show?<EyeOff size={20}/>:<Eye size={20}/>}</button></span></label>
      {mode==='login'&&<div className="text-right"><Link className="text-sm font-semibold text-[#0757d5] hover:underline" href="/forgot-password">Forgot password?</Link></div>}
      <button disabled={loading} className="w-full rounded-xl bg-[#0757d5] px-5 py-4 text-base font-black text-white shadow-md shadow-blue-600/20 transition hover:bg-[#063b93] active:scale-[.98] disabled:opacity-60">{loading?'Please wait…':mode==='login'?'Log in':'Create account'}</button>
    </form>
    <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">{mode==='login'?<>Don't have an account? <Link className="font-bold text-[#0757d5]" href="/register">Create one</Link></>:<>Already have an account? <Link className="font-bold text-[#0757d5]" href="/login">Log in</Link></>}</div>
    <a href="https://wa.me/2347058391188" target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100"><MessageCircle size={18}/> Need help? Contact us</a>
    </div>
  </div>
}
