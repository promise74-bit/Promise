'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import PinModal from '@/components/wallet/PinModal';

export default function PayButton({orderId,auto=false,amount=0,walletBalance}:{orderId:string;auto?:boolean;amount?:number;walletBalance?:number}){
 const [loading,setLoading]=useState<''|'card'|'wallet'>(''); const [error,setError]=useState(''); const [pinOpen,setPinOpen]=useState(false);
 const hasWallet=typeof walletBalance==='number';
 const canUseWallet=hasWallet&&amount>0&&(walletBalance as number)>=amount;
 async function pay(){setLoading('card');setError('');try{const r=await fetch('/api/paystack/initialize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to start payment.');if(d.alreadyPaid){location.reload();return;}location.href=d.authorization_url;}catch(e){setError(e instanceof Error?e.message:'Payment error');setLoading('');}}
 async function payWithPin(pin:string):Promise<string|null>{try{const r=await fetch('/api/wallet/pay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId,pin})});const d=await r.json();if(!r.ok)return d.error||'Unable to pay from wallet.';location.href='/dashboard/orders';return null;}catch(e){return e instanceof Error?e.message:'Wallet payment error';}}
 function payWallet(){setError('');setPinOpen(true);}
 // Customers who can cover the order from their wallet choose how to pay; everyone else goes straight to Paystack as before.
 useEffect(()=>{if(auto&&!canUseWallet) pay(); // eslint-disable-next-line react-hooks/exhaustive-deps
 },[auto]);
 return <div>{error&&<p className="mb-2 text-xs text-red-600">{error}</p>}
  <div className="flex flex-wrap items-center gap-2">
   {canUseWallet&&<button onClick={payWallet} disabled={!!loading} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{loading==='wallet'?'Paying…':`Pay ₦${amount.toLocaleString()} from wallet`}</button>}
   <button onClick={pay} disabled={!!loading} className={canUseWallet?'rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-60':'rounded-xl bg-[#0757d5] px-4 py-2 text-sm font-bold text-white disabled:opacity-60'}>{loading==='card'?'Opening payment…':canUseWallet?'Pay with card':'Pay now'}</button>
  </div>
  {hasWallet&&!canUseWallet&&amount>0&&<p className="mt-2 text-xs text-slate-500">Wallet balance ₦{(walletBalance as number).toLocaleString()}. <Link href="/dashboard/wallet" className="font-bold text-[#0757d5]">Fund wallet</Link></p>}
 <PinModal open={pinOpen} mode="pay" onClose={()=>setPinOpen(false)} onPin={payWithPin}/></div>;
}
