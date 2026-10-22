"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";
import { logActivity } from "./activityActions";

export async function getLeads(query?: string, searchField?: string, status?: string | string[], source?: string, assigned?: string, active?: boolean, startDate?: string, endDate?: string, tag?: string, city?: string | string[], stage?: string) {
  const user = await getCurrentUser();
  if (!user) return [];

  const where: any = {
    organizationId: user.organizationId,
  };

  if (tag && tag !== "All") {
    where.tag = tag;
  }

  if (user.role !== "ADMIN" && user.role !== "ROOT" && user.role !== "SITE_VISITOR") {
    where.assignedToId = user.id;
  } else if (assigned === "me") {
    where.assignedToId = user.id;
  } else if (assigned === "unassigned") {
    where.assignedToId = null;
  } else if (assigned && assigned !== "all") {
    where.assignedToId = assigned;
  }

  if (source) {
    where.source = source;
  }

  
  if (stage === 'converting') {
    where.status = { notIn: ['Won', 'Advance recieved', 'Junk', 'Lost', 'Job enquiry', 'just curious', 'Hold', 'Pay Pending'] };
    } else if (stage === 'converted') {
    where.status = { in: ['Won', 'Advance recieved', 'Pay Pending'] };
  } else if (stage === 'junk') {
    where.status = { in: ['Junk', 'Lost', 'Job enquiry', 'just curious', 'Hold'] };
  }

  if (active && !stage) {
    where.status = { notIn: ["Lost", "RNR", "Call Not Connected"] };
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      where.createdAt.gte = startOfDay;
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt.lte = endOfDay;
    }
  }

  if (query) {
    if (searchField === "phone") {
      where.OR = [
        { phone: { contains: query, mode: 'insensitive' } },
        { customFields: { path: ['alternatePhone'], string_contains: query } }
      ];
    } else if (searchField === "email") {
      where.email = { contains: query, mode: 'insensitive' };
    } else if (searchField === "name") {
      where.name = { contains: query, mode: 'insensitive' };
    } else {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { customFields: { path: ['alternatePhone'], string_contains: query } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }
  }

  if (status) {
    if (Array.isArray(status)) {
      where.status = { in: status };
    } else if (status.includes(",")) {
      where.status = { in: status.split(",") };
    } else {
      where.status = status;
    }
  } else if (!stage) {
    where.status = { notIn: ['Junk'] };
  }

  if (city) {
    if (Array.isArray(city)) {
      where.city = { in: city };
    } else if (city.includes(",")) {
      where.city = { in: city.split(",") };
    } else {
      where.city = city;
    }
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const leads = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          assignedTo: true,
          organization: true,
          notes: {
            orderBy: { createdAt: "desc" },
            take: 3
          }
        },
      });
      return leads;
    } catch (e) {
      console.warn(`getLeads error (attempt ${attempt + 1}/2):`, e);
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }
  return [];
}

export async function createLead(data: any) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    const isCaller = user.role === "TELECALLER";
    const isManual = data.source === "MANUAL" || !data.source;
    let assignedToId = data.assignedToId || null;
    let assignedStatus = "PENDING";
    let initialStatus = data.status || "Fresh";

    // Policy: Leads and calls must ONLY be assigned to callers (role === 'TELECALLER').
    // System Admins (ADMIN, ROOT) or non-caller staff must NEVER be assigned leads or calls.
    if (assignedToId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, role: true }
      });
      if (!targetUser || targetUser.role !== "TELECALLER") {
        assignedToId = null;
      }
    }

    if (isCaller) {
      // Caller manually added lead: assign directly to this caller
      assignedToId = user.id;
      assignedStatus = "ACCEPTED";
      initialStatus = data.status || "Fresh";
    } else if (!assignedToId) {
      // Admin / non-caller or automated ingress added lead:
      // Round-robin exclusively among callers (role === 'TELECALLER')
      const callers = await prisma.user.findMany({
        where: { 
          organizationId: user.organizationId, 
          role: "TELECALLER",
          leaves: {
            none: {
              startDate: { lte: new Date() },
              endDate: { gte: new Date() }
            }
          }
        },
        orderBy: { id: 'asc' }
      });
      
      if (callers.length > 0) {
        const lastLead = await prisma.lead.findFirst({
          where: { assignedToId: { in: callers.map(c => c.id) } },
          orderBy: { createdAt: 'desc' }
        });
        
        let nextIndex = 0;
        if (lastLead && lastLead.assignedToId) {
          const lastIndex = callers.findIndex(c => c.id === lastLead.assignedToId);
          if (lastIndex !== -1) {
            nextIndex = (lastIndex + 1) % callers.length;
          }
        }
        
        assignedToId = callers[nextIndex].id;
        assignedStatus = "PENDING";
      } else {
        // NEVER fallback to admin! If no callers exist, keep unassigned
        assignedToId = null;
        assignedStatus = "UNASSIGNED";
      }
    }

    // Auto-calculate initial score factors based on provided data
    let scoreLocation = "None";
    if (data.city) {
      const cityLower = data.city.toLowerCase();
      if (cityLower.includes("tvm") || cityLower.includes("thiruvananthapuram") || cityLower.includes("trivandrum")) scoreLocation = "TVM";
      else if (cityLower.includes("kollam") || cityLower.includes("kanyakumari") || cityLower.includes("pathanamthitta") || cityLower.includes("attingal") || cityLower.includes("varkala")) scoreLocation = "Near TVM";
      else if (["kochi", "ernakulam", "kerala", "thrissur", "calicut", "kozhikode", "alappuzha", "kannur", "kottayam", "palakkad", "malappuram"].some(c => cityLower.includes(c))) scoreLocation = "Kerala";
    }

    let scoreBudget = "Unknown";
    if (data.budget) {
      const bLower = data.budget.toLowerCase();
      if (bLower.includes("20l") || bLower.includes("30l") || bLower.includes("50l") || bLower.includes("100l") || bLower.includes("strong")) scoreBudget = "Strong";
      else if (bLower.includes("10l") || bLower.includes("15l") || bLower.includes("good")) scoreBudget = "Good";
      else if (bLower.includes("5l") || bLower.includes("6l") || bLower.includes("7l") || bLower.includes("8l") || bLower.includes("possible")) scoreBudget = "Possible";
      else if (bLower.includes("1l") || bLower.includes("2l") || bLower.includes("3l") || bLower.includes("4l") || bLower.includes("poor")) scoreBudget = "Poor";
    }

    const altPhone = data.alternatePhone?.trim() || (data.customFields?.alternatePhone?.trim()) || null;

    const lead = await prisma.lead.create({
      data: {
        name: data.name || "Unknown",
        phone: data.phone || "",
        email: data.email || null,
        city: data.city || null,
        source: data.source || "MANUAL",
        status: initialStatus,
        capturedOn: new Date(),
        budget: data.budget || null,
        organizationId: user.organizationId,
        assignedToId,
        assignedStatus,
        assignedAt: new Date(),
        scoreLocation,
        scoreBudget,
        customFields: {
          ...(data.customFields || {}),
          ...(altPhone ? { alternatePhone: altPhone } : {}),
          statusChangedAt: new Date().toISOString()
        }
      },
    });

    // Create system audit note for manual addition
    if (isCaller || isManual) {
      await prisma.note.create({
        data: {
          content: `[SYSTEM: Lead Added Manually by ${user.name}]\nLead manually added and assigned directly to ${user.name}. Status initialized to ${initialStatus}.`,
          leadId: lead.id,
          userId: user.id
        }
      });
    }

    // Only notify if assigned to someone else
    if (assignedToId && assignedToId !== user.id) {
      await notifyUser(assignedToId, 'New Lead Assigned! 🚨', 'You have a new lead to call.', true);
    }
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { success: true, lead };
  } catch (error: any) {
    console.error("Failed to create lead:", error);
    return { success: false, error: error.message };
  }
}

