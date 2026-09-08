import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/authActions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notes } = await req.json();

  await prisma.callLog.update({
    where: { id: params.id },
    data: { notes },
  });

  return NextResponse.json({ success: true });
}
