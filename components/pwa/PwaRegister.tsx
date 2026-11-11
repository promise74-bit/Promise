'use client';
import {useEffect,useState} from 'react';

type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
const KEY='pcr-install-dismissed';
const SNOOZE_MS=14*24*60*60*1000;

function snoozed(){try{const t=Number(localStorage.getItem(KEY)||0);return t>0&&Date.now()-t<SNOOZE_MS;}catch{return false;}}

export default function PwaRegister(){
  const [installEvent,setInstallEvent]=useState<InstallEvent|null>(null);
  const [iosHint,setIosHint]=useState(false);

  useEffect(()=>{
    if('serviceWorker' in navigator&&process.env.NODE_ENV==='production'){
      navigator.serviceWorker.register('/sw.js').catch(()=>{});
    }
    const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as any).standalone===true;
    if(standalone||snoozed())return;

    const onPrompt=(e:Event)=>{e.preventDefault();setInstallEvent(e as InstallEvent);};
    const onInstalled=()=>{setInstallEvent(null);setIosHint(false);};
    window.addEventListener('beforeinstallprompt',onPrompt);
    window.addEventListener('appinstalled',onInstalled);

    const ua=navigator.userAgent;
    const isIos=/iphone|ipad|ipod/i.test(ua)&&!(window as any).MSStream;
    const isSafari=/safari/i.test(ua)&&!/crios|fxios|edgios/i.test(ua);
    if(isIos&&isSafari)setIosHint(true);

    return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled);};
  },[]);

  function dismiss(){try{localStorage.setItem(KEY,String(Date.now()));}catch{}setInstallEvent(null);setIosHint(false);}
  async function install(){
    if(!installEvent)return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(()=>null);
    setInstallEvent(null);
  }

  if(!installEvent&&!iosHint)return null;
  return <div role="dialog" aria-label="Install the app" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl">
    <div className="flex items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl"/>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-[#0b1730]">Install Promise on your phone</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-600">{installEvent?'Open your wallet and services in one tap, like a regular app.':'Tap the Share button, then “Add to Home Screen”.'}</p>
        <div className="mt-3 flex gap-2">
          {installEvent&&<button onClick={install} className="rounded-xl bg-[#0757d5] px-4 py-2 text-xs font-bold text-white">Install app</button>}
          <button onClick={dismiss} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Not now</button>
        </div>
      </div>
    </div>
  </div>;
}