export async function updateLeadStatus(leadId: string, status: string | null) {
  try {

  if (status === 'Won' || status === 'Advance recieved') {
    const docs = await prisma.fileAttachment.count({ where: { leadId } });
    if (docs === 0) {
      throw new Error("Validation Error: You must add at least one document in the Documents tab before converting this lead.");
    }
  }

    const currentLead = await prisma.lead.findUnique({ where: { id: leadId }, select: { customFields: true } });
    const cf = (currentLead?.customFields as any) || {};

    if (["Won", "Advance recieved", "Pay Pending", "Junk", "Lost", "Job enquiry", "just curious", "Hold"].includes(status || "")) {
      cf.quotationFollowUpActive = false;
      cf.quotationAlertOpen = false;
      cf.revisionAlertActive = false;
      if (["Won", "Advance recieved", "Pay Pending"].includes(status || "")) {
        cf.quotationApproved = true;
      }
      delete cf.staleConvertingAlert;

      await prisma.task.updateMany({
        where: {
          leadId,
          isCompleted: false,
          OR: [
            { title: { contains: "Quotation" } },
            { title: { contains: "Revise" } }
          ]
        },
        data: { isCompleted: true }
      });
    }

    if (status === "Site visit done") {
      await prisma.task.updateMany({
        where: {
          leadId,
          isCompleted: false
        },
        data: { isCompleted: true }
      });
      delete cf.followUpDate;
      delete cf.isManualFollowUp;
      delete cf.staleConvertingAlert;
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { 
        status: status || "Contacted",
        customFields: {
          ...cf,
          statusChangedAt: new Date().toISOString()
        }
      },
    });
    
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    
    await logActivity("STATUS_UPDATED", `Updated status to ${status || 'None'} for ${updatedLead.name}`);
    
    return updatedLead;
  } catch (error) {
    console.error("Failed to update lead status:", error);
    throw error;
  }
}

export async function acceptLead(leadId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (user.role !== "TELECALLER") {
    throw new Error("Only callers can accept leads.");
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { status: true, customFields: true }
  });

  const cf = (lead?.customFields as any) || {};
  const restoreStatus = lead?.status === "PENDING" ? (cf.previousStatusBeforeReassign || "Fresh") : lead?.status;

  await prisma.lead.update({
    where: { id: leadId },
    data: { 
      assignedStatus: 'ACCEPTED', 
      assignedToId: user.id,
      status: restoreStatus || "Fresh"
    }
  });
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function rejectLead(leadId: string) {
  // STRICT POLICY: Leads are NEVER marked as unassigned or automatically reassigned.
  // When a caller passes or rejects, the lead remains assigned to them, and an escalation alert is dispatched to admins.
  const result = await escalateLead(leadId, true);
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  return result;
}

export async function acceptAllLeads(userId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TELECALLER") {
    throw new Error("Only callers can accept leads.");
  }

  await prisma.lead.updateMany({
    where: { assignedToId: user.id, assignedStatus: 'PENDING' },
    data: { assignedStatus: 'ACCEPTED' }
  });
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function rejectAllLeads(userId: string) {
  // STRICT POLICY: Leads are NEVER marked as unassigned or automatically reassigned.
  const pendingLeads = await prisma.lead.findMany({
    where: { assignedToId: userId, assignedStatus: 'PENDING' },
    select: { id: true }
  });
  for (const lead of pendingLeads) {
    await escalateLead(lead.id, true);
  }
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function getCurrentRnrSlot(): Promise<{ slotId: string; label: string } | null> {
  const now = new Date();
  const istDateString = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  const istTimeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(now);
  const hour = parseInt(istTimeParts.find(p => p.type === 'hour')?.value || '0', 10);

  // 2-hour calling slots between 8 AM and 10 PM IST
  if (hour >= 8 && hour < 10) {
    return { slotId: `${istDateString}_08`, label: "8:00 AM Slot" };
  } else if (hour >= 10 && hour < 12) {
    return { slotId: `${istDateString}_10`, label: "10:00 AM Slot" };
  } else if (hour >= 12 && hour < 14) {
    return { slotId: `${istDateString}_12`, label: "12:00 PM Slot" };
  } else if (hour >= 14 && hour < 16) {
    return { slotId: `${istDateString}_14`, label: "2:00 PM Slot" };
  } else if (hour >= 16 && hour < 18) {
    return { slotId: `${istDateString}_16`, label: "4:00 PM Slot" };
  } else if (hour >= 18 && hour < 20) {
    return { slotId: `${istDateString}_18`, label: "6:00 PM Slot" };
  } else if (hour >= 20 && hour < 22) {
    return { slotId: `${istDateString}_20`, label: "8:00 PM Slot" };
  }
  return null;
}

export async function dismissRnrAlert(leadId: string, slotId: string) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { customFields: true }
    });
    if (!lead) return { error: "Lead not found" };

    const cf = (lead.customFields as any) || {};
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        customFields: {
          ...cf,
          rnrLastSlot: slotId,
          rnrLastAttemptAt: new Date().toISOString(),
          rnrSnoozedUntil: null,
        }
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error("Failed to dismiss RNR alert:", err);
    return { error: err.message };
  }
}

