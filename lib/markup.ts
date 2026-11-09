// The owner's own markup, edited in Admin → Markup. Applied on top of the WoodPay price.
// Stored in public.markup_settings. If a row is missing, the old site rates are used so nothing changes by surprise.
export type MarkupRule = { mode: "percent" | "flat"; value: number };
export const MARKUP_CATEGORIES = ["airtime", "data", "cable", "electricity"] as const;
export type MarkupCategory = (typeof MARKUP_CATEGORIES)[number];
export const MARKUP_LABELS: Record<MarkupCategory, string> = { airtime: "Airtime", data: "Data", cable: "Cable TV", electricity: "Electricity" };
export const DEFAULT_MARKUP: Record<MarkupCategory, MarkupRule> = {
  airtime: { mode: "percent", value: 3 }, data: { mode: "percent", value: 5 },
  cable: { mode: "percent", value: 5 }, electricity: { mode: "percent", value: 5 },
};

export function feeFor(rule: MarkupRule, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return rule.mode === "flat" ? Math.max(0, Math.round(rule.value)) : Math.ceil((amount * Math.max(0, rule.value)) / 100);
}
export const ruleLabel = (rule: MarkupRule) => (rule.mode === "flat" ? "₦" + Math.round(rule.value).toLocaleString("en-NG") : rule.value + "%");

export async function getMarkupRules(admin: any): Promise<Record<MarkupCategory, MarkupRule>> {
  const rules = { ...DEFAULT_MARKUP };
  try {
    const { data } = await admin.from("markup_settings").select("category,mode,value");
    for (const row of data || []) {
      if ((MARKUP_CATEGORIES as readonly string[]).includes(row.category) && ["percent", "flat"].includes(row.mode) && Number.isFinite(Number(row.value)) && Number(row.value) >= 0) {
        rules[row.category as MarkupCategory] = { mode: row.mode, value: Number(row.value) };
      }
    }
  } catch { /* table missing → defaults */ }
  return rules;
}
