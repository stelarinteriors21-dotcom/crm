import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/authActions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notes: newNotes } = await req.json();

  const existing = await prisma.callLog.findUnique({
    where: { id: params.id },
    select: { notes: true, duration: true, recordingUrl: true }
  });

  const rawNew = (newNotes || "").trim();
  const existingNotes = existing?.notes || "";
  const isConnected = (existing?.duration || 0) > 0 || !!existing?.recordingUrl;

  // Extract all existing system tags
  const matches = existingNotes.match(/\[[^\]]+\]/g) || [];
  const systemTags: string[] = [];
  for (const m of matches) {
    // If call is connected, discard any contradictory fake dial / quick drop / 0s dialer tags
    if (isConnected && (m.includes("FAKE DIAL") || m.includes("Quick Drop") || m.includes("0s"))) {
      continue;
    }
    if (
      m.includes("CONNECTED") ||
      m.includes("FAKE DIAL") ||
      m.includes("Quick Drop") ||
      m.includes("SHORT RING") ||
      m.includes("RINGOUT") ||
      m.includes("PARTIAL RING") ||
      m.includes("UNANSWERED") ||
      m.includes("Verified Device Log")
    ) {
      if (!systemTags.includes(m)) {
        systemTags.push(m);
      }
    }
  }

  // Prepend preserved system tags so backend audit trail stays intact
  let finalNotes = rawNew;
  if (systemTags.length > 0) {
    const tagsPrefix = systemTags.join(" ");
    finalNotes = rawNew ? `${tagsPrefix} ${rawNew}` : tagsPrefix;
  }

  const updated = await prisma.callLog.update({
    where: { id: params.id },
    data: { notes: finalNotes },
  });

  return NextResponse.json({ success: true, notes: updated.notes });
}