export async function snoozeRnrLead(leadId: string, minutes: number = 15) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { customFields: true }
    });
    if (!lead) return { error: "Lead not found" };

    const cf = (lead.customFields as any) || {};
    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        customFields: {
          ...cf,
          rnrSnoozedUntil: snoozedUntil,
        }
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error("Failed to snooze RNR lead:", err);
    return { error: err.message };
  }
}

export async function getPendingLeadForUser(): Promise<any> {
  const user = await getCurrentUser();
  if (!user || user.role !== "TELECALLER") return null;
  
  // 1. Check if any snoozed lead is ready to wake up
  const snoozedLead = await prisma.lead.findFirst({
    where: {
      organizationId: user.organizationId,
      assignedStatus: 'SNOOZED',
      assignedToId: user.id,
      snoozedUntil: { lte: new Date() }
    },
    orderBy: { snoozedUntil: 'asc' }
  });

  if (snoozedLead) {
    const updated = await prisma.lead.update({
      where: { id: snoozedLead.id },
      data: { assignedStatus: 'PENDING', assignedAt: new Date(), snoozedUntil: null }
    });
    if (user.fcmToken) {
      await sendPushNotification(user.fcmToken, 'Snooze Over! ⏰', `Time to call ${updated.name}`);
    }
    return updated;
  }

  // 2. Otherwise get normal pending fresh lead
  const lead = await prisma.lead.findFirst({
    where: { 
      organizationId: user.organizationId,
      assignedStatus: 'PENDING',
      assignedToId: user.id
    },
    orderBy: { assignedAt: 'desc' }
  });
  
  if (lead) return lead;

  // 3. Scheduled RNR Redial Alerts (Every 2 hours)
  const currentSlot = await getCurrentRnrSlot();
  if (currentSlot) {
    const rnrLeads = await prisma.lead.findMany({
      where: {
        organizationId: user.organizationId,
        status: 'RNR',
        assignedToId: user.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const now = new Date();
    for (const rLead of rnrLeads) {
      const cf = (rLead.customFields as any) || {};

      // Check if snoozed
      if (cf.rnrSnoozedUntil) {
        const snoozeDate = new Date(cf.rnrSnoozedUntil);
        if (snoozeDate > now) {
          continue; // still snoozed
        }
      }

      // Check if already handled in this 2-hour time slot
      if (cf.rnrLastSlot === currentSlot.slotId) {
        continue;
      }

      // Check if at least 2 hours have elapsed since the last attempt
      if (cf.rnrLastAttemptAt) {
        const lastAttemptTime = new Date(cf.rnrLastAttemptAt).getTime();
        const twoHoursMs = 2 * 60 * 60 * 1000;
        if (now.getTime() - lastAttemptTime < twoHoursMs) {
          continue; // less than 2 hours since last attempt
        }
      }

      // Eligible RNR lead found for this slot!
      return {
        ...rLead,
        isRnrAlert: true,
        rnrSlotId: currentSlot.slotId,
        rnrSlotLabel: currentSlot.label,
      };
    }
  }

  return null;
}

export async function escalateLead(leadId: string, isManualPass: boolean = true) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { assignedTo: true, organization: true }
  });
  if (!lead) return { error: "Not found" };

  const escalationLevel = (lead.escalationLevel || 0) + 1;

  // STRICT POLICY: Leads are NEVER marked as unassigned and NEVER automatically reassigned!
  // The lead remains assigned to its current assignee. Reassignment can ONLY be done manually by the Admin.
  // Escalations ONLY increment escalationLevel and dispatch escalation alert emails to admins.
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      assignedStatus: "ACCEPTED", // Ensure caller's pending popup is dismissed while keeping lead in their queue
      escalationLevel: escalationLevel,
    }
  });

  // Dispatch escalation email to admins via nodemailer
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER || 'shaji2222222@gmail.com',
        pass: process.env.SMTP_PASS || 'umlt zsnv cxsr kfjy'
      }
    });

    const org = lead.organization || (await prisma.organization.findUnique({ where: { id: lead.organizationId } }));
    const adminEmails = org?.escalationEmails || 'stelarinteriors21@gmail.com,shaji2222222@gmail.com';
    const assigneeName = lead.assignedTo?.name || 'Unknown Caller';
    const reasonTitle = isManualPass 
      ? `Lead Passed (Manual Alert) by ${assigneeName}` 
      : `Escalation Level ${escalationLevel}: Response Overdue`;

    const mailOptions = {
      from: `"Stelar CRM Alerts" <${process.env.SMTP_USER || 'shaji2222222@gmail.com'}>`,
      to: adminEmails,
      subject: `🚨 LEAD ESCALATION: ${reasonTitle} - ${lead.name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 24px 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em;">🚨 LEAD ESCALATION ALERT</h2>
            <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95; font-weight: 500;">${reasonTitle}</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-top: 0;">
              ${isManualPass ? `Caller <b>${assigneeName}</b> has passed this lead.` : `This lead has reached escalation level <b>${escalationLevel}</b>.`}
            </p>
            <div style="background-color: #f9fafb; border-radius: 10px; padding: 18px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <h3 style="margin-top: 0; margin-bottom: 14px; font-size: 15px; color: #111827; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Lead Summary</h3>
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;"><b>Lead Name:</b></td><td style="padding: 6px 0; color: #111827; font-weight: 700;">${lead.name}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;"><b>Phone Number:</b></td><td style="padding: 6px 0; color: #111827;"><a href="tel:${lead.phone}" style="color: #2563eb; text-decoration: none; font-weight: 700;">${lead.phone}</a></td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;"><b>City:</b></td><td style="padding: 6px 0; color: #111827;">${lead.city || 'N/A'}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;"><b>Source:</b></td><td style="padding: 6px 0; color: #111827;">${lead.source}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;"><b>Status:</b></td><td style="padding: 6px 0; color: #111827;">${lead.status}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;"><b>Assigned Caller:</b></td><td style="padding: 6px 0; color: #111827; font-weight: 700;">${assigneeName}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;"><b>Assignment Status:</b></td><td style="padding: 6px 0; color: #dc2626; font-weight: 700;">Remains assigned to ${assigneeName} (Awaiting Admin review)</td></tr>
              </table>
            </div>
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
                <b>Policy Notice:</b> Leads are never automatically unassigned or reassigned. Reassignment can only be performed manually by an administrator via the CRM dashboard.
              </p>
            </div>
          </div>
          <div style="background-color: #f9fafb; padding: 14px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
            Stelar CRM Compliance System • Automated Escalation
          </div>
        </div>
      `
    };
    
    transporter.sendMail(mailOptions).catch(console.error);
  } catch (e) {
    console.error("Failed to send escalation email via nodemailer:", e);
  }

  revalidatePath('/leads');
  revalidatePath('/calls');
  return { success: true };
}

