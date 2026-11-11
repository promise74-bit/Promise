import type {MetadataRoute} from 'next';

export default function manifest():MetadataRoute.Manifest{
  return {
    name:'Promise Computer Research',
    short_name:'Promise',
    description:'JAMB, WAEC, NECO, school fees, airtime, data, TV, electricity and academic support services.',
    start_url:'/?source=pwa',
    scope:'/',
    display:'standalone',
    orientation:'portrait',
    background_color:'#ffffff',
    theme_color:'#0757d5',
    categories:['education','utilities','finance'],
    icons:[
      {src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
      {src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
      {src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}
    ],
    shortcuts:[
      {name:'My Wallet',url:'/dashboard/wallet',icons:[{src:'/icon-192.png',sizes:'192x192'}]},
      {name:'Services',url:'/services',icons:[{src:'/icon-192.png',sizes:'192x192'}]},
      {name:'My Orders',url:'/dashboard/orders',icons:[{src:'/icon-192.png',sizes:'192x192'}]}
    ]
  };
}
