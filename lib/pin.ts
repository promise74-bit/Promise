// Payment PIN: a 4-digit code the customer must enter before paying from their wallet.
// Stored as a salted scrypt hash; 5 wrong tries lock it for 15 minutes.
import crypto from 'crypto';

export const PIN_RE = /^\d{4}$/;
const MAX_TRIES = 5, LOCK_MINUTES = 15;

export function hashPin(pin: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `s1$${salt}$${crypto.scryptSync(pin, salt, 32).toString('hex')}`;
}
export function verifyPinHash(pin: string, stored: string) {
  const [v, salt, hash] = String(stored).split('$');
  if (v !== 's1' || !salt || !hash) return false;
  const a = Buffer.from(crypto.scryptSync(pin, salt, 32).toString('hex')), b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type PinCheck = { ok: true } | { ok: false; code: 'NO_PIN' | 'WRONG_PIN' | 'LOCKED'; left?: number; minutes?: number };

export async function checkPin(admin: any, userId: string, pin: string): Promise<PinCheck> {
  const { data: row } = await admin.from('transaction_pins').select('pin_hash,attempts,locked_until').eq('user_id', userId).maybeSingle();
  if (!row) return { ok: false, code: 'NO_PIN' };
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) return { ok: false, code: 'LOCKED', minutes: Math.max(1, Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 60000)) };
  if (PIN_RE.test(pin) && verifyPinHash(pin, row.pin_hash)) {
    if (row.attempts) await admin.from('transaction_pins').update({ attempts: 0, locked_until: null }).eq('user_id', userId);
    return { ok: true };
  }
  const attempts = (row.attempts || 0) + 1;
  if (attempts >= MAX_TRIES) {
    await admin.from('transaction_pins').update({ attempts: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() }).eq('user_id', userId);
    return { ok: false, code: 'LOCKED', minutes: LOCK_MINUTES };
  }
  await admin.from('transaction_pins').update({ attempts }).eq('user_id', userId);
  return { ok: false, code: 'WRONG_PIN', left: MAX_TRIES - attempts };
}