export async function getCallers() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) return [];
  
  return await prisma.user.findMany({
    where: { 
      organizationId: user.organizationId, 
      role: "TELECALLER",
      leaves: {
        none: {
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      }
    },
    select: { id: true, name: true }
  });
}

export async function assignLeadToUser(leadId: string, assigneeId: string) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) return { error: "Unauthorized" };

  const targetCaller = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { id: true, role: true }
  });

  if (!targetCaller || targetCaller.role !== "TELECALLER") {
    return { error: "Leads and calls can only be assigned to callers." };
  }

  const existingLead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { assignedToId: true, status: true, customFields: true }
  });

  const prevAssignee = existingLead?.assignedToId;
  const cf = (existingLead?.customFields as any) || {};

  await prisma.lead.update({
    where: { id: leadId },
    data: { 
      assignedToId: assigneeId,
      assignedStatus: "PENDING",
      assignedAt: new Date(),
      status: existingLead?.status || "PENDING",
      escalationLevel: 0,
      previousAssigneeId: prevAssignee || assigneeId,
      customFields: {
        ...cf,
        isReassigned: true,
        reassignedAt: new Date().toISOString(),
        previousAssigneeId: prevAssignee || null,
        previousStatusBeforeReassign: existingLead?.status || "NEW"
      }
    }
  });
  
  // Dispatch push notification to the assigned caller
  if (assigneeId) {
    try {
      await notifyUser(assigneeId, '🚨 NEW LEAD ASSIGNED!', 'A lead was assigned to you and requires attention.', false);
    } catch (e) {
      console.warn("Could not dispatch push notification for assigned lead:", e);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/leads");
  return { success: true };
}

export async function updateLeadTag(leadId: string, tag: string | null) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.lead.update({
    where: { id: leadId },
    data: { tag }
  });

  revalidatePath('/leads');
}

export async function acceptAndScheduleCall(leadId: string, minutes: number = 15) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (user.role !== "TELECALLER") {
    throw new Error("Only callers can accept and schedule calls.");
  }

  const snoozedUntil = new Date(Date.now() + minutes * 60000);

  await prisma.lead.update({
    where: { id: leadId },
    data: { 
      assignedStatus: 'SNOOZED', 
      assignedToId: user.id,
      snoozedUntil: snoozedUntil
    }
  });

  // Complete any older pending tasks for this lead
  await prisma.task.updateMany({
    where: {
      leadId: leadId,
      isCompleted: false
    },
    data: { isCompleted: true }
  });

  await prisma.task.create({
    data: {
      title: `Call scheduled in ${minutes} mins`,
      dueDate: snoozedUntil,
      leadId: leadId,
      userId: user.id,
      isCompleted: false
    }
  });

  revalidatePath('/leads');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function logWhatsAppMessage(leadId: string, message: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.whatsAppLog.create({
    data: {
      leadId,
      direction: "OUTBOUND",
      message,
      status: "SENT"
    }
  });

  revalidatePath('/leads/' + leadId);
  return { success: true };
}

import { sendPushNotification } from "@/lib/firebaseAdmin";


export async function notifyUser(userId: string, title: string, body: string, waitForCompletion: boolean = false) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.fcmToken) return;

  const token = user.fcmToken;
  const REPEAT_COUNT = 5;       // number of notifications
  const INTERVAL_MS = 2000;     // 2 seconds between each

  const sendLoop = async () => {
    for (let i = 0; i < REPEAT_COUNT; i++) {
      await sendPushNotification(token, title, body);
      if (i < REPEAT_COUNT - 1) {
        await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
      }
    }
  };

  if (waitForCompletion) {
    await sendLoop();
  } else {
    // Fire-and-forget so this doesn't block the server action
    sendLoop();
  }
}

export async function deleteTask(taskId: string, leadId: string) { await prisma.task.delete({ where: { id: taskId } }); revalidatePath('/leads/' + leadId); }

export async function markTaskCompleted(taskId: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { isCompleted: true }
  });
  revalidatePath('/leads');
  revalidatePath('/dashboard');
}

