import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/authActions";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return NextResponse.json({ muted: false, isAdmin: false });
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { customFieldLabels: true }
    });

    const cf = (org?.customFieldLabels as any) || {};
    const isAdmin = user.role === "ADMIN" || user.role === "ROOT";

    return NextResponse.json({
      muted: Boolean(cf.globalSoundMuted),
      mutedBy: cf.soundMutedBy || null,
      mutedAt: cf.soundMutedAt || null,
      isAdmin
    });
  } catch (e) {
    return NextResponse.json({ muted: false, isAdmin: false });
  }
}

export const dynamic = "force-dynamic";
