// Branded, table-based HTML emails (renders correctly in Gmail, Outlook and mobile clients).

const BLUE = '#0757d5';
const DARK = '#063b93';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const naira = (n: number) => '₦' + Number(n || 0).toLocaleString('en-NG');

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0"><tr><td style="border-radius:12px;background:${BLUE}">
    <a href="${esc(href)}" style="display:inline-block;padding:15px 34px;font:700 16px ${FONT};color:#ffffff;text-decoration:none;border-radius:12px">${esc(label)}</a>
  </td></tr></table>`;
}

function layout(o: { preheader: string; heading: string; emoji: string; body: string; siteUrl: string }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.heading)}</title></head>
<body style="margin:0;padding:0;background:#eef3fb;font-family:${FONT};color:#0f172a">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef3fb">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3fb"><tr><td align="center" style="padding:28px 14px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
    <tr><td style="background:${BLUE};background-image:linear-gradient(135deg,${BLUE},${DARK});border-radius:24px 24px 0 0;padding:34px 32px;text-align:center">
      <table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr><td style="width:52px;height:52px;background:#ffffff;border-radius:16px;text-align:center;font:900 26px ${FONT};color:${BLUE}">P</td></tr></table>
      <div style="margin-top:14px;font:800 20px ${FONT};color:#ffffff;letter-spacing:.2px">Promise Computer Research</div>
    </td></tr>
    <tr><td style="background:#ffffff;padding:40px 32px 34px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
      <div style="text-align:center;font-size:44px;line-height:1">${o.emoji}</div>
      <h1 style="margin:16px 0 0;text-align:center;font:800 26px/1.25 ${FONT};color:#0f172a">${esc(o.heading)}</h1>
      <div style="margin-top:22px;font:400 16px/1.65 ${FONT};color:#334155">${o.body}</div>
    </td></tr>
    <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 24px 24px;padding:24px 32px;text-align:center">
      <div style="font:400 13px/1.6 ${FONT};color:#64748b">Need help? Just reply to this email or visit
        <a href="${esc(o.siteUrl)}/contact" style="color:${BLUE};font-weight:700;text-decoration:none">our support page</a>.</div>
      <div style="margin-top:8px;font:400 12px ${FONT};color:#94a3b8">© ${new Date().getFullYear()} Promise Computer Research. All rights reserved.</div>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

const first = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || 'there';
const p = (t: string) => `<p style="margin:0 0 14px">${t}</p>`;
const small = (t: string) => `<p style="margin:0;font:400 13px/1.6 ${FONT};color:#64748b">${t}</p>`;

export function welcomeEmail(a: { name?: string | null; confirmUrl: string; siteUrl: string }) {
  const perks = [
    ['⚡', 'Instant airtime, data, cable TV &amp; electricity'],
    ['📦', 'Track every order from your dashboard'],
    ['🔒', 'Secure payments and private documents'],
  ].map(([i, t]) => `<tr><td style="padding:8px 0;font:400 15px ${FONT};color:#334155"><span style="display:inline-block;width:30px">${i}</span>${t}</td></tr>`).join('');
  return {
    subject: 'Welcome to Promise Computer Research 🎉 Confirm your email',
    html: layout({
      siteUrl: a.siteUrl, emoji: '🎉', heading: `Welcome, ${esc(first(a.name))}!`,
      preheader: 'Confirm your email to activate your account.',
      body: p('Your account has been created. Tap the button below to confirm your email address and start using your dashboard.')
        + `<div style="text-align:center">${button(a.confirmUrl, 'Confirm my email')}</div>`
        + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f6ff;border-radius:16px;padding:12px 20px"><tr><td>
             <div style="font:800 14px ${FONT};color:${DARK};padding:6px 0">What you can do with your account</div>
             <table role="presentation" width="100%">${perks}</table></td></tr></table>`
        + `<div style="margin-top:22px">${small('Button not working? Copy this link into your browser:<br><span style="word-break:break-all;color:' + BLUE + '">' + esc(a.confirmUrl) + '</span>')}</div>`,
    }),
  };
}