export async function completeSiteVisit(taskId: string, leadId: string, noteContent: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  
  await prisma.note.create({
    data: {
      content: "[Site Visit Completed]: " + noteContent,
      leadId,
      userId: user.id
    }
  });
  
  // Mark all pending tasks for this lead as completed
  await prisma.task.updateMany({
    where: { leadId, isCompleted: false },
    data: { isCompleted: true }
  });

  const currentLead = await prisma.lead.findUnique({ where: { id: leadId }, select: { customFields: true } });
  const cf = (currentLead?.customFields as any) || {};
  delete cf.followUpDate;
  delete cf.isManualFollowUp;
  delete cf.staleConvertingAlert;

  await prisma.lead.update({
    where: { id: leadId },
    data: { 
      status: 'Site visit done', 
      scoreSiteVisit: 'Done',
      customFields: cf
    }
  });
  
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  revalidatePath('/leads/' + leadId);
}

export async function getCallHistoryByPhone(phone: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const cleanPhone = phone.replace(/\D/g, "").slice(-10);

  const logs = await prisma.callLog.findMany({
    where: {
      lead: {
        organizationId: user.organizationId,
        OR: [
          { phone: { contains: cleanPhone } },
          { customFields: { path: ['alternatePhone'], string_contains: cleanPhone } },
          { phone: phone }
        ]
      }
    },
    include: {
      user: { select: { name: true } },
      lead: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return logs;
}

export async function updateLeadDetails(leadId: string, data: {
  name?: string;
  phone?: string;
  alternatePhone?: string | null;
  email?: string | null;
  city?: string | null;
  budget?: string | null;
  status?: string;
  source?: string;
  tag?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const currentLead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!currentLead) return { success: false, error: "Lead not found" };

  const currentCustom = (currentLead.customFields as Record<string, any>) || {};

  const updatedData: any = {};
  if (data.name !== undefined) updatedData.name = data.name;
  if (data.phone !== undefined) updatedData.phone = data.phone;
  if (data.email !== undefined) updatedData.email = data.email || null;
  if (data.city !== undefined) updatedData.city = data.city || null;
  if (data.budget !== undefined) updatedData.budget = data.budget || null;
  if (data.status !== undefined) updatedData.status = data.status;
  if (data.source !== undefined) updatedData.source = data.source;
  if (data.tag !== undefined) updatedData.tag = data.tag || null;

  if (data.alternatePhone !== undefined) {
    updatedData.customFields = {
      ...currentCustom,
      alternatePhone: data.alternatePhone?.trim() || null
    };
  }

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: updatedData
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true, lead: updated };
}

export async function getUniqueCities() {
  const user = await getCurrentUser();
  if (!user) return [];
  const leads = await prisma.lead.findMany({
    where: { organizationId: user.organizationId },
    select: { city: true },
    distinct: ['city']
  });
  return leads.map(l => l.city).filter(Boolean);
}

export async function getLeadContextForAI(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      notes: { orderBy: { createdAt: "desc" }, take: 10 },
      calls: { orderBy: { createdAt: "desc" }, take: 5 }
    }
  });
  
  if (!lead) return "No data available.";
  
  let context = `Lead Name: ${lead.name}\n`;
  if (lead.customFields) {
    context += `Custom Fields: ${JSON.stringify(lead.customFields)}\n`;
  }
  
  if (lead.notes && lead.notes.length > 0) {
    context += `\nRecent Notes:\n`;
    lead.notes.forEach(n => {
      context += `- ${n.content}\n`;
    });
  }
  
  if (lead.calls && lead.calls.length > 0) {
    context += `\nRecent Calls:\n`;
    lead.calls.forEach(c => {
      context += `- Duration: ${c.duration}s. Notes: ${c.notes || 'None'}\n`;
    });
  }
  
  return context;
}


export async function updateSiteVisitDetails(leadId: string, siteVisitData: any) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error("Lead not found");

    const currentCustomFields = (lead.customFields as any) || {};
    const history = currentCustomFields.siteVisitHistory || [];
    
    // Add current data to history with timestamp
    history.unshift({
      ...siteVisitData,
      timestamp: new Date().toISOString()
    });

    const updatedCustomFields = {
      ...currentCustomFields,
      siteVisit: siteVisitData,
      siteVisitHistory: history,
      statusChangedAt: new Date().toISOString()
    };

    let newStatus = lead.status;
    let scoreSiteVisit = lead.scoreSiteVisit;
    if (siteVisitData.type === "Scheduled" || siteVisitData.keepScheduledStatus) {
      newStatus = "Site visit Schedules";
      scoreSiteVisit = "Scheduled";
    } else if (siteVisitData.type === "Rescheduled") {
      newStatus = "Site visit Recheduled";
      scoreSiteVisit = "Rescheduled";
    } else if (siteVisitData.type === "Done") {
      newStatus = "Site visit done";
      scoreSiteVisit = "Done";

      // Clear all pending tasks and notifications for this lead
      await prisma.task.updateMany({
        where: {
          leadId,
          isCompleted: false
        },
        data: { isCompleted: true }
      });
      delete (updatedCustomFields as any).followUpDate;
      delete (updatedCustomFields as any).isManualFollowUp;
      delete (updatedCustomFields as any).staleConvertingAlert;
    } else if (!siteVisitData.type) {
      if (lead.status === "Site visit Schedules" || lead.status === "Site visit Recheduled") {
        newStatus = "follow up";
      }
      scoreSiteVisit = "None";
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { 
        customFields: updatedCustomFields,
        status: newStatus,
        scoreSiteVisit: scoreSiteVisit
      }
    });
    
    await prisma.note.create({
      data: {
        content: siteVisitData.adminOverride
          ? `[ADMIN OVERRIDE] Site visit marked as Completed directly by Admin.`
          : siteVisitData.keepScheduledStatus
          ? `[ADMIN OVERRIDE] Site visit schedule updated to ${siteVisitData.date || 'N/A'} ${siteVisitData.time || ''} (Kept as Scheduled without rescheduling).`
          : `Site visit updated: ${siteVisitData.type} on ${siteVisitData.date || 'N/A'}`,
        leadId,
        userId: lead.assignedToId || (await prisma.user.findFirst())?.id || ""
      }
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return updatedLead;
  } catch (error) {
    console.error("Failed to update site visit:", error);
    throw error;
  }
}

