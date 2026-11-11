'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Bell} from 'lucide-react';
import {createClient} from '@/lib/supabase/client';
import {customerSafeError} from '@/lib/service-errors';

type Note={id:string;title:string;message:string;read:boolean;created_at:string};

function ago(iso:string){
  const s=Math.max(1,Math.floor((Date.now()-new Date(iso).getTime())/1000));
  if(s<60)return 'just now';
  if(s<3600)return Math.floor(s/60)+'m ago';
  if(s<86400)return Math.floor(s/3600)+'h ago';
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell({userId,initialUnread}:{userId:string;initialUnread:number}){
  const [unread,setUnread]=useState(initialUnread);
  const [open,setOpen]=useState(false);
  const [items,setItems]=useState<Note[]>([]);
  const [toast,setToast]=useState<Note|null>(null);
  const boxRef=useRef<HTMLDivElement>(null);
  const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);

  const load=useCallback(async()=>{
    const supabase=createClient();
    const {data}=await supabase.from('notifications').select('id,title,message,read,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(6);
    setItems((data as Note[])||[]);
  },[userId]);

  const refreshCount=useCallback(async()=>{
    const supabase=createClient();
    const {count}=await supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',userId).eq('read',false);
    if(typeof count==='number')setUnread(count);
  },[userId]);

  // Live updates: show a toast the moment a new notification is created for this user.
  useEffect(()=>{
    const supabase=createClient();
    const channel=supabase.channel('notifications-'+userId)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+userId},(payload)=>{
        const n=payload.new as Note;
        setUnread(c=>c+1);
        setItems(prev=>[n,...prev.filter(p=>p.id!==n.id)].slice(0,6));
        setToast(n);
        if(toastTimer.current)clearTimeout(toastTimer.current);
        toastTimer.current=setTimeout(()=>setToast(null),6000);
      })
      .subscribe();
    // Fallback in case Realtime is unavailable: refresh the badge every minute and when the tab regains focus.
    const poll=setInterval(()=>{if(document.visibilityState==='visible')void refreshCount();},60000);
    const onVisible=()=>{if(document.visibilityState==='visible')void refreshCount();};
    document.addEventListener('visibilitychange',onVisible);
    return()=>{supabase.removeChannel(channel);clearInterval(poll);document.removeEventListener('visibilitychange',onVisible);if(toastTimer.current)clearTimeout(toastTimer.current);};
  },[userId,refreshCount]);

  useEffect(()=>{
    if(!open)return;
    void load();
    const onDoc=(e:MouseEvent)=>{if(boxRef.current&&!boxRef.current.contains(e.target as Node))setOpen(false);};
    document.addEventListener('mousedown',onDoc);
    return()=>document.removeEventListener('mousedown',onDoc);
  },[open,load]);

  async function markAll(){
    const r=await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({all:true})});
    if(r.ok){setUnread(0);setItems(prev=>prev.map(n=>({...n,read:true})));}
  }
  async function markOne(id:string,wasRead:boolean){
    setOpen(false);
    if(wasRead)return;
    const r=await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    if(r.ok){setUnread(c=>Math.max(0,c-1));setItems(prev=>prev.map(n=>n.id===id?{...n,read:true}:n));}
  }

  return <>
    <div ref={boxRef} className="relative">
      <button onClick={()=>setOpen(o=>!o)} aria-label={unread>0?`Notifications, ${unread} unread`:'Notifications'} aria-expanded={open} className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 hover:border-[#0757d5] hover:text-[#0757d5]">
        <Bell size={19}/>
        {unread>0&&<span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-black leading-[18px] text-white">{unread>99?'99+':unread}</span>}
      </button>
      {open&&<div className="absolute right-0 top-12 z-[70] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl">
        <div className="flex items-center justify-between px-3 py-2"><p className="text-sm font-black">Notifications</p>{unread>0&&<button onClick={markAll} className="text-xs font-bold text-[#0757d5]">Mark all read</button>}</div>
        <div className="max-h-80 overflow-y-auto">
          {items.length===0?<p className="px-3 py-8 text-center text-sm text-slate-500">No notifications yet.</p>:items.map(n=>
            <Link key={n.id} href="/dashboard/notifications" onClick={()=>markOne(n.id,n.read)} className={'block rounded-xl px-3 py-2.5 hover:bg-slate-50 '+(n.read?'':'bg-blue-50/60')}>
              <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold text-[#0b1730]">{n.title}</p>{!n.read&&<span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0757d5]"/>}</div>
              <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-600">{customerSafeError(n.message)}</p>
              <p className="mt-1 text-[11px] text-slate-400">{ago(n.created_at)}</p>
            </Link>)}
        </div>
        <Link href="/dashboard/notifications" onClick={()=>setOpen(false)} className="mt-1 block rounded-xl px-3 py-2.5 text-center text-sm font-bold text-[#0757d5] hover:bg-slate-50">View all</Link>
      </div>}
    </div>
    {toast&&<div role="status" aria-live="polite" className="fixed inset-x-3 top-3 z-[80] mx-auto max-w-sm">
      <Link href="/dashboard/notifications" onClick={()=>setToast(null)} className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0757d5] text-white"><Bell size={17}/></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-black text-[#0b1730]">{toast.title}</span><span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-600">{customerSafeError(toast.message)}</span></span>
      </Link>
    </div>}
  </>;
}
