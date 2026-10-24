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

export async function handleConnectedCallAutomations(leadId: string, duration: number, userId?: string) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, status: true, customFields: true, escalationLevel: true }
    });
    if (!lead) return;

    const cf = (lead.customFields as any) || {};
    const currentStatus = lead.status || '';
    const currentStatusNorm = currentStatus.toLowerCase().trim();
    const isFollowUpStatus = currentStatusNorm === 'follow up';
    const hasFollowUpScheduled = !!cf.followUpDate || !!cf.isManualFollowUp || !!cf.isTaskFollowUp || !!cf.staleFollowUpReason || !!cf.isAutoFollowUp;

    // Statuses eligible to be automatically transitioned to "Contacted" upon an attended/connected call
    const isConvertibleStatus = 
      currentStatusNorm === 'fresh' || 
      currentStatusNorm === 'new' || 
      currentStatusNorm === 'rnr' || 
      isFollowUpStatus;

    // Clear follow-up & stale tracking data since a successful connected call occurred
    if (isFollowUpStatus || hasFollowUpScheduled) {
      delete cf.followUpDate;
      delete cf.isManualFollowUp;
      delete cf.isTaskFollowUp;
      delete cf.staleConvertingAlert;
      delete cf.isAutoFollowUp;
      delete cf.staleFollowUpReason;
      delete cf.stalePreviousStatus;
      delete cf.staleConvertingTriggeredAt;
      cf.lastFollowUpCompletedAt = new Date().toISOString();
    }

    if (cf.inactivity48hAlert) {
      delete cf.inactivity48hAlert;
      delete cf.inactivity48hTriggeredAt;
      delete cf.last48hInactivityEmailedAt;
    }

    // Update status to Contacted if it was Fresh, NEW, RNR, or follow up
    if (isConvertibleStatus) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: 'Contacted',
          customFields: {
            ...cf,
            statusChangedAt: new Date().toISOString()
          },
          ...(lead.escalationLevel === 2 ? { escalationLevel: 0 } : {})
        }
      });
    } else {
      // If the lead was already in a deeper stage (like Interested, Site visit scheduled, etc.),
      // keep its status but clean customFields and reset escalation
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          customFields: cf,
          ...(lead.escalationLevel === 2 ? { escalationLevel: 0 } : {})
        }
      });
    }

    // Complete any pending follow-up / callback tasks for this lead
    await prisma.task.updateMany({
      where: {
        leadId,
        isCompleted: false,
        OR: [
          { title: { contains: 'Follow up', mode: 'insensitive' } },
          { title: { contains: 'Follow-up', mode: 'insensitive' } },
          { title: { contains: 'Call back', mode: 'insensitive' } },
          { title: { contains: 'Call scheduled', mode: 'insensitive' } }
        ]
      },
      data: { isCompleted: true }
    });

    try {
      revalidatePath('/leads');
      revalidatePath(`/leads/${leadId}`);
      revalidatePath('/dashboard');
      revalidatePath('/calls');
    } catch (e) {}
  } catch (err) {
    console.error('Error running connected call automations:', err);
  }
}

export async function logManualCall(leadId: string, durationMin: number, notes: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };
  try {
    await prisma.callLog.create({
      data: { leadId, userId: user.id, duration: durationMin * 60, notes, recordingUrl: null }
    });

    if (durationMin > 0) {
      await handleConnectedCallAutomations(leadId, durationMin * 60, user.id);
    } else {
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
    }

    revalidatePath('/leads');
    revalidatePath('/dashboard');
    return { success: true };
  } catch(e: any) {
    return { error: e.message };
  }
}
