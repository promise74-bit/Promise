'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, Building2, ChevronDown, FileText, GraduationCap, Grid2X2, Home, LayoutGrid, Menu, MessageCircle, Phone, ReceiptText, School, Settings, User, Wallet, X, BookOpen } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import SignOutButton from '@/components/dashboard/SignOutButton';
import type { NavGroup } from '@/lib/app-nav';

const ICONS: Record<string, any> = { phone: Phone, cap: GraduationCap, file: FileText, school: School, docs: FileText, book: BookOpen, building: Building2, grid: Grid2X2 };

type Props = { groups: NavGroup[]; name: string; email: string; userId: string; balance: number; unread: number; isAdmin: boolean; children: React.ReactNode };

function active(path: string, href: string) { return href === '/dashboard' ? path === '/dashboard' : path === href || path.startsWith(href + '/'); }

function SideNav({ groups, path, unread, isAdmin, onNavigate }: { groups: NavGroup[]; path: string; unread: number; isAdmin: boolean; onNavigate: () => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => { const g = groups.find(x => x.items.some(i => active(path, i.href))); if (g) setOpen(o => ({ ...o, [g.id]: true })); }, [path, groups]);
  const row = (href: string, label: string, Icon: any, badge?: number) => (
    <Link key={href} href={href} onClick={onNavigate} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active(path, href) ? 'bg-[#0757d5] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}>
      <Icon size={18} /> <span className="flex-1">{label}</span>
      {badge ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">{badge > 99 ? '99+' : badge}</span> : null}
    </Link>
  );
  return (
    <nav className="space-y-1 p-3">
      {row('/dashboard', 'Dashboard', Home)}
      {row('/dashboard/wallet', 'Wallet', Wallet)}
      <p className="px-3 pb-1 pt-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Services</p>
      {groups.map(g => {
        const Icon = ICONS[g.icon] || Grid2X2; const isOpen = !!open[g.id]; const hasActive = g.items.some(i => active(path, i.href));
        return (
          <div key={g.id}>
            <button onClick={() => setOpen(o => ({ ...o, [g.id]: !o[g.id] }))} aria-expanded={isOpen} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-slate-100 ${hasActive ? 'text-[#0757d5]' : 'text-slate-700'}`}>
              <Icon size={18} /> <span className="flex-1 text-left">{g.label}</span><ChevronDown size={16} className={`transition ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="ml-5 mt-1 space-y-0.5 border-l border-slate-200 pl-3">
              {g.items.map(i => <Link key={i.href} href={i.href} onClick={onNavigate} className={`block rounded-lg px-3 py-2 text-[13px] font-medium ${active(path, i.href) ? 'bg-blue-50 font-bold text-[#0757d5]' : 'text-slate-600 hover:bg-slate-50'}`}>{i.label}</Link>)}
            </div>}
          </div>
        );
      })}
      <p className="px-3 pb-1 pt-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Account</p>
      {row('/dashboard/orders', 'My Orders', ReceiptText)}
      {row('/dashboard/notifications', 'Notifications', Bell, unread)}
      {row('/dashboard/profile', 'Profile', User)}
      {isAdmin && row('/admin', 'Admin', Settings)}
      <a href="https://wa.me/2347058391188" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"><MessageCircle size={18} /> Help on WhatsApp</a>
    </nav>
  );
}

export default function AppShell({ groups, name, email, userId, balance, unread, isAdmin, children }: Props) {
  const path = usePathname() || '/';
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { setDrawer(false); }, [path]);
  const initial = (name || email || 'U').trim()[0]?.toUpperCase() || 'U';
  const logo = <Link href="/dashboard" className="flex items-center gap-2.5"><Image src="/logo.png" alt="Promise Computer Research" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" unoptimized /><span className="text-sm font-black leading-tight text-[#0b1730]">PROMISE<br /><span className="text-[10px] font-bold tracking-[.2em] text-[#0757d5]">COMPUTER RESEARCH</span></span></Link>;
  const bottom = [{ href: '/dashboard', label: 'Home', Icon: Home }, { href: '/dashboard/orders', label: 'Orders', Icon: ReceiptText }, { href: '/dashboard/wallet', label: 'Wallet', Icon: Wallet }, { href: '/dashboard/profile', label: 'Profile', Icon: User }];

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 overflow-y-auto border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white p-4">{logo}</div>
        <SideNav groups={groups} path={path} unread={unread} isAdmin={isAdmin} onNavigate={() => {}} />
      </aside>

      {drawer && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
        <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs overflow-y-auto bg-white shadow-2xl">
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white p-4">{logo}<button onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button></div>
          <SideNav groups={groups} path={path} unread={unread} isAdmin={isAdmin} onNavigate={() => setDrawer(false)} />
        </div></div>}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-6">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"><Menu size={22} /></button>
          <div className="lg:hidden">{logo}</div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link href="/dashboard/wallet" className="flex items-center gap-2 rounded-xl bg-[#0757d5] px-3 py-1.5 text-white shadow-sm"><Wallet size={16} /><span className="text-sm font-black">₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className="hidden rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-bold sm:inline">+ Fund</span></Link>
            <NotificationBell userId={userId} initialUnread={unread} />
            <details className="relative"><summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full bg-[#0b1730] text-sm font-black text-white">{initial}</summary>
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2"><p className="truncate text-sm font-bold">{name || 'My account'}</p><p className="truncate text-xs text-slate-500">{email}</p></div>
                <Link href="/dashboard/profile" className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-slate-50">Profile</Link>
                <Link href="/" className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-slate-50">Website home</Link>
                <div className="px-1 pt-1"><SignOutButton /></div>
              </div></details>
          </div>
        </header>
        <main className="app-main mx-auto max-w-6xl px-3 pb-28 pt-5 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {bottom.slice(0, 2).map(b => <Link key={b.href} href={b.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${active(path, b.href) ? 'text-[#0757d5]' : 'text-slate-500'}`}><b.Icon size={21} />{b.label}</Link>)}
          <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold text-slate-500"><span className="-mt-5 grid h-12 w-12 place-items-center rounded-full bg-[#0757d5] text-white shadow-lg ring-4 ring-white"><LayoutGrid size={22} /></span>Services</button>
          {bottom.slice(2).map(b => <Link key={b.href} href={b.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${active(path, b.href) ? 'text-[#0757d5]' : 'text-slate-500'}`}><b.Icon size={21} />{b.label}</Link>)}
        </div>
      </nav>
    </div>
  );
}
