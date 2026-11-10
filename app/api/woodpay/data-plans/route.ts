import { NextResponse } from "next/server";
import { getWoodpayDataPlans } from "@/lib/woodpay";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/service-errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const network = new URL(request.url).searchParams.get("network") || "mtn";
    const plans = await getWoodpayDataPlans(network);
    return NextResponse.json({ plans }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("WoodPay data-plan catalogue failed:", error);
    return NextResponse.json({ error: SERVICE_UNAVAILABLE_MESSAGE, plans: [], detail: String(error instanceof Error ? error.message : error).slice(0, 160) }, { status: 503 });
  }
}