export async function createQuickFollowUp(leadId: string, minutes: number) {
  const user = await getCurrentUser();
  
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");

  // Policy: Never assign a follow-up call task to system admin or non-caller staff!
  let taskUserId: string | null = null;
  if (user?.role === "TELECALLER") {
    taskUserId = user.id;
  } else if (lead.assignedToId) {
    const assignee = await prisma.user.findUnique({
      where: { id: lead.assignedToId },
      select: { id: true, role: true }
    });
    if (assignee && assignee.role === "TELECALLER") {
      taskUserId = assignee.id;
    }
  }

  if (!taskUserId) {
    const caller = await prisma.user.findFirst({
      where: { organizationId: lead.organizationId, role: "TELECALLER" },
      orderBy: { id: "asc" }
    });
    taskUserId = caller?.id || null;
  }

  if (!taskUserId) throw new Error("No active caller available in organization to assign follow-up call task.");

  const dueDate = new Date(Date.now() + minutes * 60000);
  const label = minutes >= 1440 ? "Tomorrow" : minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`;

  // 1. Mark existing pending tasks for this lead as completed so they don't linger as overdue
  await prisma.task.updateMany({
    where: {
      leadId: lead.id,
      isCompleted: false
    },
    data: { isCompleted: true }
  });

  // 2. Create the new scheduled task for the exact future dueDate
  await prisma.task.create({
    data: { 
      title: `Follow up call (${label})`, 
      dueDate, 
      leadId: lead.id, 
      userId: taskUserId,
      isCompleted: false
    }
  });

  const currentCustomFields = (lead.customFields as any) || {};
  const followUpCount = (currentCustomFields.followUpCount || 0) + 1;

  // Determine if this lead was an automated task (e.g. from stale converting timeout or task workflow)
  const isTaskLead = !!(
    currentCustomFields.staleFollowUpReason || 
    currentCustomFields.staleConvertingTriggeredAt || 
    currentCustomFields.isTaskFollowUp
  );

  const updatedCustomFields = {
    ...currentCustomFields,
    followUpDate: dueDate.toISOString(),
    followUpCount,
    // Preserve task status if it was a task lead, so it pops up as a task when due after 15 mins!
    isTaskFollowUp: isTaskLead,
    isManualFollowUp: !isTaskLead,
    manualFollowUpAt: new Date().toISOString(),
    lastFollowUpNote: `Quick follow-up (${label})`,
    statusChangedAt: new Date().toISOString()
  };

  // Clear stale converting alert so ActionRequiredWatcher stops alerting
  delete (updatedCustomFields as any).staleConvertingAlert;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "follow up",
      customFields: updatedCustomFields
    }
  });

  await prisma.note.create({
    data: {
      content: `[SYSTEM: Follow-up Scheduled]\nStatus automatically changed to "follow up". Scheduled for ${dueDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      leadId: lead.id,
      userId: taskUserId
    }
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function scheduleCustomFollowUp(leadId: string, dateIsoString: string, note?: string) {
  const user = await getCurrentUser();
  
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");

  // Policy: Never assign a follow-up call task to system admin or non-caller staff!
  let taskUserId: string | null = null;
  if (user?.role === "TELECALLER") {
    taskUserId = user.id;
  } else if (lead.assignedToId) {
    const assignee = await prisma.user.findUnique({
      where: { id: lead.assignedToId },
      select: { id: true, role: true }
    });
    if (assignee && assignee.role === "TELECALLER") {
      taskUserId = assignee.id;
    }
  }

  if (!taskUserId) {
    const caller = await prisma.user.findFirst({
      where: { organizationId: lead.organizationId, role: "TELECALLER" },
      orderBy: { id: "asc" }
    });
    taskUserId = caller?.id || null;
  }

  if (!taskUserId) throw new Error("No active caller available in organization to assign follow-up call task.");

  const dueDate = new Date(dateIsoString);
  if (isNaN(dueDate.getTime())) throw new Error("Please select a valid date and time");

  if (!note || !note.trim()) {
    throw new Error("A reason/note is mandatory for scheduling a custom follow-up.");
  }

  const taskTitle = `Follow up: ${note.trim()}`;

  // Complete previous pending tasks
  await prisma.task.updateMany({
    where: {
      leadId: lead.id,
      isCompleted: false
    },
    data: { isCompleted: true }
  });

  await prisma.task.create({
    data: { 
      title: taskTitle, 
      dueDate, 
      leadId: lead.id, 
      userId: taskUserId,
      isCompleted: false
    }
  });

  const currentCustomFields = (lead.customFields as any) || {};
  const followUpCount = (currentCustomFields.followUpCount || 0) + 1;
  const isTaskLead = !!(
    currentCustomFields.staleFollowUpReason || 
    currentCustomFields.staleConvertingTriggeredAt || 
    currentCustomFields.isTaskFollowUp
  );

  const updatedCustomFields = {
    ...currentCustomFields,
    followUpDate: dueDate.toISOString(),
    followUpCount,
    isTaskFollowUp: isTaskLead,
    isManualFollowUp: !isTaskLead,
    manualFollowUpAt: new Date().toISOString(),
    lastFollowUpNote: note?.trim() || null,
    statusChangedAt: new Date().toISOString()
  };

  delete (updatedCustomFields as any).staleConvertingAlert;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "follow up",
      customFields: updatedCustomFields
    }
  });

  await prisma.note.create({
    data: {
      content: `[SYSTEM: Custom Follow-up Scheduled]\nStatus automatically changed to "follow up". Scheduled for ${dueDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${note?.trim() ? `\nNote: ${note.trim()}` : ''}`,
      leadId: lead.id,
      userId: user?.id || taskUserId
    }
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  return { success: true };
}


export async function updateQuotationDetails(leadId: string, quotationData: any) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error("Lead not found");

    const currentCustomFields = (lead.customFields as any) || {};
    const history = currentCustomFields.quotationHistory || [];
    
    // Add current data to history with timestamp
    history.unshift({
      ...quotationData,
      timestamp: new Date().toISOString()
    });

    const updatedCustomFields = {
      ...currentCustomFields,
      quotation: quotationData,
      quotationHistory: history,
      statusChangedAt: new Date().toISOString()
    };

    let newStatus = lead.status;
    let scoreQuotation = lead.scoreQuotation || "None";

    const stage = quotationData.stage || quotationData.status;
    const subStage = quotationData.subStage;
    const isWithoutVisit = !!quotationData.withoutSiteVisit || 
      subStage === "Estimate without site visit" || 
      subStage === "Quotation without site visit" ||
      stage === "Estimate without site visit" ||
      stage === "Quotation without site visit";

    if (stage === "Quotation Requested") {
      newStatus = "Quotation Requested";
      scoreQuotation = "None";
    } else if (stage === "Estimate") {
      scoreQuotation = "Estimate";
      if (isWithoutVisit) {
        newStatus = "Estimate without site visit";
      } else if (subStage === "Preparing") {
        newStatus = "Estimated Quotation";
      } else if (subStage === "Sent") {
        newStatus = "Quotation shared";
      } else if (subStage === "Approved") {
        newStatus = "Estimated Quotation";
      } else {
        newStatus = "Estimated Quotation";
      }
    } else if (stage === "Revised") {
      scoreQuotation = "Revised";
      newStatus = "Revised Quotation";
    } else if (stage === "Final") {
      scoreQuotation = "Final";
      newStatus = "final Quotation";
    } else if (stage === "Not Started" || stage === "None") {
      scoreQuotation = "None";
      if (["Quotation Requested", "Estimated Quotation", "Quotation shared", "Estimate without site visit", "Quotation without site visit", "Revised Quotation", "final Quotation"].includes(lead.status)) {
        newStatus = "follow up";
      }
    }

    const isSent = (stage === "Estimate" && (subStage === "Sent" || isWithoutVisit)) || stage === "Final";
    const isApproved = stage === "Estimate" && subStage === "Approved";
    const isRevised = stage === "Revised";

    let targetCallerId: string | null = null;
    if (lead.assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: lead.assignedToId },
        select: { id: true, role: true }
      });
      if (assignedUser?.role === "TELECALLER") {
        targetCallerId = assignedUser.id;
      }
    }
    if (!targetCallerId) {
      const caller = await prisma.user.findFirst({
        where: { organizationId: lead.organizationId, role: "TELECALLER" },
        orderBy: { id: "asc" }
      });
      targetCallerId = caller?.id || null;
    }

    if (isSent) {
      // 1. Close current alerts (e.g. stale converting, revision, site visit)
      delete (updatedCustomFields as any).staleConvertingAlert;
      delete (updatedCustomFields as any).siteVisitAlert;
      (updatedCustomFields as any).revisionAlertActive = false;
      delete (updatedCustomFields as any).revisionAlertDismissedUntil;

      // 2. Open new alert for follow up about quotation (1-day frequency cycle)
      (updatedCustomFields as any).quotationFollowUpActive = true;
      (updatedCustomFields as any).quotationAlertOpen = true;
      (updatedCustomFields as any).quotationSentAt = currentCustomFields.quotationSentAt || new Date().toISOString();
      (updatedCustomFields as any).lastQuotationFollowUpAt = new Date().toISOString();
      (updatedCustomFields as any).quotationApproved = false;

      // Complete previous revision tasks
      await prisma.task.updateMany({
        where: {
          leadId,
          isCompleted: false,
          title: { contains: "Revise" }
        },
        data: { isCompleted: true }
      });

      // Ensure upcoming 1-day quotation follow-up task exists
      const existingTask = await prisma.task.findFirst({
        where: {
          leadId,
          isCompleted: false,
          title: { contains: "Quotation Follow-up" }
        }
      });

      if (!existingTask && targetCallerId) {
        await prisma.task.create({
          data: {
            title: `Follow-up: ${lead.name} - Quotation Follow-up`,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
            leadId,
            userId: targetCallerId,
            isCompleted: false
          }
        });
      }
    } else if (isApproved) {
      // Close this alert when approved
      (updatedCustomFields as any).quotationFollowUpActive = false;
      (updatedCustomFields as any).quotationAlertOpen = false;
      (updatedCustomFields as any).revisionAlertActive = false;
      (updatedCustomFields as any).quotationApproved = true;
      (updatedCustomFields as any).quotationApprovedAt = new Date().toISOString();

      // Complete all quotation tasks
      await prisma.task.updateMany({
        where: {
          leadId,
          isCompleted: false,
          OR: [
            { title: { contains: "Quotation" } },
            { title: { contains: "Revise" } }
          ]
        },
        data: { isCompleted: true }
      });
    } else if (isRevised) {
      // Change alert to request revised until the lead is lost
      (updatedCustomFields as any).quotationFollowUpActive = false;
      (updatedCustomFields as any).quotationAlertOpen = false;
      (updatedCustomFields as any).revisionAlertActive = true;
      (updatedCustomFields as any).revisionRequestedAt = new Date().toISOString();
      (updatedCustomFields as any).quotationApproved = false;

      // Complete old follow-up tasks
      await prisma.task.updateMany({
        where: {
          leadId,
          isCompleted: false,
          title: { contains: "Quotation Follow-up" }
        },
        data: { isCompleted: true }
      });

      // Create upcoming task for revision
      if (targetCallerId) {
        await prisma.task.create({
          data: {
            title: `Revise Quotation: ${lead.name} - Changes Requested`,
            dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
            leadId,
            userId: targetCallerId,
            isCompleted: false
          }
        });
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { 
        customFields: updatedCustomFields,
        status: newStatus,
        scoreQuotation: scoreQuotation
      }
    });
    
    const displayStage = stage === "Estimate" && subStage ? `Estimate - ${subStage}` : stage;
    await prisma.note.create({
      data: {
        content: `[SYSTEM: Quotation Stage Changed to ${displayStage}]\nStatus updated to: ${newStatus}\nDocuments: ${quotationData.docLink ? 'Linked' : 'None'}\n${quotationData.docLink || ''}`,
        leadId: leadId,
        userId: lead.assignedToId || lead.organizationId,
      }
    });

    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/leads`);
    revalidatePath(`/dashboard`);
    return { success: true, lead: updatedLead };
  } catch (error) {
    console.error("Error updating quotation details:", error);
    throw new Error("Failed to update quotation details");
  }
}

export async function updateConvertedDetails(leadId: string, convertedData: any) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error("Lead not found");

    const status = convertedData.status;
    const isProofMandatory = status === "Advance recieved" || status === "Pay Pending" || status === "Won";

    if (isProofMandatory && (!convertedData.proofLink || !convertedData.proofLink.trim())) {
      throw new Error(`A proof document/drive link is mandatory for "${status}".`);
    }

    const currentCustomFields = (lead.customFields as any) || {};
    const history = currentCustomFields.convertedHistory || [];

    // Add current data to history with timestamp
    history.unshift({
      ...convertedData,
      timestamp: new Date().toISOString()
    });

    const updatedCustomFields = {
      ...currentCustomFields,
      converted: convertedData,
      convertedHistory: history,
      statusChangedAt: new Date().toISOString()
    };

    let newStatus = lead.status;

    if (status === "Won") {
      newStatus = "Won";
    } else if (status === "Advance recieved") {
      newStatus = "Advance recieved";
    } else if (status === "Pay Pending") {
      newStatus = "Pay Pending";
    } else if (status === "Not Converted" || status === "None" || !status) {
      if (["Won", "Advance recieved", "Pay Pending"].includes(lead.status)) {
        newStatus = "follow up";
      }
    }

    if (["Won", "Advance recieved", "Pay Pending"].includes(status)) {
      (updatedCustomFields as any).quotationFollowUpActive = false;
      (updatedCustomFields as any).quotationAlertOpen = false;
      (updatedCustomFields as any).revisionAlertActive = false;
      (updatedCustomFields as any).quotationApproved = true;
      delete (updatedCustomFields as any).staleConvertingAlert;

      await prisma.task.updateMany({
        where: {
          leadId,
          isCompleted: false,
          OR: [
            { title: { contains: "Quotation" } },
            { title: { contains: "Revise" } }
          ]
        },
        data: { isCompleted: true }
      });
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        customFields: updatedCustomFields,
        status: newStatus
      }
    });

    const displayLabel = status === "Advance recieved" ? "Advance Received" : status;
    await prisma.note.create({
      data: {
        content: `[SYSTEM: Converted Stage Changed to ${displayLabel}]\nStatus updated to: ${newStatus}\nProof Link: ${convertedData.proofLink || 'None'}${convertedData.amount ? `\nAmount: ${convertedData.amount}` : ''}${convertedData.notes ? `\nNotes: ${convertedData.notes}` : ''}`,
        leadId: leadId,
        userId: lead.assignedToId || lead.organizationId,
      }
    });

    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/leads`);
    revalidatePath(`/dashboard`);
    return { success: true, lead: updatedLead };
  } catch (error: any) {
    console.error("Error updating converted details:", error);
    throw new Error(error.message || "Failed to update converted details");
  }
}

