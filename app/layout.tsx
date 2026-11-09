import type {Metadata} from 'next'; import './globals.css'; import Header from '@/components/Header'; import Footer from '@/components/Footer';
export const metadata:Metadata={
  metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://promisecomputerresearch.com.ng'),
  title:{default:'Promise Computer Research | Academic, Educational & Digital Services in Ekpoma',template:'%s | Promise Computer Research'},
  description:'JAMB, WAEC, NECO, school fees, Post-UTME, airtime, data, TV subscriptions and academic support in Ekpoma, Edo State.',
  keywords:['Promise Computer Research','Ekpoma','Edo State','JAMB services','JAMB original result','JAMB admission letter','WAEC','NECO','Post-UTME','school fees payment','academic support','airtime and data'],
  applicationName:'Promise Computer Research',
  robots:{index:true,follow:true},
  icons:{icon:[{url:'/favicon.ico',sizes:'48x48'},{url:'/icon-192.png',sizes:'192x192',type:'image/png'},{url:'/icon-512.png',sizes:'512x512',type:'image/png'}],apple:[{url:'/apple-touch-icon.png',sizes:'180x180'}]},
  openGraph:{type:'website',locale:'en_NG',siteName:'Promise Computer Research',title:'Promise Computer Research | Academic, Educational & Digital Services',description:'JAMB, WAEC, NECO, school fees, Post-UTME, airtime, data and academic support in Ekpoma, Edo State.',images:[{url:'/og-image.png',width:1200,height:630,alt:'Promise Computer Research - Academic, Educational & Digital Services'}]},
  twitter:{card:'summary_large_image',title:'Promise Computer Research',description:'JAMB, WAEC, NECO, school fees, Post-UTME, airtime, data and academic support in Ekpoma, Edo State.',images:['/og-image.png']},
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Header/>{children}<Footer/></body></html>}
