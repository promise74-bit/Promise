import BroadcastForm from './BroadcastForm';
import NotifyForm from './NotifyForm';

export const dynamic = 'force-dynamic';

export default function AdminBroadcast() {
  return (
    <div className="space-y-6">
    <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-black">In-app notification</h2>
      <p className="mt-1 text-sm text-slate-500">Appears in the customer’s notification bell, with a live pop-up if they’re online. Send a test to yourself first.</p>
      <NotifyForm />
    </div>
    <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-black">Email all customers</h2>
      <p className="mt-1 text-sm text-slate-500">Sends a branded email to every customer with a confirmed email address. Each person receives their own copy. Send a test to yourself first.</p>
      <BroadcastForm />
    </div>
    </div>
  );
}
