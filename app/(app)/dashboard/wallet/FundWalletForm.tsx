'use client';
import {useState} from 'react';

const QUICK=[500,1000,2000,5000,10000];

export default function FundWalletForm({min,max}:{min:number;max:number}){
  const [amount,setAmount]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  async function fund(e:React.FormEvent){
    e.preventDefault();
    const n=Number(amount);
    if(!Number.isInteger(n)||n<min||n>max){setError(`Enter a whole-naira amount from ₦${min.toLocaleString()} to ₦${max.toLocaleString()}.`);return;}
    setLoading(true);setError('');
    try{
      const r=await fetch('/api/wallet/fund',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:n})});
      const d=await r.json();
      if(!r.ok||!d.authorization_url)throw new Error(d.error||'Unable to start payment.');
      location.href=d.authorization_url;
    }catch(err){setError(err instanceof Error?err.message:'Payment error');setLoading(false);}
  }
  return <form onSubmit={fund} className="mt-4">
    <div className="flex flex-wrap gap-2">{QUICK.map(q=><button type="button" key={q} onClick={()=>setAmount(String(q))} className={'rounded-xl border px-3 py-2 text-sm font-bold '+(Number(amount)===q?'border-[#0757d5] bg-blue-50 text-[#0757d5]':'border-slate-200 text-slate-700')}>₦{q.toLocaleString()}</button>)}</div>
    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
      <input inputMode="numeric" value={amount} onChange={e=>setAmount(e.target.value.replace(/\D/g,''))} placeholder="Enter amount (₦)" aria-label="Amount to add" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-semibold outline-none focus:border-[#0757d5]"/>
      <button type="submit" disabled={loading} className="rounded-xl bg-[#0757d5] px-6 py-3 font-bold text-white disabled:opacity-60">{loading?'Opening payment…':'Fund wallet'}</button>
    </div>
    {error&&<p className="mt-2 text-sm text-red-600">{error}</p>}
    <p className="mt-2 text-xs text-slate-500">Secure payment by Paystack. Min ₦{min.toLocaleString()}, max ₦{max.toLocaleString()} per funding.</p>
  </form>;
}
