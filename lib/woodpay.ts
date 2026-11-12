// WoodPayVTU adapter — airtime, data, cable TV and electricity are delivered through the WoodPay reseller API.
// WOODPAY_API_KEY lives only on the server (never NEXT_PUBLIC_). Reseller prices come from WoodPay; our markup is added in /api/orders/create.
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { customerSafeError } from "@/lib/service-errors";
import { refundOrder } from "@/lib/refunds";

const BASE_URL = (process.env.WOODPAY_BASE_URL || "https://woodpay.com.ng/api/v1").replace(/\/+$/, "");
// WoodPay's pretty /api/v1/<action> rewrite does not pass the action through for server-to-server calls
// (it answered "Unknown endpoint" for a valid balance request), so we call the vendor function directly.
// Override with WOODPAY_ENDPOINT_URL if WoodPay ever moves it.
const ENDPOINT = (process.env.WOODPAY_ENDPOINT_URL || new URL(BASE_URL).origin + "/.netlify/functions/vendor-api").replace(/\/+$/, "");
export const woodpayEndpoint = (action: string) => ENDPOINT + "?action=" + action;
const API_KEY = (process.env.WOODPAY_API_KEY || "").trim();
const clean = (v: unknown) => String(v ?? "").trim();
export const woodpayConfigured = () => Boolean(API_KEY);

export async function woodpayCall(action: string, method: "GET" | "POST" = "GET", params?: Record<string, unknown>) {
  if (!API_KEY) throw new Error("WOODPAY_NOT_CONFIGURED: Set WOODPAY_API_KEY on the server.");
  const url = new URL(ENDPOINT);
  const init: RequestInit = { method, headers: { "x-api-key": API_KEY, Accept: "application/json", ...(method === "POST" ? { "Content-Type": "application/json" } : {}) }, cache: "no-store", signal: AbortSignal.timeout(20000) };
  if (method === "GET") for (const [k, v] of Object.entries(params || {})) { if (v !== undefined && clean(v)) url.searchParams.set(k, String(v)); }
  else init.body = JSON.stringify(params || {});
  url.searchParams.set("action", action);
  let res: Response;
  try { res = await fetch(url, init); }
  catch (e) { throw new Error("WOODPAY_NETWORK_AMBIGUOUS: " + (e instanceof Error ? e.message : "Network error")); }
  const raw = await res.text();
  let body: any = {}; try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
  return { httpStatus: res.status, body, raw: raw.slice(0, 300), finalUrl: res.url };
}
async function catalogue(action: string, params?: Record<string, unknown>) {
  const { httpStatus, body } = await woodpayCall(action, "GET", params);
  if (httpStatus >= 400 || body?.ok === false) throw new Error("WOODPAY_HTTP_" + httpStatus + ": " + clean(body?.error));
  return body;
}

