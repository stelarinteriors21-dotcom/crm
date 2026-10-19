import prisma from "@/lib/prisma";

export interface McpToolResponse {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

/**
 * Reads all lead context: notes, call logs, recording transcripts, site visit records, budget.
 */
export async function getLeadContextTool(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      calls: { orderBy: { createdAt: "desc" }, take: 10 },
      notes: { orderBy: { createdAt: "desc" }, take: 10 },
      tasks: { orderBy: { dueDate: "asc" } },
      whatsAppLogs: { orderBy: { createdAt: "desc" }, take: 5 },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  if (!lead) {
    throw new Error(`Lead with ID "${leadId}" not found`);
  }

  const cf = (lead.customFields as any) || {};
  const siteVisit = cf.siteVisit || null;
  const siteVisitHistory = cf.siteVisitHistory || [];

  return {
    leadId: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    city: lead.city,
    status: lead.status,
    budget: lead.budget,
    assignedTo: lead.assignedTo?.name || "Unassigned",
    assignedToId: lead.assignedTo?.id || null,
    leadScore: {
      location: lead.scoreLocation,
      budget: lead.scoreBudget,
      timeline: lead.scoreTimeline,
      siteVisit: lead.scoreSiteVisit,
      quotation: lead.scoreQuotation,
    },
    siteVisitCurrent: siteVisit,
    siteVisitHistory,
    calls: lead.calls.map((c) => ({
      id: c.id,
      duration: c.duration,
      notes: c.notes,
      recordingUrl: c.recordingUrl,
      createdAt: c.createdAt,
    })),
    generalNotes: lead.notes.map((n) => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt,
    })),
    whatsAppHistory: lead.whatsAppLogs.map((w) => ({
      id: w.id,
      message: w.message,
      direction: w.direction,
      createdAt: w.createdAt,
    })),
  };
}

/**
 * Autonomous AI WhatsApp Pitch Synthesizer
 * Reads all call notes, recording summaries, site visit status and budget to generate a custom WhatsApp message and link.
 */
