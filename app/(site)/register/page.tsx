import type {Metadata} from 'next'; export const metadata:Metadata={title:'Create account',description:'Create an account to submit and track your service requests.',alternates:{canonical:'/register'},robots:{index:false,follow:false}};
import {Suspense} from 'react';
import AuthForm from '@/components/auth/AuthForm';

export default function RegisterPage(){
  return <main className="grid-pattern min-h-[75vh] px-4 py-16">
    <Suspense fallback={<div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center">Loading…</div>}>
      <AuthForm mode="register"/>
    </Suspense>
  </main>
}
