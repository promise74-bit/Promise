import Image from 'next/image';
import Link from 'next/link';
import {ChevronDown, MessageCircle} from 'lucide-react';
import {createClient} from '@/lib/supabase/server';
import NotificationBell from '@/components/notifications/NotificationBell';

const LOGO='/logo.png';

export default async function Header(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  let isAdmin=false;
  let unread=0;
  if(user){
    const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
    isAdmin=profile?.role==='admin';
    const {count}=await supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('read',false);
    unread=Number(count||0);
  }

  if(!user)return <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur"><div className="container flex h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2.5"><Image src="/logo.png" alt="Promise Computer Research" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" unoptimized/><span className="text-sm font-black text-[#0b1730]">PROMISE <span className="text-[#0757d5]">COMPUTER RESEARCH</span></span></Link><div className="flex items-center gap-2"><a href="https://wa.me/2347058391188" target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2 text-sm font-bold text-emerald-600">Contact us</a><Link href="/login" className="rounded-xl bg-[#0757d5] px-4 py-2 text-sm font-bold text-white">Log in</Link></div></div></header>;

  const links=[['Home','/'],['Services','/services'],['Wallet','/dashboard/wallet'],['About','/about'],['FAQ','/faq'],['Contact','/contact'],['My Account','/dashboard']] as const;
  return <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
    <div className="container flex h-18 items-center justify-between gap-5 py-3">
      <Link href="/" className="flex items-center gap-3">
        <Image src={LOGO} alt="Promise Computer Research" width={48} height={48} className="h-11 w-11 rounded-xl object-contain" unoptimized />
        <div><div className="text-[15px] font-black tracking-tight text-[#0b1730]">PROMISE COMPUTER</div><div className="text-[11px] font-bold tracking-[.2em] text-[#0757d5]">RESEARCH</div></div>
      </Link>
      <nav className="hidden items-center gap-7 md:flex">
        <Link className="text-sm font-semibold text-slate-700 hover:text-[#0757d5]" href="/">Home</Link>
        <Link className="flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-[#0757d5]" href="/services">Services <ChevronDown size={14}/></Link>
        <Link className="text-sm font-semibold text-slate-700 hover:text-[#0757d5]" href="/dashboard/wallet">Wallet</Link>
        <Link className="text-sm font-semibold text-slate-700 hover:text-[#0757d5]" href="/about">About</Link>
        <Link className="text-sm font-semibold text-slate-700 hover:text-[#0757d5]" href="/faq">FAQ</Link>
        <Link className="text-sm font-semibold text-slate-700 hover:text-[#0757d5]" href="/contact">Contact</Link>
        <Link className="text-sm font-semibold text-slate-700 hover:text-[#0757d5]" href="/dashboard">My Account</Link>
        {isAdmin&&<Link className="text-sm font-bold text-[#0757d5] hover:text-[#063b93]" href="/admin">Admin</Link>}
      </nav>
      <div className="hidden md:block"><a href="https://wa.me/2347058391188" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#0757d5] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#063b93]"><MessageCircle size={17}/> WhatsApp</a></div>
      {user&&<div className="ml-auto md:ml-0"><NotificationBell userId={user.id} initialUnread={unread}/></div>}
      <details className="relative md:hidden">
        <summary className="list-none cursor-pointer rounded-lg p-2 text-2xl font-bold leading-none [&::-webkit-details-marker]:hidden">☰</summary>
        <div className="absolute right-0 top-12 w-72 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl">
          <div className="flex flex-col gap-1">
            {links.map(([label,href])=><Link key={href} className="rounded-lg px-3 py-3 font-semibold hover:bg-slate-50" href={href}>{label}</Link>)}
            {isAdmin&&<Link className="rounded-lg px-3 py-3 font-bold text-[#0757d5] hover:bg-slate-50" href="/admin">Admin</Link>}
            <a href="https://wa.me/2347058391188" target="_blank" rel="noreferrer" className="mt-2 inline-flex justify-center rounded-xl bg-[#0757d5] px-4 py-3 font-bold text-white">Chat on WhatsApp</a>
          </div>
        </div>
      </details>
    </div>
  </header>;
}
