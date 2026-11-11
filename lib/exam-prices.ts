// Exam PIN unit price = the higher of our own base price and WoodPay's current price,
// so a PIN can never be sold below what it costs us. (Our service fee is added on top at checkout.)
import { getWoodpayExamPrices } from "@/lib/woodpay";

export const EXAM_BASE_PRICES: Record<string, number> = { waec: 5800, neco: 2600, nabt: 1500 };
export const EXAM_NAMES: Record<string, string> = { waec: "WAEC", neco: "NECO", nabt: "NABTEB" };

export async function examUnitPrices(): Promise<Record<string, number>> {
  let live: Record<string, number> = {};
  try { live = await getWoodpayExamPrices(); } catch (e) { console.error("[exam] could not read live exam prices; using base prices", e instanceof Error ? e.message : e); }
  const out: Record<string, number> = {};
  for (const k of Object.keys(EXAM_BASE_PRICES)) out[k] = Math.max(EXAM_BASE_PRICES[k], live[k] || 0);
  return out;
}
