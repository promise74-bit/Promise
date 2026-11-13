// Stateless PIN-reset codes: a 6-digit code is emailed; the browser keeps a signed ticket.
// The code is derived from the ticket + the current PIN hash, so it dies as soon as the PIN changes.
import crypto from 'crypto';

const TTL_MS = 10 * 60 * 1000;
const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PIN_RESET_SECRET || '';
const hmac = (s: string) => crypto.createHmac('sha256', secret()).update(s).digest('hex');

export function makeTicket(userId: string, pinVersion: string) {
  const exp = Date.now() + TTL_MS, nonce = crypto.randomBytes(8).toString('hex');
  const body = `${userId}.${exp}.${nonce}`;
  const sig = hmac('t|' + body + '|' + pinVersion);
  const code = String(parseInt(hmac('c|' + body + '|' + pinVersion).slice(0, 8), 16) % 1000000).padStart(6, '0');
  return { ticket: `${exp}.${nonce}.${sig}`, code };
}

export function checkTicket(userId: string, pinVersion: string, ticket: string, code: string): 'ok' | 'expired' | 'bad' {
  if (!secret()) return 'bad';
  const [exp, nonce, sig] = String(ticket).split('.');
  if (!exp || !nonce || !sig) return 'bad';
  const body = `${userId}.${exp}.${nonce}`;
  const good = hmac('t|' + body + '|' + pinVersion);
  const a = Buffer.from(sig), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return 'bad';
  if (Number(exp) < Date.now()) return 'expired';
  const want = String(parseInt(hmac('c|' + body + '|' + pinVersion).slice(0, 8), 16) % 1000000).padStart(6, '0');
  const x = Buffer.from(want), y = Buffer.from(String(code));
  return x.length === y.length && crypto.timingSafeEqual(x, y) ? 'ok' : 'bad';
}