export async function generateMorningWhatsAppPitchTool(params: {
  leadId: string;
  tone?: "consultative" | "urgent" | "site_visit" | "catalog";
  customInstructions?: string;
}) {
  const leadData = await getLeadContextTool(params.leadId);
  const firstName = leadData.name.split(" ")[0] || "there";
  const cleanPhone = (leadData.phone || "").replace(/[^0-9]/g, "");

  // Compile full transcript and note history
  const allNotesList: string[] = [];
  leadData.calls.forEach((c) => {
    if (c.notes) allNotesList.push(`[Call Note]: ${c.notes}`);
  });
  leadData.generalNotes.forEach((n) => {
    if (n.content) allNotesList.push(`[General Note]: ${n.content}`);
  });

  const aggregateNotes = allNotesList.join(" | ");
  const siteVisit = leadData.siteVisitCurrent;
  const tone = params.tone || "consultative";

  let pitch = "";

  // 1. If Site Visit scheduled
  if (siteVisit?.type === "Scheduled" || siteVisit?.type === "Rescheduled") {
    pitch = `Good morning ${firstName}! 🌟 Just a gentle reminder regarding our scheduled site visit for your interior design on ${siteVisit.date || "this week"}${siteVisit.time ? ` at ${siteVisit.time}` : ""}. Our design expert is prepared with spatial concepts. Please let us know if you need any adjustments to the timing! — Stelar Interiors`;
  }
  // 2. If Site visit completed
  else if (siteVisit?.type === "Done") {
    pitch = `Good morning ${firstName}! 📐 Following up on our recent site visit at your property. Our architecture & 3D visualization team has finalized the initial space planning and cost estimation. Would you be free for a 5-minute call today to review the layout? — Stelar Interiors`;
  }
  // 3. Based on specific notes (e.g., 3BHK, modular kitchen, materials, quotation)
  else if (aggregateNotes.toLowerCase().includes("3bhk") || aggregateNotes.toLowerCase().includes("villa") || aggregateNotes.toLowerCase().includes("flat")) {
    pitch = `Good morning ${firstName}! 🛋️ Following up on our discussion regarding your home interior design plan. We've curated 3 premium 3D concept designs tailored to your layout and budget (${leadData.budget || "custom"}). May I share the PDF lookbook here on WhatsApp? — Stelar Interiors`;
  } else if (aggregateNotes.toLowerCase().includes("kitchen") || aggregateNotes.toLowerCase().includes("wardrobe")) {
    pitch = `Good morning ${firstName}! ✨ We're following up on your modular woodwork enquiry. We have exclusive German-finish acrylic & PU shutter designs ready to view with factory warranty. Would you like a quick quote breakdown today? — Stelar Interiors`;
  } else if (aggregateNotes.toLowerCase().includes("quote") || aggregateNotes.toLowerCase().includes("budget") || aggregateNotes.toLowerCase().includes("price")) {
    pitch = `Good morning ${firstName}! 📋 Hope you're having a productive week. We have refined your interior project estimate with transparent material specifications to fit your target budget. Could we connect briefly today? — Stelar Interiors`;
  } else if (tone === "urgent") {
    pitch = `Good morning ${firstName}! ⚡ We have an ongoing seasonal benefit for projects booked this month, including complimentary 3D walkthrough rendering and factory-direct pricing. Would you like to reserve your slot before this weekend? — Stelar Interiors`;
  } else if (tone === "catalog") {
    pitch = `Good morning ${firstName}! 🏡 Sharing our latest luxury residential interior portfolio featuring contemporary living spaces and modular woodwork: https://stelarinteriors.com/portfolio. Let us know which style resonates best with your vision! — Stelar Interiors`;
  } else {
    // Standard Warm Consultative
    pitch = `Good morning ${firstName}! 🌿 Wishing you a great day ahead from Stelar Interiors. Following up on your interior design enquiry. Have you had a chance to decide on your project start timeline? We'd be glad to assist you with floor plan planning and complimentary consultation!`;
  }

  // Pre-encoded deep link
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(pitch)}` : null;

  return {
    leadId: leadData.leadId,
    clientName: leadData.name,
    clientPhone: cleanPhone,
    status: leadData.status,
    notesSummary: aggregateNotes || "No previous notes",
    generatedPitch: pitch,
    whatsappUrl,
  };
}

/**
 * Records WhatsApp dispatch log autonomously
 */
export async function recordWhatsAppDispatchTool(params: {
  leadId: string;
  message: string;
  userId?: string;
}) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.leadId },
    select: { id: true, name: true, phone: true, organizationId: true, assignedToId: true },
  });

  if (!lead) throw new Error("Lead not found");

  const actorId = params.userId || lead.assignedToId;

  // Insert into WhatsAppLog
  const log = await prisma.whatsAppLog.create({
    data: {
      leadId: lead.id,
      organizationId: lead.organizationId,
      message: params.message,
      direction: "OUTBOUND",
    },
  });

  // Record Activity Log
  if (actorId) {
    await prisma.activityLog.create({
      data: {
        userId: actorId,
        leadId: lead.id,
        action: "WHATSAPP_DISPATCH",
        details: `Sent AI morning touchpoint to ${lead.name} (${lead.phone}): "${params.message.slice(0, 80)}..."`,
      },
    });
  }

  return {
    success: true,
    logId: log.id,
    timestamp: log.createdAt,
    message: "Dispatch logged successfully",
  };
}

/**
 * List leads needing morning touchpoint today
 */
export async function listPendingMorningTouchpointsTool(organizationId: string, assignedToId?: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const whereClause: any = {
    organizationId,
    status: { notIn: ["JUNK", "LOST", "NOT_INTERESTED"] },
  };

  if (assignedToId) {
    whereClause.assignedToId = assignedToId;
  }

  const leads = await prisma.lead.findMany({
    where: whereClause,
    include: {
      whatsAppLogs: {
        where: {
          direction: "OUTBOUND",
          createdAt: { gte: todayStart },
        },
      },
      calls: { orderBy: { createdAt: "desc" }, take: 2 },
      notes: { orderBy: { createdAt: "desc" }, take: 2 },
    },
    take: 100,
  });

  const pendingLeads = leads
    .filter((l) => l.whatsAppLogs.length === 0)
    .map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      status: l.status,
      lastCallNote: l.calls.find((c) => c.notes)?.notes || null,
      lastGeneralNote: l.notes[0]?.content || null,
    }));

  return {
    totalPending: pendingLeads.length,
    leads: pendingLeads,
  };
}
