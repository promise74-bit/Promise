// Free help bot: no AI, no cost. Matches keywords and replies with short, accurate answers and links.
// Only describe things the site really does. Anything uncertain goes to a human on WhatsApp.
export const WHATSAPP = 'https://wa.me/2347058391188';
export type BotLink = { label: string; href: string; external?: boolean };
export type BotReply = { text: string; links?: BotLink[]; chips?: string[] };

type Intent = { id: string; match: RegExp[]; reply: BotReply };
const human: BotLink = { label: 'Chat with our team on WhatsApp', href: WHATSAPP, external: true };

const INTENTS: Intent[] = [
  { id: 'refund', match: [/refund/, /money (was )?(deducted|taken|gone)/, /debited but/, /charged but/, /failed (order|transaction|payment)/, /not (delivered|received)/, /didn'?t (get|receive)/, /never (got|received)/],
    reply: { text: 'If we could not deliver an order, your money is refunded to your wallet automatically and you get a notification.\n\nIf an order says "processing", please do not buy again. Some orders take a few minutes. If it is still not done after about 10 minutes, message us with the order reference from My Orders.', links: [{ label: 'My Orders', href: '/dashboard/orders' }, { label: 'Wallet history', href: '/dashboard/wallet#history' }, human], chips: ['Track my order', 'Talk to a human'] } },
  { id: 'pin', match: [/pin/, /pass ?code/], reply: { text: 'Your payment PIN is a 4-digit code you enter when paying from your wallet.\n\nTo create or change it, open Wallet and tap "Set PIN" or "Change PIN". You will confirm with your account password, so it also works if you forgot the old PIN. Five wrong tries lock it for 15 minutes.', links: [{ label: 'Open Wallet', href: '/dashboard/wallet' }, { label: 'Forgot account password', href: '/forgot-password' }], chips: ['Fund my wallet'] } },
  { id: 'transfer', match: [/bank transfer/, /account number/, /transfer (money|to)/, /fund.*(transfer|bank)/, /virtual account/], reply: { text: 'You can fund by bank transfer: open Wallet and tap "Get my account number". Send any amount to it from any bank app and your wallet is credited automatically, usually within a minute.\n\nIf the account number is not available yet, fund with your card for now.', links: [{ label: 'Wallet: bank transfer', href: '/dashboard/wallet#transfer' }], chips: ['Fund with card', 'Talk to a human'] } },
  { id: 'fund', match: [/fund/, /top ?up/, /add (money|funds)/, /deposit/, /wallet/, /balance/], reply: { text: 'To fund your wallet, open Wallet and choose:\n• Card: enter an amount and pay with Paystack.\n• Bank transfer: get your own account number and send money to it.\n\nYour balance shows at the top of every page.', links: [{ label: 'Fund with card', href: '/dashboard/wallet#fund' }, { label: 'Fund by bank transfer', href: '/dashboard/wallet#transfer' }], chips: ['What is my payment PIN?', 'Get a receipt'] } },
  { id: 'receipt', match: [/receipt/, /proof of payment/, /statement/, /history/, /transactions?/], reply: { text: 'Open Wallet and scroll to Transactions. You can filter by type, status and date. Tap "Receipt" beside any successful transaction, then "Print / Save as PDF".', links: [{ label: 'Wallet transactions', href: '/dashboard/wallet#history' }] } },
  { id: 'data', match: [/data/, /\bgb\b/, /\bmb\b/, /bundle/, /internet/], reply: { text: 'To buy data: open Data, choose the network and plan, enter the phone number and pay. Prices shown are the final prices.', links: [{ label: 'Buy data', href: '/services/data-subscription/request' }], chips: ['Buy airtime', 'My data was not delivered'] } },
  { id: 'airtime', match: [/airtime/, /recharge/, /top ?up (my )?(phone|line)/], reply: { text: 'To buy airtime: open Airtime, choose the network, enter the number and amount (minimum ₦50) and pay.', links: [{ label: 'Buy airtime', href: '/services/airtime-recharge/request' }], chips: ['Buy data'] } },
  { id: 'cable', match: [/dstv/, /gotv/, /startimes?/, /cable/, /\btv\b/, /decoder/, /smart ?card/, /iuc/], reply: { text: 'For cable TV, choose DStv, GOtv or StarTimes, pick your package and enter your smartcard / IUC number. We check the number before you pay.', links: [{ label: 'DStv', href: '/services/dstv-subscription/request' }, { label: 'GOtv', href: '/services/gotv-subscription/request' }, { label: 'StarTimes', href: '/services/startimes-subscription/request' }] } },
  { id: 'electricity', match: [/electric/, /light/, /meter/, /nepa/, /disco/, /prepaid/, /postpaid/, /token/], reply: { text: 'To buy electricity: choose your provider, enter your meter number and meter type (prepaid or postpaid) and the amount (minimum ₦1,000). We verify the meter before you pay. Your token appears on the order and in your notifications.', links: [{ label: 'Buy electricity', href: '/services/electricity-bill/request' }, { label: 'My Orders', href: '/dashboard/orders' }] } },
  { id: 'exam', match: [/waec/, /neco/, /nabteb/, /exam pin/, /result checker/, /scratch card/], reply: { text: 'WAEC, NECO and NABTEB PINs are delivered by our team after payment. You will get a notification and the PIN shows on your order.', links: [{ label: 'Buy exam PIN', href: '/services/exam-pins/request' }, human] } },
  { id: 'jamb', match: [/jamb/, /admission letter/, /original result/, /olevel|o'level/, /profile code/, /registration number/, /indemnity/], reply: { text: 'All JAMB services are in the JAMB Services dropdown in the menu. Open the one you need to see its price and request it. Prices shown include our service fee.', links: [{ label: 'All services', href: '/services' }], chips: ['Talk to a human'] } },
  { id: 'services', match: [/service/, /what do you (offer|do)/, /post.?utme/, /school fees/, /assignment/, /project/, /property/, /document/], reply: { text: 'We offer airtime, data, cable TV, electricity, exam PINs, JAMB services, school and admission help, documents, academic support and property services. Use the menu or the search on the Services page.', links: [{ label: 'Browse services', href: '/services' }] } },
  { id: 'orders', match: [/track/, /order status/, /my orders?/, /status/, /processing/, /pending/, /where is my/], reply: { text: 'Open My Orders to see every order and its status:\n• Pending: waiting for payment\n• Processing: being delivered, please wait\n• Completed: done\n• Needs information: we may need something from you\n\nYou also get a notification when it changes.', links: [{ label: 'My Orders', href: '/dashboard/orders' }, { label: 'Notifications', href: '/dashboard/notifications' }], chips: ['I was charged but not delivered'] } },
  { id: 'notifications', match: [/notification/, /bell/, /alerts?/], reply: { text: 'The bell at the top shows new updates. Open the Notifications page to filter, read everything and mark all as read.', links: [{ label: 'Notifications', href: '/dashboard/notifications' }] } },
  { id: 'password', match: [/forgot/, /reset/, /password/, /login/, /log in/, /sign in/, /can'?t (log|sign)/], reply: { text: 'To reset your password, use the "Forgot password" page. We will email you a reset link.', links: [{ label: 'Reset password', href: '/forgot-password' }] } },
  { id: 'profile', match: [/profile/, /phone number/, /change (my )?(name|number|email)/, /update my/], reply: { text: 'You can update your name and phone number on your Profile page.', links: [{ label: 'Open Profile', href: '/dashboard/profile' }] } },
  { id: 'install', match: [/install/, /home screen/, /app\b/], reply: { text: 'You can install this site like an app. On your phone, open the browser menu and choose "Add to Home screen" (or "Install app").' } },
  { id: 'human', match: [/human/, /agent/, /person/, /support/, /contact/, /call/, /speak/, /whatsapp/, /help me/, /complain/], reply: { text: 'Our team is happy to help. Tap below to message us on WhatsApp. Please include your order reference if it is about an order.', links: [human] } },
  { id: 'hello', match: [/^(hi|hello|hey|good (morning|afternoon|evening)|help|menu)\b/], reply: { text: 'Hello! What can I help you with?', chips: ['Fund my wallet', 'Buy data', 'Track my order', 'Talk to a human'] } },
  { id: 'thanks', match: [/thank/, /thanks/, /great/, /okay thanks/], reply: { text: 'You are welcome! Anything else?', chips: ['Fund my wallet', 'Talk to a human'] } },
];

export const START_CHIPS = ['Fund my wallet', 'Buy data', 'Track my order', 'I was charged but not delivered', 'Payment PIN', 'Talk to a human'];
const FALLBACK: BotReply = { text: 'I am not sure about that one. Try one of these, or chat with our team.', links: [human], chips: START_CHIPS.slice(0, 4) };

export function answer(input: string): BotReply {
  const t = input.toLowerCase().trim();
  if (!t) return FALLBACK;
  let best: { score: number; intent?: Intent } = { score: 0 };
  for (const it of INTENTS) {
    const score = it.match.reduce((s, re) => s + (re.test(t) ? 1 : 0), 0);
    if (score > best.score) best = { score, intent: it };
  }
  return best.intent ? best.intent.reply : FALLBACK;
}
