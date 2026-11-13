import { NextResponse } from "next/server";
import { getWoodpayCablePlans, getWoodpayDiscos, getWoodpayIspPlans } from "@/lib/woodpay";
import { examUnitPrices, EXAM_NAMES } from "@/lib/exam-prices";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/service-errors";

export const dynamic = "force-dynamic";
const clean = (v: unknown) => String(v ?? "").trim();
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kind = clean(url.searchParams.get("kind")).toLowerCase();
    const provider = clean(url.searchParams.get("provider")).toLowerCase();
    if (kind === "cable") {
      if (!["dstv", "gotv", "startimes"].includes(provider)) return NextResponse.json({ error: "Choose a valid TV provider." }, { status: 400 });
      return NextResponse.json({ plans: await getWoodpayCablePlans(provider) }, { headers: NO_STORE });
    }
    if (kind === "isp") {
      if (!["smile", "spectranet"].includes(provider)) return NextResponse.json({ error: "Choose a valid internet provider." }, { status: 400 });
      return NextResponse.json({ plans: await getWoodpayIspPlans(provider) }, { headers: NO_STORE });
    }
    if (kind === "electricity") {
      const providers = (await getWoodpayDiscos()).map(name => ({ id: name, name }));
      return NextResponse.json({ providers }, { headers: NO_STORE });
    }
    // Exam PINs and recharge-card PINs: fixed list, delivered manually by staff (not on the WoodPay API).
    if (kind === "education") return NextResponse.json({ providers: Object.keys(EXAM_NAMES).map(id => ({ id, name: EXAM_NAMES[id] })), prices: await examUnitPrices() }, { headers: NO_STORE });
    if (kind === "epin") return NextResponse.json({ denominations: [100, 200, 500, 1000, 2000, 5000, 10000, 20000].map(v => ({ value: v, label: "₦" + v.toLocaleString() + " recharge PIN" })) }, { headers: NO_STORE });
    return NextResponse.json({ error: "Unknown catalogue type." }, { status: 400 });
  } catch (error) {
    console.error("WoodPay catalogue request failed:", error);
    return NextResponse.json({ error: SERVICE_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
}
