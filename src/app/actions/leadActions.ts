"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";

export async function getLeads(query?: string, status?: string | string[], source?: string, assigned?: string, active?: boolean, startDate?: string, endDate?: string, tag?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const where: any = {
    organizationId: user.organizationId,
  };

  if (tag && tag !== "All") {
    where.tag = tag;
  }

  if (user.role !== "ADMIN" && user.role !== "ROOT") {
    where.assignedToId = user.id;
  } else if (assigned === "me") {
    where.assignedToId = user.id;
  } else if (assigned && assigned !== "all") {
    where.assignedToId = assigned;
  }

  if (source) {
    where.source = source;
  }

  if (active) {
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
    where.OR = [
      { name: { contains: query } },
      { phone: { contains: query } },
      { email: { contains: query } },
    ];
  }

  if (status) {
    if (Array.isArray(status)) {
      where.status = { in: status };
    } else if (status.includes(",")) {
      where.status = { in: status.split(",") };
    } else {
      where.status = status;
    }
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: true,
    },
  });

  return leads;
}

export async function createLead(data: any) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    let assignedToId = data.assignedToId || null;
    let assignedStatus = "PENDING";
    
    // Auto-assign using Round-Robin if not provided
    if (!assignedToId) {
      const callers = await prisma.user.findMany({
        where: { organizationId: user.organizationId, role: "TELECALLER" },
        orderBy: { id: 'asc' }
      });
      
      if (callers.length > 0) {
        // Find the last lead that was assigned to any of these callers
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
      } else {
        assignedToId = user.id; // fallback to admin/creator if no telecallers exist
      }
    }

    // Auto-calculate initial score factors based on provided data
    let scoreLocation = "Outside";
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

    let scoreEngagement = "None";
    if (data.source) {
      const src = data.source.toLowerCase();
      if (src.includes("facebook") || src.includes("meta") || src.includes("ad")) scoreEngagement = "Cold";
      else if (src.includes("website") || src.includes("organic")) scoreEngagement = "Warm";
      else if (src.includes("manual") || src.includes("referral")) scoreEngagement = "Hot";
    }

    const lead = await prisma.lead.create({
      data: {
        name: data.name || "Unknown",
        phone: data.phone || "",
        email: data.email || null,
        city: data.city || null,
        source: data.source || "MANUAL",
        status: data.status || "Fresh",
        budget: data.budget || null,
        organizationId: user.organizationId,
        assignedToId,
        assignedStatus,
        assignedAt: new Date(),
        scoreLocation,
        scoreBudget,
        scoreEngagement
      },
    });

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { success: true, lead };
  } catch (error: any) {
    console.error("Failed to create lead:", error);
    return { success: false, error: error.message };
  }
}

