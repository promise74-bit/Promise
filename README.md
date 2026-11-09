# Promise Computer Research — Build 2

Build 2 adds the real customer layer to Build 1.

## Included
- Supabase authentication: register, login, logout, password reset
- Customer profile
- Protected customer dashboard
- My Orders page
- Customer order/status database
- Services database seeded from the public services
- Service fields foundation for future service-specific forms
- Notifications, support messages and private order-document schema
- Row Level Security policies for customer-owned data
- Private Supabase storage bucket for order documents
- Middleware session protection

## Not included yet
- Paystack checkout/webhooks
- Admin dashboard
- Admin role management UI
- Automated service APIs
- Customer document upload UI

Those belong to Build 3/4.

## Setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Create a Supabase project.
4. Copy `.env.example` to `.env.local` and add your Supabase URL and anon/publishable key.
5. Open Supabase SQL Editor and run `supabase/schema.sql`.
6. In Supabase Authentication settings, configure your site URL and redirect URL for password recovery. For local development, use `http://localhost:3000`.
7. Run `npm run dev`.
8. Open `http://localhost:3000`.

## Important
The SQL schema uses customer-only RLS policies. Admin policies and admin UI are intentionally reserved for the next build. Do not disable RLS in production.

## WoodPay VTU integration

Airtime, mobile data, cable TV and electricity are delivered through the WoodPayVTU reseller API (`lib/woodpay.ts`). Plans are loaded through `/api/woodpay/*`; the order-creation route re-checks every price on the server.

Environment variables (server-side only, never `NEXT_PUBLIC_`):

- `WOODPAY_API_KEY` — your WoodPay API key (WoodPay app → Services → Vendor & API).
- `WOODPAY_BASE_URL` — optional; defaults to `https://woodpay.com.ng/api/v1`.

**Markup:** customers pay the WoodPay price plus the markup you set in Admin → Markup (percent or flat, per service). Run `supabase/migrations/20261110120000_woodpay_markup.sql` once; it seeds the previous rates (3% airtime, 5% data/cable/electricity).

**Wallet:** orders are paid from your WoodPay wallet. Keep it funded; Admin → WoodPay Connection shows the balance.

**Not on WoodPay:** exam PINs and recharge-card PINs. They are still sold on the site but staff deliver them manually (Admin → order → Manual delivery).
