import Header from '@/components/Header';

export default function SiteLayout({children}:{children:React.ReactNode}){
  return <><Header/>{children}<p className="py-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} Promise Computer Research</p></>;
}