export async function acceptLead(leadId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.lead.update({
    where: { id: leadId },
    data: { assignedStatus: 'ACCEPTED', assignedToId: user.id }
  });
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function rejectLead(leadId: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { assignedStatus: 'REJECTED', assignedToId: null }
  });
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function acceptAllLeads(userId: string) {
  await prisma.lead.updateMany({
    where: { assignedToId: userId, assignedStatus: 'PENDING' },
    data: { assignedStatus: 'ACCEPTED' }
  });
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function rejectAllLeads(userId: string) {
  await prisma.lead.updateMany({
    where: { assignedToId: userId, assignedStatus: 'PENDING' },
    data: { assignedStatus: 'REJECTED', assignedToId: null }
  });
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function getPendingLeadForUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  
  const lead = await prisma.lead.findFirst({
    where: { 
      organizationId: user.organizationId,
      assignedStatus: 'PENDING',
      assignedToId: user.id
    },
    orderBy: { assignedAt: 'desc' }
  });
  
  return lead;
}

export async function escalateLead(leadId: string, isManualPass: boolean = true) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { assignedTo: true }
  });
  if (!lead) return { error: "Not found" };

  const callers = await prisma.user.findMany({
    where: { organizationId: lead.organizationId, role: "TELECALLER" },
    orderBy: { id: "asc" }
  });

  const escalationLevel = lead.escalationLevel + 1;
  let nextAssigneeId = null;
  let assignedStatus = "PENDING";

  if (escalationLevel === 1) {
    // Escalate to the OTHER caller
    const otherCaller = callers.find(c => c.id !== lead.assignedToId);
    if (otherCaller) {
      nextAssigneeId = otherCaller.id;
    } else {
      // If no other caller, escalate to Admin directly
      nextAssigneeId = null;
    }
  }

  if (escalationLevel >= 2 || !nextAssigneeId) {
    // Escalate to Admin (Unassigned but marked as escalated)
    const admin = await prisma.user.findFirst({
      where: { organizationId: lead.organizationId, role: { in: ["ADMIN", "ROOT"] } },
      orderBy: { id: "asc" }
    });
    
    nextAssigneeId = admin ? admin.id : null;
    assignedStatus = "PENDING"; // Mark as PENDING so Admin sees it in a pending list
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      assignedToId: nextAssigneeId,
      assignedStatus: assignedStatus,
      escalationLevel: escalationLevel,
      previousAssigneeId: lead.assignedToId,
      assignedAt: new Date() // Reset the 20-min timer for the next person
    }
  });

  // If this was a manual pass by the employee, send an email to admins
  if (isManualPass) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER || 'shaji2222222@gmail.com',
          pass: process.env.SMTP_PASS || 'umlt zsnv cxsr kfjy'
        }
      });

      const org = await prisma.organization.findUnique({ where: { id: lead.organizationId } });
      const adminEmails = org?.escalationEmails || 'stelarinteriors21@gmail.com,shaji2222222@gmail.com';
      const assigneeName = lead.assignedTo?.name || 'Unknown Agent';
      
      const mailOptions = {
        from: `"Stelar CRM Alerts" <${process.env.SMTP_USER || 'shaji2222222@gmail.com'}>`,
        to: adminEmails,
        subject: `🚨 Lead Passed by ${assigneeName}`,
        html: `
          <h2 style="color: #f59e0b;">Lead Passed Alert</h2>
          <p><b>${assigneeName}</b> has manually <b>passed (rejected)</b> a lead.</p>
          <hr/>
          <h3>Lead Details:</h3>
          <ul>
            <li><b>Name:</b> ${lead.name}</li>
            <li><b>Phone:</b> ${lead.phone}</li>
            <li><b>City:</b> ${lead.city || 'N/A'}</li>
            <li><b>Source:</b> ${lead.source}</li>
          </ul>
          <br/>
          <p>It has been auto-reassigned to the next available agent (or Admin queue).</p>
        `
      };
      
      transporter.sendMail(mailOptions).catch(console.error); // don't await so it doesn't block UI
    } catch (e) {
      console.error("Failed to send pass email", e);
    }
  }

  revalidatePath('/leads');
  revalidatePath('/calls');
  return { success: true };
}

export async function getCallers() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) return [];
  
  return await prisma.user.findMany({
    where: { organizationId: user.organizationId, role: "TELECALLER" },
    select: { id: true, name: true }
  });
}

export async function assignLeadToUser(leadId: string, assigneeId: string) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) return { error: "Unauthorized" };

  await prisma.lead.update({
    where: { id: leadId },
    data: { 
      assignedToId: assigneeId,
      status: "PENDING", // Reset to pending so the caller gets the popup
      escalationLevel: 0, // Reset escalation
      previousAssigneeId: null
    }
  });
  
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

export async function updateLeadStatus(leadId: string, status: string | null) {
  const { getCurrentUser } = await import("@/app/actions/authActions");
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const prisma = (await import("@/lib/prisma")).default;
  await prisma.lead.update({
    where: { id: leadId },
    data: { status }
  });

  const { revalidatePath } = await import("next/cache");
  revalidatePath('/leads');
  revalidatePath(/leads/ + leadId);
}

export async function acceptAndScheduleCall(leadId: string, minutes: number = 15) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.lead.update({
    where: { id: leadId },
    data: { 
      assignedStatus: 'ACCEPTED', 
      assignedToId: user.id 
    }
  });

  const dueDate = new Date();
  dueDate.setMinutes(dueDate.getMinutes() + minutes);

  await prisma.task.create({
    data: {
      title: `Call scheduled in ${minutes} mins`,
      dueDate: dueDate,
      status: "PENDING",
      type: "CALL",
      leadId: leadId,
      assignedToId: user.id,
      organizationId: user.organizationId
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