export type WoodpayDataPlan = { id: string; networkId: string; network: string; name: string; price: number; validity: string; planType: string };
const NET_LABEL: Record<string, string> = { mtn: "MTN", airtel: "Airtel", glo: "Glo", "9mobile": "9mobile" };
export async function getWoodpayDataPlans(network: string): Promise<WoodpayDataPlan[]> {
  const n = clean(network).toLowerCase();
  if (!NET_LABEL[n]) throw new Error("Choose a supported network: MTN, Airtel, Glo or 9mobile.");
  const body = await catalogue("plans", { network: n });
  return (body.plans || []).map((p: any) => ({ id: clean(p.plan_id), networkId: n, network: NET_LABEL[n], name: clean(p.size), price: Number(p.price), validity: clean(p.validity), planType: clean(p.type) }))
    .filter((p: WoodpayDataPlan) => p.id && p.name && Number.isFinite(p.price) && p.price > 0);
}
export async function getWoodpayCablePlans(provider: string) {
  const body = await catalogue("cable_plans", { provider });
  return (body.plans || []).map((p: any) => ({ id: clean(p.plan_id), name: clean(p.name), price: Number(p.price) })).filter((p: any) => p.id && p.name && Number.isFinite(p.price) && p.price > 0) as { id: string; name: string; price: number }[];
}
export async function getWoodpayDiscos(): Promise<string[]> {
  const body = await catalogue("electricity_providers");
  return (body.providers || []).map(clean).filter(Boolean);
}
export async function getWoodpayExamPrices(): Promise<Record<string, number>> {
  const body = await catalogue("exam_plans");
  const out: Record<string, number> = {};
  for (const p of body.plans || []) { const k = clean(p.exam).toLowerCase() === "nabteb" ? "nabt" : clean(p.exam).toLowerCase(); const n = Number(p.price); if (k && Number.isFinite(n) && n > 0) out[k] = n; }
  return out;
}
export const meterTypeName = (v: unknown) => (Number(v) === 2 || clean(v).toLowerCase() === "postpaid" ? "postpaid" : "prepaid");
export async function woodpayVerifyCable(provider: string, smartcard: string) {
  const { httpStatus, body } = await woodpayCall("cable_verify", "POST", { provider, smartcard });
  return httpStatus === 200 && body?.ok ? { ok: true, customerName: clean(body.customer_name) } : { ok: false, customerName: "", error: clean(body?.error) };
}
export async function woodpayVerifyElectricity(disco: string, meterNumber: string, meterType: unknown) {
  const { httpStatus, body } = await woodpayCall("electricity_verify", "POST", { disco, meter_number: meterNumber, meter_type: meterTypeName(meterType) });
  return httpStatus === 200 && body?.ok ? { ok: true, customerName: clean(body.customer_name) } : { ok: false, customerName: "", error: clean(body?.error) };
}
export async function woodpayWalletBalance() {
  const { httpStatus, body, raw, finalUrl } = await woodpayCall("balance", "GET");
  return { httpStatus, ok: httpStatus === 200 && body?.ok === true, balance: Number(body?.balance), raw, finalUrl };
}

/* ------------------------------- fulfilment ------------------------------- */
function normalizePhone(value: unknown): string {
  const d = clean(value).replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("234")) return "0" + d.slice(3);
  if (d.length === 10) return "0" + d;
  return d;
}
const networkSlug = (v: unknown) => { const s = clean(v).toLowerCase().replace(/\s+/g, ""); return s === "etisalat" ? "9mobile" : NET_LABEL[s] ? s : null; };

type Product =
  | { kind: "airtime"; network: string | null; phone: string; amount: number }
  | { kind: "data"; network: string | null; phone: string; plan: string; amount: number }
  | { kind: "cable"; provider: string; plan: string; smartcard: string; phone: string; amount: number }
  | { kind: "electricity"; disco: string; meterNumber: string; meterType: string; phone: string; amount: number }
  | { kind: "exam"; exam: string; quantity: number; phone: string; amount: number };

function normalize(order: any, profilePhone: string): Product | null {
  const service = Array.isArray(order.services) ? order.services[0] : order.services;
  const slug = String(service?.slug || "");
  const f = (order.form_data || {}) as Record<string, any>;
  const own = normalizePhone(f.mobile_number || f.phone_number || f.phone);
  const phone = /^0[789][01]\d{8}$/.test(own) ? own : normalizePhone(profilePhone);
  if (slug === "airtime-recharge") return { kind: "airtime", network: networkSlug(f.network_id || f.network), phone: own, amount: Number(f.provider_amount || f.amount || order.amount) };
  if (slug === "data-subscription") return { kind: "data", network: networkSlug(f.network_id || f.network), phone: own, plan: clean(f.provider_plan_id || f.plan_id), amount: Number(f.provider_amount || 0) };
  if (["dstv-subscription", "gotv-subscription", "startimes-subscription"].includes(slug))
    return { kind: "cable", provider: slug.replace("-subscription", ""), plan: clean(f.provider_plan_id || f.plan_id), smartcard: clean(f.smartcard || f.smartcard_number || f.iuc_number), phone, amount: Number(f.provider_amount || 0) };
  if (slug === "electricity-bill")
    return { kind: "electricity", disco: clean(f.provider_id || f.disco_id), meterNumber: clean(f.meter_number), meterType: meterTypeName(f.meter_type || f.meter_type_id), phone, amount: Number(f.provider_amount || f.amount || 0) };
  if (slug === "exam-pins") { const e = clean(f.exam_type || f.provider_id).toLowerCase(); return { kind: "exam", exam: e === "nabt" ? "nabteb" : e, quantity: Number(f.quantity || 1), phone, amount: Number(f.provider_amount || 0) }; }
  return null; // recharge-card PINs are not on the WoodPay API: staff deliver them manually
}

