import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HelpBot from '@/components/app/HelpBot';

export default function SiteLayout({children}:{children:React.ReactNode}){
  return <><Header/>{children}<Footer/><div className="h-14" aria-hidden /><HelpBot /></>;
}
