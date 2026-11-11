import {createClient} from '@/lib/supabase/server';
import Link from 'next/link';
import {ArrowDownLeft,ArrowUpRight,Wallet} from 'lucide-react';
import FundWalletForm from './FundWalletForm';
import {MAX_FUNDING,MIN_FUNDING} from '@/lib/wallet';

export const dynamic='force-dynamic';

export default async function WalletPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return null;
  const {data:wallet,error:walletError}=await supabase.from('wallets').select('balance').eq('user_id',user.id).maybeSingle();
  const {data:txData}=await supabase.from('wallet_transactions').select('id,kind,direction,amount,status,reference,description,created_at,orders(reference)').eq('user_id',user.id).neq('status','failed').order('created_at',{ascending:false}).limit(30);
  const txns=txData??[];
  const balance=Number(wallet?.balance||0);
  return <>
    <div className="mb-6"><p className="text-sm font-bold text-[#0757d5]">MY WALLET</p><h1 className="mt-1 text-3xl font-black">Wallet</h1><p className="mt-2 text-slate-500">Add money once, then pay for any service in one tap.</p></div>
    {walletError&&<div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">The wallet is not available yet. Please try again shortly.</div>}
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-3xl bg-[#0757d5] p-6 text-white shadow-sm">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><Wallet/></div><p className="text-sm font-bold uppercase tracking-[.16em] text-blue-100">Available balance</p></div>
        <p className="mt-6 text-4xl font-black">₦{balance.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
        <Link href="/services" className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0757d5]">Browse services</Link>
      </section>
      <section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-lg font-black">Add money</h2><FundWalletForm min={MIN_FUNDING} max={MAX_FUNDING}/></section>
    </div>
    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-black">Transactions</h2>
      {txns.length===0?<div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No wallet activity yet.</div>:<ul className="mt-4 divide-y divide-slate-100">
        {txns.map((t:any)=>{const credit=t.direction==='credit';const pending=t.status==='pending';return <li key={t.id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3"><span className={'grid h-9 w-9 place-items-center rounded-full '+(credit?'bg-emerald-50 text-emerald-600':'bg-slate-100 text-slate-600')}>{credit?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>}</span><div><p className="text-sm font-bold">{t.description||(credit?'Wallet credit':'Wallet payment')}</p><p className="text-xs text-slate-400">{new Date(t.created_at).toLocaleString()}{pending?' · awaiting payment':''}</p></div></div>
          <p className={'text-sm font-black '+(pending?'text-slate-400':credit?'text-emerald-600':'text-slate-800')}>{credit?'+':'−'}₦{Number(t.amount).toLocaleString()}</p>
        </li>})}
      </ul>}
    </section>
  </>;
}
