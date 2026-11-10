// Brevo transactional email client (server-side only).
// The API key is read from the BREVO_API_KEY environment variable. Do NOT hardcode it in
// source: this repository is public, and Brevo auto-revokes API keys that appear on GitHub.

// Sender identity comes only from environment variables (nothing personal is stored in the code).
function getSender() {
  const email = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!email) throw new Error('BREVO_SENDER_EMAIL is not set.');
  return { name: process.env.BREVO_SENDER_NAME?.trim() || 'Promise Computer Research', email };
}

export function getSiteUrl(request?: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (request) return new URL(request.url).origin;
  return 'https://promisecomputerresearch.com.ng';
}

export async function sendEmail(opts: { to: string; toName?: string; subject: string; html: string }) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error('BREVO_API_KEY is not set.');

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: getSender(),
      to: [{ email: opts.to, ...(opts.toName ? { name: opts.toName } : {}) }],
      subject: opts.subject,
      htmlContent: opts.html,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Brevo send failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return res.json().catch(() => ({}));
}

// One API call per 1,000 recipients. Each recipient gets their own copy (nobody sees the others).
// `html` may use {{params.name}}; each recipient's name must already be HTML-escaped.
export async function sendBulkEmail(opts: { subject: string; html: string; recipients: { email: string; name: string }[] }) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error('BREVO_API_KEY is not set.');
  let sent = 0;
  const failures: string[] = [];
  for (let i = 0; i < opts.recipients.length; i += 1000) {
    const chunk = opts.recipients.slice(i, i + 1000);
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: getSender(), subject: opts.subject, htmlContent: opts.html,
        messageVersions: chunk.map(r => ({ to: [{ email: r.email }], params: { name: r.name } })),
      }),
      cache: 'no-store',
    });
    if (res.ok) sent += chunk.length;
    else failures.push(`HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  }
  return { sent, failures };
}
