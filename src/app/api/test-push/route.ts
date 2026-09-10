
import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "No email" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.fcmToken) return NextResponse.json({ error: "No user or fcmToken" });

  try {
    const message = {
      notification: { title: "TEST ALERT", body: "Did you get this while closed?" },
      token: user.fcmToken,
      android: {
        priority: "high" as const,
        notification: {
          channelId: "default",
          sound: "default",
          defaultSound: true,
          defaultVibrateTimings: true,
          defaultLightSettings: true,
        }
      }
    };
    const res = await admin.messaging().send(message);
    return NextResponse.json({ success: true, message: "Push sent to " + email, res });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

