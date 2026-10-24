import { NextResponse } from "next/server";
import { getSiteVisitAlerts } from "@/app/actions/siteVisitAlertActions";

export async function GET() {
  try {
    const data = await getSiteVisitAlerts();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ todayVisits: [], passedVisits: [], error: e.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
