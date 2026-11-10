import { createAdminClient } from '@/lib/supabase/admin';
import { getSiteUrl, sendEmail } from '@/lib/brevo';
import { orderReceivedEmail, paymentConfirmedEmail } from '@/lib/email-templates';

// Never throws: an email problem must not break order creation or payment handling.
export async function sendOrderEmail(orderId: string, kind: 'received' | 'paid', request?: Request) {
  try {
    if (!process.env.BREVO_API_KEY) return;
    const admin = createAdminClient();
    const { data: order } = await admin.from('orders')
      .select('reference,amount,customer_id,service_id,created_at,form_data').eq('id', orderId).maybeSingle();
    if (!order?.customer_id) return;

    const [{ data: service }, { data: profile }, userRes] = await Promise.all([
      admin.from('services').select('title').eq('id', order.service_id).maybeSingle(),
      admin.from('profiles').select('full_name').eq('id', order.customer_id).maybeSingle(),
      admin.auth.admin.getUserById(order.customer_id),
    ]);
    const to = userRes.data?.user?.email;
    if (!to) return;

    const siteUrl = getSiteUrl(request);
    const fd = (order.form_data || {}) as Record<string, any>;
    const extras: [string, string][] = [];
    if (fd.plan_name) extras.push(['Plan', String(fd.plan_name)]);
    if (fd.network) extras.push(['Network', String(fd.network).toUpperCase()]);
    if (fd.phone_number) extras.push(['Phone', String(fd.phone_number)]);

    const data = {
      name: profile?.full_name, reference: order.reference, service: service?.title || 'Service request',
      amount: Number(order.amount || 0), siteUrl, extras,
      date: new Date(order.created_at || Date.now()).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }),
      orderUrl: `${siteUrl}/dashboard/orders/${orderId}`,
    };
    const mail = kind === 'received' ? orderReceivedEmail(data) : paymentConfirmedEmail(data);
    await sendEmail({ to, toName: profile?.full_name || undefined, ...mail });
  } catch (error) {
    console.error('Order email failed:', error instanceof Error ? error.message : error);
  }
}
