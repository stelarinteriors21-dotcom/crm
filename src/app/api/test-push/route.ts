
import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/firebaseAdmin";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "No email" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.fcmToken) return NextResponse.json({ error: "No user or fcmToken" });

  try {
    const res = await sendPushNotification(user.fcmToken, "TEST ALERT", "Did you get this while closed?");
    return NextResponse.json({ success: res.success, message: "Push sent to " + email, res });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

