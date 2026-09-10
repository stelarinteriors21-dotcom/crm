
import { NextResponse } from "next/server";
import { notifyUser } from "@/app/actions/leadActions";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "No email" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.fcmToken) return NextResponse.json({ error: "No user or fcmToken" });

  await notifyUser(user.id, "TEST ALERT", "Did you get this while closed?");
  return NextResponse.json({ success: true, message: "Push sent to " + email });
}