export async function updateJunkDetails(leadId: string, junkData: any) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error("Lead not found");

    const status = junkData.status;
    const isReasonMandatory = ["Junk", "Lost", "Job enquiry", "just curious", "Hold"].includes(status);

    if (isReasonMandatory && (!junkData.reason || !junkData.reason.trim())) {
      throw new Error(`A mandatory reason explaining why this lead is marked as "${status}" is required.`);
    }

    const currentCustomFields = (lead.customFields as any) || {};
    const history = currentCustomFields.junkHistory || [];

    // Add current data to history with timestamp
    history.unshift({
      ...junkData,
      timestamp: new Date().toISOString()
    });

    const updatedCustomFields = {
      ...currentCustomFields,
      junk: junkData,
      junkHistory: history,
      statusChangedAt: new Date().toISOString()
    };

    let newStatus = lead.status;

    if (["Junk", "Lost", "Job enquiry", "just curious", "Hold"].includes(status)) {
      newStatus = status;
      (updatedCustomFields as any).quotationFollowUpActive = false;
      (updatedCustomFields as any).quotationAlertOpen = false;
      (updatedCustomFields as any).revisionAlertActive = false;
      delete (updatedCustomFields as any).staleConvertingAlert;

      await prisma.task.updateMany({
        where: {
          leadId,
          isCompleted: false,
          OR: [
            { title: { contains: "Quotation" } },
            { title: { contains: "Revise" } }
          ]
        },
        data: { isCompleted: true }
      });
    } else if (status === "Active" || status === "None" || !status) {
      if (["Junk", "Lost", "Job enquiry", "just curious", "Hold"].includes(lead.status)) {
        newStatus = "follow up";
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        customFields: updatedCustomFields,
        status: newStatus
      }
    });

    await prisma.note.create({
      data: {
        content: `[SYSTEM: Disqualification / Junk Stage Changed to ${status}]\nStatus updated to: ${newStatus}\nReason: ${junkData.reason || 'None'}`,
        leadId: leadId,
        userId: lead.assignedToId || lead.organizationId,
      }
    });

    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/leads`);
    revalidatePath(`/dashboard`);
    return { success: true, lead: updatedLead };
  } catch (error: any) {
    console.error("Error updating junk details:", error);
    throw new Error(error.message || "Failed to update junk details");
  }
}

export async function getLeadQuickDetails(leadId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      notes: { orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true } } } },
      calls: { orderBy: { createdAt: "desc" }, take: 6 },
      tasks: { where: { isCompleted: false }, orderBy: { dueDate: "asc" }, take: 3 },
    }
  });

  return lead;
}

