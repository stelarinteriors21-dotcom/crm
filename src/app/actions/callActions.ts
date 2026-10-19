"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";

export async function updateCallNote(callId: string, notes: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    await prisma.callLog.update({
      where: { id: callId },
      data: { notes }
    });
    revalidatePath("/calls");
    revalidatePath("/leads");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update call note:", error);
    return { success: false, error: error.message };
  }
}

export async function logManualCall(leadId: string, durationMin: number, notes: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };
  try {
    await prisma.callLog.create({
      data: { leadId, userId: user.id, duration: durationMin * 60, notes, recordingUrl: null }
    });

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { customFields: true, escalationLevel: true }
    });
    if (lead) {
      const cf = (lead.customFields as any) || {};
      if (cf.inactivity48hAlert) {
        delete cf.inactivity48hAlert;
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            customFields: cf,
            ...(lead.escalationLevel === 2 ? { escalationLevel: 0 } : {})
          }
        });
      }
    }

    revalidatePath('/leads');
    revalidatePath('/dashboard');
    return { success: true };
  } catch(e: any) {
    return { error: e.message };
  }
}
