"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "./activityActions";
import { getCurrentUser } from "./authActions";
import { checkAndProcessStaleConvertingLeads } from "./alertActions";

export async function scheduleFollowUpDate(leadId: string, dateIsoString: string, note?: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");

  const customFields = (lead.customFields as any) || {};
  customFields.followUpDate = dateIsoString;
  const isTaskLead = !!(customFields.staleFollowUpReason || customFields.staleConvertingTriggeredAt || customFields.isTaskFollowUp);
  customFields.isTaskFollowUp = isTaskLead;
  customFields.isManualFollowUp = !isTaskLead;
  customFields.manualFollowUpAt = new Date().toISOString();
  if (note) customFields.lastFollowUpNote = note.trim();
  customFields.statusChangedAt = new Date().toISOString();
  delete customFields.staleConvertingAlert;
  delete customFields.inactivity48hAlert;
  delete customFields.inactivity48hTriggeredAt;
  delete customFields.last48hInactivityEmailedAt;

  // Complete existing pending tasks
  await prisma.task.updateMany({
    where: { leadId, isCompleted: false },
    data: { isCompleted: true }
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { 
      status: "follow up",
      customFields 
    }
  });

  await logActivity("FOLLOW_UP_SCHEDULED", `Scheduled follow-up for ${new Date(dateIsoString).toLocaleString()}`);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
}

export async function getDueFollowUps() {
  const user = await getCurrentUser();
  if (!user) return { manualLeads: [], taskLeads: [], totalCount: 0 };

  // Automatically check and process any stale converting leads
  await checkAndProcessStaleConvertingLeads(user.organizationId);

  // STRICT POLICY: System Admins (ADMIN, ROOT) and non-caller staff must NEVER receive call alerts or call prompts!
  // Only callers (role === 'TELECALLER') receive call alerts.
  if (user.role !== "TELECALLER") {
    return { manualLeads: [], taskLeads: [], totalCount: 0 };
  }

  // Get active leads for this caller that are in follow up
  const activeLeads = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      assignedToId: user.id,
      status: "follow up"
    },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      customFields: true,
      tasks: {
        where: { isCompleted: false },
        orderBy: { dueDate: "asc" },
        take: 1
      }
    }
  });

  const now = new Date().getTime();
  const manualLeads: any[] = [];
  const taskLeads: any[] = [];

  for (const lead of activeLeads) {
    const cf = (lead.customFields as any) || {};
    if (cf && cf.followUpDate) {
      const followUpTime = new Date(cf.followUpDate).getTime();
      // Due if the scheduled time is in the past or now
      if (now >= followUpTime) {
        // Is this a manual follow-up or automated stale converting task?
        const isAutomated = !!(cf.staleFollowUpReason || cf.staleConvertingAlert || cf.staleConvertingTriggeredAt || cf.isTaskFollowUp);
        const isManual = !isAutomated && (cf.isManualFollowUp === true || !!cf.lastFollowUpNote);

        const leadItem = {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          status: lead.status,
          customFields: cf,
          followUpDate: cf.followUpDate,
          note: cf.lastFollowUpNote || (lead.tasks && lead.tasks[0]?.title ? lead.tasks[0].title : null),
          isManual
        };

        if (isManual) {
          manualLeads.push(leadItem);
        } else {
          taskLeads.push(leadItem);
        }
      }
    }
  }

  return {
    manualLeads,
    taskLeads,
    totalCount: manualLeads.length + taskLeads.length
  };
}