export function resetPasswordEmail(a: { name?: string | null; resetUrl: string; siteUrl: string }) {
  return {
    subject: 'Reset your Promise Computer Research password',
    html: layout({
      siteUrl: a.siteUrl, emoji: '🔑', heading: 'Reset your password',
      preheader: 'Use this link to choose a new password.',
      body: p(`Hi ${esc(first(a.name))},`)
        + p('We received a request to reset the password on your account. Click the button below to choose a new one. This link can only be used once and expires soon.')
        + `<div style="text-align:center">${button(a.resetUrl, 'Choose a new password')}</div>`
        + `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px 16px">${small('<b style="color:#9a3412">Didn’t ask for this?</b> You can safely ignore this email, your password won’t change.')}</div>`
        + `<div style="margin-top:22px">${small('Button not working? Copy this link into your browser:<br><span style="word-break:break-all;color:' + BLUE + '">' + esc(a.resetUrl) + '</span>')}</div>`,
    }),
  };
}

export type OrderEmailData = {
  name?: string | null; reference: string; service: string; amount: number; date: string; siteUrl: string; orderUrl: string;
  extras?: [string, string][];
};

function orderCard(o: OrderEmailData, status: { label: string; bg: string; fg: string }) {
  const row = (k: string, v: string) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font:400 14px ${FONT};color:#64748b">${esc(k)}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #e2e8f0;font:700 14px ${FONT};color:#0f172a">${v}</td></tr>`;
  const extras = (o.extras || []).map(([k, v]) => row(k, esc(v))).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:6px 20px"><tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Order reference', esc(o.reference))}
      ${row('Service', esc(o.service))}
      ${extras}
      ${row('Date', esc(o.date))}
      ${row('Status', `<span style="background:${status.bg};color:${status.fg};padding:4px 12px;border-radius:999px;font:800 12px ${FONT}">${esc(status.label)}</span>`)}
      <tr><td style="padding:16px 0 10px;font:800 16px ${FONT};color:#0f172a">Total</td><td align="right" style="padding:16px 0 10px;font:900 22px ${FONT};color:${BLUE}">${o.amount > 0 ? esc(naira(o.amount)) : 'Awaiting quote'}</td></tr>
    </table></td></tr></table>`;
}

export function orderReceivedEmail(o: OrderEmailData) {
  return {
    subject: `Order ${o.reference} received`,
    html: layout({
      siteUrl: o.siteUrl, emoji: '🧾', heading: 'We’ve received your order',
      preheader: `Order ${o.reference} is waiting for payment.`,
      body: p(`Hi ${esc(first(o.name))}, thanks for choosing us! Here’s a summary of your order.`)
        + orderCard(o, { label: 'Awaiting payment', bg: '#fef3c7', fg: '#92400e' })
        + `<div style="text-align:center">${button(o.orderUrl, o.amount > 0 ? 'View order & pay' : 'View order')}</div>`
        + small('Your order starts processing as soon as payment is confirmed.'),
    }),
  };
}

export function paymentConfirmedEmail(o: OrderEmailData) {
  return {
    subject: `Payment confirmed for order ${o.reference} ✅`,
    html: layout({
      siteUrl: o.siteUrl, emoji: '✅', heading: 'Payment confirmed',
      preheader: `We’re now processing order ${o.reference}.`,
      body: p(`Hi ${esc(first(o.name))}, we’ve received your payment and your order is now being processed.`)
        + orderCard(o, { label: 'Paid · Processing', bg: '#dcfce7', fg: '#166534' })
        + `<div style="text-align:center">${button(o.orderUrl, 'Track my order')}</div>`
        + small('We’ll update the order status in your dashboard as it progresses.'),
    }),
  };
}

// Admin announcement. `message` is plain text (escaped here); blank lines become paragraphs.
// {{params.name}} is filled per recipient by Brevo.
export function broadcastEmail(a: { subject: string; message: string; siteUrl: string; buttonLabel?: string; buttonUrl?: string }) {
  const paras = a.message.trim().split(/\n{2,}/).map(t => p(esc(t).replace(/\n/g, '<br>'))).join('');
  const cta = a.buttonUrl ? `<div style="text-align:center">${button(a.buttonUrl, a.buttonLabel || 'Open')}</div>` : '';
  return {
    subject: a.subject,
    html: layout({
      siteUrl: a.siteUrl, emoji: '📣', heading: esc(a.subject),
      preheader: a.message.trim().slice(0, 90),
      body: p('Hi {{params.name}},') + paras + cta,
    }),
  };
}
