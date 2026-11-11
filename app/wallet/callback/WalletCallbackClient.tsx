'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';

export default function WalletCallbackClient({reference}:{reference:string}){
  const [state,setState]=useState<'checking'|'success'|'failed'>('checking');
  const [message,setMessage]=useState('Confirming your payment…');
  useEffect(()=>{
    if(!reference){setState('failed');setMessage('No payment reference was supplied.');return;}
    let cancelled=false;
    const verify=async(attempt=1):Promise<void>=>{
      try{
        const res=await fetch('/api/wallet/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reference}),cache:'no-store'});
        const d=await res.json();
        if(cancelled)return;
        if(d.paid){setState('success');setMessage(d.balance!=null?`Your wallet has been funded. New balance: ₦${Number(d.balance).toLocaleString()}.`:'Your wallet has been funded.');return;}
        if(attempt<3&&res.status!==401&&res.status!==404){setMessage('Confirming with the payment gateway…');setTimeout(()=>verify(attempt+1),2000);return;}
        setState('failed');setMessage(d.message||'Payment was not completed.');
      }catch{
        if(cancelled)return;
        if(attempt<3){setTimeout(()=>verify(attempt+1),2000);return;}
        setState('failed');setMessage('We could not confirm the payment yet. Check your wallet shortly.');
      }
    };
    void verify();
    return()=>{cancelled=true;};
  },[reference]);
  return <main className="section bg-slate-50"><div className="container"><div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-soft">
    <div className="text-5xl" aria-hidden="true">{state==='success'?'✅':state==='checking'?'⏳':'⚠️'}</div>
    <h1 className="mt-4 text-2xl font-black">{state==='success'?'Wallet funded':state==='checking'?'Confirming payment':'Funding status'}</h1>
    <p className="mt-3 text-slate-600">{message}</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/dashboard/wallet" className="inline-flex rounded-xl bg-[#0757d5] px-5 py-3 font-bold text-white">Go to wallet</Link><Link href="/services" className="inline-flex rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700">Browse services</Link></div>
  </div></div></main>;
}
