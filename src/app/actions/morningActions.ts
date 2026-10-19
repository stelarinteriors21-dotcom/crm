"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { logActivity } from "./activityActions";
import { revalidatePath } from "next/cache";

export async function getMorningDispatchData() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const isAdmin = user.role === "ADMIN" || user.role === "ROOT";

  // Active leads that are not won/lost/junk
  const whereClause: any = {
    organizationId: user.organizationId,
    status: { notIn: ["JUNK", "LOST", "NOT_INTERESTED"] }
  };

  if (!isAdmin) {
    whereClause.assignedToId = user.id;
  }

  const leads = await prisma.lead.findMany({
    where: whereClause,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      calls: { orderBy: { createdAt: "desc" }, take: 3 },
      notes: { orderBy: { createdAt: "desc" }, take: 3 },
      whatsAppLogs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const formattedLeads = leads.map((lead) => {
    // Check if WhatsApp sent today
    const sentTodayLog = lead.whatsAppLogs.find(
      (w) => w.direction === "OUTBOUND" && new Date(w.createdAt) >= todayStart
    );

    // Extract context from call notes, general notes, custom fields
    const latestCallNote = lead.calls.find((c) => c.notes)?.notes || "";
    const latestNote = lead.notes[0]?.content || "";
    const cf = (lead.customFields as any) || {};
    const siteVisit = cf.siteVisit || null;

    let contextSnippet = "";
    if (latestCallNote) {
      contextSnippet = `Call Note: "${latestCallNote}"`;
    } else if (latestNote) {
      contextSnippet = `Note: "${latestNote}"`;
    } else if (siteVisit?.type) {
      contextSnippet = `Site Visit: ${siteVisit.type} (${siteVisit.date || "Date TBD"})`;
    } else {
      contextSnippet = `Status: ${lead.status || "New Lead"} | Interested in interior design`;
    }

    // Generate intelligent morning message
    let defaultMessage = "";
    const firstName = lead.name.split(" ")[0] || "there";

    if (siteVisit?.type === "Scheduled" || siteVisit?.type === "Rescheduled") {
      defaultMessage = `Good morning ${firstName}! Just reminding you about our scheduled site visit for your interior design on ${siteVisit.date || "this week"}. Looking forward to meeting you! Let us know if you need to adjust the timing. — Stelar Interiors`;
    } else if (siteVisit?.type === "Done") {
      defaultMessage = `Good morning ${firstName}! Hope you're having a great week. Our design team has reviewed the site measurements from our visit and is drafting your custom design layout & estimate. Would today afternoon be a good time for a quick 5-minute call? — Stelar Interiors`;
    } else if (latestCallNote.toLowerCase().includes("3bhk") || latestCallNote.toLowerCase().includes("kitchen")) {
      defaultMessage = `Good morning ${firstName}! Following up on our discussion regarding your project. We've prepared some great portfolio concepts that match your vision. Would you like us to share the catalog on WhatsApp? — Stelar Interiors`;
    } else if (latestCallNote || lead.calls.length > 0) {
      defaultMessage = `Good morning ${firstName}! Following up from our recent call regarding your interior requirements. Would you have 5 minutes today for a quick update? — Stelar Interiors`;
    } else {
      defaultMessage = `Good morning ${firstName}! Wishing you a wonderful week ahead from Stelar Interiors. We're following up on your interior design enquiry. Have you had a chance to think about your preferred design style or layout? We'd love to assist you!`;
    }

    return {
      id: lead.id,
      name: lead.name,
      phone: lead.phone || "",
      status: lead.status || "NEW",
      assignedTo: lead.assignedTo?.name || "Unassigned",
      assignedToId: lead.assignedTo?.id || null,
      contextSnippet,
      suggestedMessage: defaultMessage,
      sentToday: !!sentTodayLog,
      sentAt: sentTodayLog ? new Date(sentTodayLog.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      lastMessage: sentTodayLog?.message || null,
    };
  });

  const total = formattedLeads.length;
  const sent = formattedLeads.filter((l) => l.sentToday).length;
  const pending = total - sent;
  const percent = total > 0 ? Math.round((sent / total) * 100) : 0;

  // Fetch recent dispatch audit logs
  const auditLogs = await prisma.activityLog.findMany({
    where: {
      action: "MORNING_WHATSAPP_DISPATCHED",
      createdAt: { gte: todayStart },
    },
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    leads: formattedLeads,
    stats: { total, sent, pending, percent },
    isAdmin,
    auditLogs: auditLogs.map((a) => ({
      id: a.id,
      userName: a.user?.name || "Employee",
      details: a.details || "Dispatched morning message",
      time: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })),
  };
}

export async function dispatchMorningMessage(leadId: string, message: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true, phone: true },
  });

  if (!lead) throw new Error("Lead not found");

  // Record in WhatsAppLog
  await prisma.whatsAppLog.create({
    data: {
      leadId,
      direction: "OUTBOUND",
      message,
      status: "SENT",
    },
  });

  // Record in ActivityLog for accountability auditing
  await logActivity(
    "MORNING_WHATSAPP_DISPATCHED",
    `${user.name || "Employee"} clicked & sent morning message to ${lead.name} (${lead.phone}): "${message.slice(0, 50)}..."`
  );

  revalidatePath("/dashboard");
  revalidatePath(`/leads/${leadId}`);

  return {
    success: true,
    sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export const logWhatsAppDispatchAction = dispatchMorningMessage;