function formatPins(pins: any): string {
  const arr = Array.isArray(pins) ? pins : pins ? [pins] : [];
  const lines = arr.map((p: any) => typeof p === "string" ? p : Object.entries(p || {}).filter(([k, v]) => v != null && String(v) !== "" && !/(^|_)id$|status|created|updated|amount|price/i.test(k)).map(([k, v]) => k.replace(/_/g, " ") + ": " + v).join(" · ")).filter(Boolean);
  return lines.map((t: string, i: number) => lines.length > 1 ? "#" + (i + 1) + " " + t : t).join("\n");
}

const requestId = (order: any) => "PCR" + String(order.reference).replace(/[^A-Za-z0-9]/g, "") + crypto.createHash("sha1").update(order.id).digest("hex").slice(0, 8);

async function markNeedsAttention(admin: any, order: any, note: string, customerMessage?: string) {
  await admin.from("orders").update({ status: "needs_information", admin_note: note }).eq("id", order.id);
  return { status: "failed", message: customerMessage || customerSafeError(note) };
}

// Maps a WoodPay response onto the provider_transactions row and the order.
async function applyResult(admin: any, order: any, rid: string, kind: string, r: { httpStatus: number; body: any }) {
  const b = r.body || {};
  const service = Array.isArray(order.services) ? order.services[0] : order.services;
  const status = String(b.status || "").toLowerCase();
  if (status === "failed" || (r.httpStatus >= 400 && status !== "pending")) console.error("[woodpay] delivery not completed", JSON.stringify({ order: order.reference, kind, http: r.httpStatus, response: b }).slice(0, 1500));
  const token = kind === "exam" ? formatPins(b.pins) : clean(b.token);
  const notify = (title: string, message: string) => order.customer_id ? admin.from("notifications").insert({ user_id: order.customer_id, title, message }) : null;

  if (r.httpStatus === 200 && b.ok && status === "success" && kind === "exam" && !formatPins(b.pins)) {
    // Bought and paid for at WoodPay, but no PIN came back in the reply: never refund or re-buy; staff fetch it.
    console.error("[woodpay] exam purchase succeeded without PIN data", JSON.stringify({ order: order.reference, response: b }).slice(0, 1200));
    await admin.from("provider_transactions").update({ status: "successful", provider_status: "success but no PIN in reply: fetch it from the provider", response: b }).eq("request_id", rid);
    await admin.from("orders").update({ status: "needs_information", admin_note: "Your payment was received. Our team is sending your PIN shortly." }).eq("id", order.id);
    return { status: "pending", message: "Delivered. Waiting for the PIN." };
  }
  if (r.httpStatus === 200 && b.ok && status === "success") {
    const needsToken = kind === "electricity" && !token;
    await admin.from("provider_transactions").update({ status: needsToken ? "pending" : "successful", provider_status: needsToken ? "Delivered; waiting for token" : "success", response: b }).eq("request_id", rid);
    if (needsToken) {
      await admin.from("orders").update({ status: "processing", admin_note: "Delivered. Your electricity token will appear here shortly." }).eq("id", order.id);
      return { status: "pending", message: "Delivered. Waiting for the electricity token." };
    }
    const alreadyDelivered = String(order.status) === "completed" && Boolean(order.form_data?.delivery_completed_at);
    await admin.from("orders").update({
      status: "completed", admin_note: "Delivered successfully.",
      form_data: { ...(order.form_data || {}), ...(token ? { delivery_pin: token } : {}), ...(b.units ? { delivery_units: String(b.units) } : {}), delivery_status_message: "Delivered", delivery_completed_at: new Date().toISOString() },
    }).eq("id", order.id);
    if (!alreadyDelivered) await notify("Order completed", "Your " + (service?.title || "service") + " order " + order.reference + " was completed successfully." + (token ? "\n\nDelivery details:\n" + token : " Open order details to view it."));
    return { status: "successful", result: b };
  }
  if (status === "failed") {
    await admin.from("provider_transactions").update({ status: "failed", provider_status: ("failed (wallet refunded)" + (clean(b.reason) ? ": " + clean(b.reason).slice(0, 120) : "")), response: b }).eq("request_id", rid);
    const refund = await refundOrder(admin, order, clean(b.reason));
    if (refund.ok) return { status: "failed", refunded: true, message: refund.message };
    await admin.from("orders").update({ status: "needs_information", admin_note: "Your payment was received. We could not complete delivery automatically and our team is reviewing it." }).eq("id", order.id);
    await notify("Order needs attention", "Your order " + order.reference + " could not be delivered yet. We are looking into it.");
    return { status: "failed", message: "Delivery failed." };
  }
  if (status === "pending" || r.httpStatus === 202) {
    await admin.from("provider_transactions").update({ status: "pending", provider_status: "pending", response: b }).eq("request_id", rid);
    await admin.from("orders").update({ status: "processing", admin_note: "Your order is being processed. This can take a few minutes." }).eq("id", order.id);
    return { status: "pending", message: "Still processing." };
  }
  // Rejected before any charge (bad input, wallet too low, service off) → definite failure → refund the customer.
  // A gateway/server error (5xx other than "unavailable") is an UNKNOWN outcome: never refund, keep it for a status check.
  const low = r.httpStatus === 402;
  const definite = (r.httpStatus >= 400 && r.httpStatus < 500) || (r.httpStatus === 503 && b.ok === false);
  if (!definite) {
    await admin.from("provider_transactions").update({ status: "pending", provider_status: "unknown (HTTP " + r.httpStatus + ") — check before retrying", response: { ...b, http: r.httpStatus } }).eq("request_id", rid);
    await admin.from("orders").update({ status: "processing", admin_note: "Your order is being processed. We are confirming the result." }).eq("id", order.id);
    return { status: "pending", message: "Still processing." };
  }
  await admin.from("provider_transactions").update({ status: "failed", provider_status: low ? "insufficient provider wallet" : "rejected: " + clean(b.error).slice(0, 120), response: { ...b, http: r.httpStatus } }).eq("request_id", rid);
  const refund = await refundOrder(admin, order, clean(b.error));
  if (refund.ok) return { status: "failed", refunded: true, message: refund.message };
  await admin.from("orders").update({ status: "needs_information", admin_note: "Your payment was received. We could not complete delivery automatically and our team is reviewing it." }).eq("id", order.id);
  await notify("Payment received — order needs attention", "Your payment was successful, but delivery needs a manual check. We are reviewing order " + order.reference + ".");
  return { status: "failed", message: customerSafeError(clean(b.error)) };
}

