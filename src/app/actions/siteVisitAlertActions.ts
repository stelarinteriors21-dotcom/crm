"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/authActions";
import { revalidatePath } from "next/cache";

export interface SiteVisitAlertItem {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  city: string;
  status: string;
  assignedToName: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string;
  address: string;
  gmapLink?: string;
  notes?: string;
  isPassed: boolean;
  isToday: boolean;
  daysPassed: number;
}

export async function getSiteVisitAlerts(): Promise<{
  todayVisits: SiteVisitAlertItem[];
  passedVisits: SiteVisitAlertItem[];
}> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { todayVisits: [], passedVisits: [] };
  }

  const isAdmin = user.role === "ADMIN" || user.role === "ROOT";

  // 1. Query leads that are in site visit scheduling stages
  const where: any = {
    organizationId: user.organizationId,
    status: {
      in: [
        "Site visit Schedules",
        "Site visit Recheduled",
        "Site visit Scheduled",
        "Site Visit Scheduled",
        "Site Visit Rescheduled",
      ]
    }
  };

  // If caller, only check their own leads
  if (!isAdmin && user.role !== "SITE_VISITOR") {
    where.assignedToId = user.id;
  }

  const leads = await prisma.lead.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      city: true,
      status: true,
      assignedTo: { select: { id: true, name: true } },
      customFields: true,
      tasks: {
        where: {
          isCompleted: false,
          OR: [
            { title: { contains: "visit", mode: "insensitive" } },
            { title: { contains: "site", mode: "insensitive" } }
          ]
        },
        orderBy: { dueDate: "asc" },
        take: 1
      }
    }
  });

  // Calculate local today string YYYY-MM-DD
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayStartTime = new Date(`${todayStr}T00:00:00.000`).getTime();

  const todayVisits: SiteVisitAlertItem[] = [];
  const passedVisits: SiteVisitAlertItem[] = [];

  for (const lead of leads) {
    const cf = (lead.customFields as any) || {};
    const sv = cf.siteVisit || {};

    // If already marked completed in customFields, skip
    if (sv.type === "Done" || (lead.status === "Site visit done" && sv.verifiedAt)) {
      continue;
    }

    // Determine the scheduled date
    let dateStr = sv.date || cf["Site Visit Date"] || cf.siteVisitDate || "";
    let timeStr = sv.time || "10:00 AM";

    // Fallback to incomplete task dueDate if date not on lead customFields
    if (!dateStr && lead.tasks && lead.tasks.length > 0) {
      const taskDate = new Date(lead.tasks[0].dueDate);
      if (!isNaN(taskDate.getTime())) {
        dateStr = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, "0")}-${String(taskDate.getDate()).padStart(2, "0")}`;
        timeStr = taskDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      }
    }

    if (!dateStr || typeof dateStr !== "string") {
      continue;
    }

    // Clean YYYY-MM-DD string
    const match = dateStr.match(/^\d{4}-\d{2}-\d{2}/);
    const normalizedDate = match ? match[0] : dateStr.split("T")[0];
    const svEndTime = new Date(`${normalizedDate}T23:59:59.999`).getTime();

    if (isNaN(svEndTime)) continue;

    const diffDays = Math.floor((todayStartTime - svEndTime) / (24 * 60 * 60 * 1000));

    const item: SiteVisitAlertItem = {
      id: lead.id,
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone || "",
      city: lead.city || "",
      status: lead.status,
      assignedToName: lead.assignedTo?.name || "Unassigned",
      scheduledDate: normalizedDate,
      scheduledTime: timeStr,
      address: sv.address || cf.siteAddress || lead.city || "",
      gmapLink: sv.gmapLink || "",
      notes: sv.notes || "",
      isPassed: svEndTime < todayStartTime,
      isToday: normalizedDate === todayStr,
      daysPassed: Math.max(0, diffDays + 1)
    };

    if (item.isToday) {
      todayVisits.push(item);
    } else if (item.isPassed) {
      passedVisits.push(item);
    }
  }

  // Sort: most recent passed visits first, earliest today visits first
  passedVisits.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
  todayVisits.sort((a, b) => (a.scheduledTime || "").localeCompare(b.scheduledTime || ""));

  return { todayVisits, passedVisits };
}

export async function completeSiteVisitFromAlert(leadId: string, notes: string = "Completed successfully") {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) throw new Error("Unauthorized");

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");

  const cf = (lead.customFields as any) || {};
  const currentSv = cf.siteVisit || {};
  const history = cf.siteVisitHistory || [];

  const completedSvData = {
    ...currentSv,
    type: "Done",
    notes: notes || currentSv.notes || "Completed",
    completedAt: new Date().toISOString(),
    completedBy: user.name || user.email
  };

  history.unshift(completedSvData);

  const updatedCustomFields = {
    ...cf,
    siteVisit: completedSvData,
    siteVisitHistory: history,
    statusChangedAt: new Date().toISOString()
  };

  delete updatedCustomFields.staleConvertingAlert;
  delete updatedCustomFields.isAutoFollowUp;
  delete updatedCustomFields.staleFollowUpReason;
  delete updatedCustomFields.followUpDate;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "Site visit done",
      scoreSiteVisit: "Done",
      customFields: updatedCustomFields
    }
  });

  // Mark all pending tasks for this lead as completed
  await prisma.task.updateMany({
    where: { leadId, isCompleted: false },
    data: { isCompleted: true }
  });

  await prisma.note.create({
    data: {
      content: `[Site Visit Completed]: ${notes}`,
      leadId,
      userId: user.id
    }
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  revalidatePath("/site-visits");
  return { success: true };
}

export async function rescheduleSiteVisitFromAlert(
  leadId: string,
  newDate: string,
  newTime: string = "10:00",
  notes: string = ""
) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) throw new Error("Unauthorized");

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");

  const cf = (lead.customFields as any) || {};
  const currentSv = cf.siteVisit || {};
  const history = cf.siteVisitHistory || [];

  const rescheduledSvData = {
    ...currentSv,
    type: "Rescheduled",
    date: newDate,
    time: newTime,
    notes: notes || `Rescheduled to ${newDate} at ${newTime}`,
    rescheduledAt: new Date().toISOString(),
    rescheduledBy: user.name || user.email
  };

  history.unshift(rescheduledSvData);

  const updatedCustomFields = {
    ...cf,
    siteVisit: rescheduledSvData,
    siteVisitHistory: history,
    statusChangedAt: new Date().toISOString()
  };

  delete updatedCustomFields.staleConvertingAlert;
  delete updatedCustomFields.isAutoFollowUp;
  delete updatedCustomFields.staleFollowUpReason;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "Site visit Recheduled",
      scoreSiteVisit: "Rescheduled",
      customFields: updatedCustomFields
    }
  });

  // Update pending tasks or create new scheduled task
  const existingTask = await prisma.task.findFirst({
    where: { leadId, isCompleted: false }
  });

  const dueDateTime = new Date(`${newDate}T${newTime.includes(":") ? newTime : "10:00"}:00`);

  if (existingTask) {
    await prisma.task.update({
      where: { id: existingTask.id },
      data: {
        title: `Site Visit: ${lead.name} (Rescheduled)`,
        dueDate: isNaN(dueDateTime.getTime()) ? new Date() : dueDateTime
      }
    });
  } else {
    await prisma.task.create({
      data: {
        title: `Site Visit: ${lead.name} (Rescheduled)`,
        dueDate: isNaN(dueDateTime.getTime()) ? new Date() : dueDateTime,
        leadId,
        userId: lead.assignedToId || user.id,
        isCompleted: false
      }
    });
  }

  await prisma.note.create({
    data: {
      content: `[Site Visit Rescheduled] New scheduled date: ${newDate} ${newTime}. Notes: ${notes || "Rescheduled by caller"}`,
      leadId,
      userId: user.id
    }
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  revalidatePath("/site-visits");
  return { success: true };
}