async function checkPending(admin: any, order: any, existing: any, kind: string) {
  try {
    const r = await woodpayCall("order", "GET", { reference: existing.request_id });
    if (r.httpStatus === 404) {
      // 404 can simply mean "the first attempt has not reached WoodPay yet" (the payment webhook and the verify page both deliver at once).
      // Only treat it as "never sent" once the attempt is clearly stale; otherwise a second purchase would be submitted.
      if (Date.now() - new Date(existing.created_at).getTime() < 180000) return { status: "pending", message: "Still processing." };
      await admin.from("provider_transactions").update({ status: "failed", provider_status: "not found at provider" }).eq("request_id", existing.request_id);
      return null;
    }
    return await applyResult(admin, order, existing.request_id, kind, r);
  } catch (e) {
    return { status: "pending", message: "Status check failed. The order was not resubmitted." };
  }
}

export async function fulfillOrder(orderId: string) {
  const admin = createAdminClient();
  const { data: order, error } = await admin.from("orders")
    .select("id,reference,status,payment_status,amount,form_data,customer_id,services(slug,title)").eq("id", orderId).maybeSingle();
  if (error) throw error;
  if (!order) throw new Error("Order not found");
  if (String(order.status) === "cancelled") return { status: "cancelled", message: "This order is cancelled. Nothing was submitted." };
  if (order.payment_status !== "paid") return { status: "skipped", message: "Order is not paid." };
  if (String(order.status) === "completed") return { status: "completed", message: "This order is already finalized." };

  let profilePhone = "";
  if (order.customer_id) { const { data: p } = await admin.from("profiles").select("phone").eq("id", order.customer_id).maybeSingle(); profilePhone = clean(p?.phone); }
  const product = normalize(order, profilePhone);
  if (!product) return markNeedsAttention(admin, order, "Your payment was received. Our team will complete this order and update you shortly.");
  if (!woodpayConfigured()) return (console.error("[woodpay] WOODPAY_API_KEY is not set on the server"), markNeedsAttention(admin, order, "Your payment was received. Our team will complete this order shortly."));

  const phoneKind = product.kind === "airtime" || product.kind === "data";
  const problem =
    !Number.isFinite(product.amount) || product.amount <= 0 ? "A valid purchase amount is missing." :
    phoneKind && !(product as any).network ? "The network is missing." :
    product.kind !== "exam" && !/^0[789][01]\d{8}$/.test(product.phone) ? "A valid 11-digit recipient phone number is required." :
    product.kind === "airtime" && (product.amount < 50 || !Number.isInteger(product.amount)) ? "Airtime minimum is ₦50 (whole naira)." :
    product.kind === "data" && !product.plan ? "The data plan is missing." :
    product.kind === "cable" && (!product.plan || !/^\d{5,15}$/.test(product.smartcard)) ? "A valid TV package and smartcard number are required." :
    product.kind === "exam" && (!["waec", "neco", "nabteb"].includes(product.exam) || !Number.isInteger(product.quantity) || product.quantity < 1 || product.quantity > 10) ? "A valid exam type and quantity are required." :
    product.kind === "electricity" && (!product.disco || !/^\d{6,15}$/.test(product.meterNumber) || product.amount < 500) ? "A valid disco, meter number and amount are required." : "";
  if (problem) return markNeedsAttention(admin, order, problem);

  const { data: existing, error: exErr } = await admin.from("provider_transactions").select("*")
    .eq("order_id", order.id).eq("provider", "woodpay").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (exErr) throw exErr;
  if (existing?.status === "successful") return { status: "successful", message: "Already fulfilled.", transaction: existing };
  if (existing?.status === "pending") {
    const checked = await checkPending(admin, order, existing, product.kind);
    if (checked) return checked;
  }

  const base = requestId(order);
  const rid = existing ? base + "R" + Date.now().toString(36).toUpperCase() : base;
  const { error: insErr } = await admin.from("provider_transactions").insert({ order_id: order.id, provider: "woodpay", request_id: rid, service_id: product.kind, amount: product.amount, status: "pending", provider_status: "pending", request_data: product });
  if (insErr) { if ((insErr as any).code === "23505") return { status: "pending", message: "Still processing." }; throw insErr; } // another worker is already delivering this order

  const body: Record<string, unknown> =
    product.kind === "airtime" ? { network: product.network, phone: product.phone, amount: product.amount, reference: rid } :
    product.kind === "data" ? { network: product.network, plan_id: product.plan, phone: product.phone, reference: rid } :
    product.kind === "exam" ? { exam: product.exam, quantity: product.quantity, reference: rid } :
    product.kind === "cable" ? { provider: product.provider, plan_id: product.plan, smartcard: product.smartcard, phone: product.phone, reference: rid } :
    { disco: product.disco, meter_number: product.meterNumber, meter_type: product.meterType, amount: product.amount, phone: product.phone, reference: rid };
  try {
    const r = await woodpayCall(product.kind, "POST", body);
    return await applyResult(admin, order, rid, product.kind, r);
  } catch (e) {
    const raw = e instanceof Error ? e.message : "WoodPay request failed.";
    await admin.from("provider_transactions").update({ status: "pending", provider_status: "unknown — check before retrying", response: { error: raw, ambiguous: true } }).eq("request_id", rid);
    await admin.from("orders").update({ status: "needs_information", admin_note: "Your order is being processed. We are confirming the result." }).eq("id", order.id);
    return { status: "pending", message: customerSafeError(raw) };
  }
}
