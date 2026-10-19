"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";
import { extractLeadsFromText, ExtractedLead } from "@/lib/pdfLeadExtractor";

export interface BulkLeadRow {
  name?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  city?: string;
  budget?: string;
  status?: string;
  source?: string;
  tag?: string;
  propertyStatus?: string;
  notes?: string;
  customFields?: Record<string, any>;
}

export interface BulkUploadOptions {
  assignmentStrategy: "ROUND_ROBIN" | "SPECIFIC_USER" | "CURRENT_USER" | "UNASSIGNED";
  targetUserId?: string;
  defaultStatus?: string;
  defaultSource?: string;
  skipDuplicates?: boolean;
}

/**
 * Server action to parse a PDF file on the server and extract lead records
 */
export async function parsePdfLeads(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) {
    throw new Error("Unauthorized. PDF lead extraction is restricted to administrators.");
  }

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Load PDFParse
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    await parser.load();
    const result = await parser.getText();
    await parser.destroy();

    const fullText = result.text || "";
    const extractedRows = extractLeadsFromText(fullText);

    return {
      success: true,
      fileName: file.name,
      totalDetected: extractedRows.length,
      rows: extractedRows
    };
  } catch (err: any) {
    console.error("Error parsing PDF leads:", err);
    return {
      success: false,
      error: err.message || "Failed to extract text from PDF document."
    };
  }
}

/**
 * Fetch available team members / telecallers to assign leads to during bulk import
 */
export async function getUploadAssignees() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) {
    return [];
  }

  // Strictly return callers (TELECALLER). System Admin and non-caller staff must NEVER be assigned leads/calls.
  const users = await prisma.user.findMany({
    where: { 
      organizationId: user.organizationId,
      role: "TELECALLER"
    },
    select: { id: true, name: true, role: true, email: true },
    orderBy: { name: "asc" }
  });

  return users;
}

/**
 * Bulk import validated lead rows into the database
 */
export async function bulkImportLeads(leads: BulkLeadRow[], options: BulkUploadOptions) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) {
    throw new Error("Unauthorized: Bulk upload is restricted to administrators.");
  }

  const orgId = user.organizationId;
  const {
    assignmentStrategy = "ROUND_ROBIN",
    targetUserId,
    defaultStatus = "Fresh",
    defaultSource = "BULK_IMPORT",
    skipDuplicates = true
  } = options;

  // 1. Fetch callers if round robin is selected (strictly role === "TELECALLER")
  let callers: { id: string; name: string }[] = [];
  if (assignmentStrategy === "ROUND_ROBIN") {
    callers = await prisma.user.findMany({
      where: { 
        organizationId: orgId, 
        role: "TELECALLER",
        leaves: {
          none: {
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          }
        }
      },
      select: { id: true, name: true },
      orderBy: { id: "asc" }
    });
    // Never fallback to admin or non-caller if no callers exist!
  }

  // Validate specific user if chosen
  let validTargetCallerId: string | null = null;
  if (assignmentStrategy === "SPECIFIC_USER" && targetUserId) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true }
    });
    if (targetUser && targetUser.role === "TELECALLER") {
      validTargetCallerId = targetUser.id;
    }
  }

  // 2. Fetch existing phones in organization to check duplicates
  const existingLeads = await prisma.lead.findMany({
    where: { organizationId: orgId },
    select: { phone: true }
  });

  const existingPhoneSet = new Set<string>();
  for (const el of existingLeads) {
    const clean = String(el.phone || "").replace(/\D/g, "").slice(-10);
    if (clean.length === 10) existingPhoneSet.add(clean);
  }

  const leadsToCreate: any[] = [];
  let duplicatesSkipped = 0;
  let invalidSkipped = 0;
  let rrIndex = 0;
  const batchId = `import_${Date.now()}`;
  const batchPhoneSet = new Set<string>();

  for (const raw of leads) {
    const cleanPhone = String(raw.phone || "").replace(/\D/g, "").slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) {
      invalidSkipped++;
      continue;
    }

    // Check duplicate in same batch
    if (batchPhoneSet.has(cleanPhone)) {
      duplicatesSkipped++;
      continue;
    }
    batchPhoneSet.add(cleanPhone);

    // Check duplicate against existing database leads
    if (skipDuplicates && existingPhoneSet.has(cleanPhone)) {
      duplicatesSkipped++;
      continue;
    }

    // Determine assignment and assigned status
    // Policy: Leads and calls must ONLY be assigned to callers (role === 'TELECALLER').
    // System Admins (ADMIN, ROOT) or non-caller staff must NEVER be assigned leads or calls.
    let assignedToId: string | null = null;
    let assignedStatus = "PENDING";
    if (assignmentStrategy === "SPECIFIC_USER" && validTargetCallerId) {
      assignedToId = validTargetCallerId;
      assignedStatus = "PENDING";
    } else if (assignmentStrategy === "ROUND_ROBIN" && callers.length > 0) {
      assignedToId = callers[rrIndex % callers.length].id;
      assignedStatus = "PENDING";
      rrIndex++;
    } else {
      assignedToId = null;
      assignedStatus = "UNASSIGNED";
    }

    const leadStatus = raw.status || defaultStatus || "Fresh";
    const leadSource = raw.source || defaultSource || "BULK_IMPORT";

    // Score Location
    let scoreLocation = "None";
    if (raw.city) {
      const cityLower = raw.city.toLowerCase();
      if (cityLower.includes("tvm") || cityLower.includes("thiruvananthapuram") || cityLower.includes("trivandrum")) scoreLocation = "TVM";
      else if (cityLower.includes("kollam") || cityLower.includes("kanyakumari") || cityLower.includes("pathanamthitta") || cityLower.includes("attingal") || cityLower.includes("varkala")) scoreLocation = "Near TVM";
      else if (["kochi", "ernakulam", "kerala", "thrissur", "calicut", "kozhikode", "alappuzha", "kannur", "kottayam", "palakkad", "malappuram"].some(c => cityLower.includes(c))) scoreLocation = "Kerala";
    }

    // Score Budget
    let scoreBudget = "Unknown";
    if (raw.budget) {
      const bLower = raw.budget.toLowerCase();
      if (bLower.includes("20l") || bLower.includes("30l") || bLower.includes("50l") || bLower.includes("100l") || bLower.includes("strong")) scoreBudget = "Strong";
      else if (bLower.includes("10l") || bLower.includes("15l") || bLower.includes("good")) scoreBudget = "Good";
      else if (bLower.includes("5l") || bLower.includes("6l") || bLower.includes("7l") || bLower.includes("8l") || bLower.includes("possible")) scoreBudget = "Possible";
      else if (bLower.includes("1l") || bLower.includes("2l") || bLower.includes("3l") || bLower.includes("4l") || bLower.includes("poor")) scoreBudget = "Poor";
    }

    leadsToCreate.push({
      name: (raw.name || `Lead ${cleanPhone.slice(-4)}`).trim(),
      phone: cleanPhone,
      email: raw.email ? raw.email.trim() : null,
      city: raw.city ? raw.city.trim() : null,
      budget: raw.budget ? raw.budget.trim() : null,
      tag: raw.tag ? raw.tag.trim() : null,
      propertyStatus: raw.propertyStatus ? raw.propertyStatus.trim() : null,
      source: leadSource,
      status: leadStatus,
      capturedOn: new Date(),
      organizationId: orgId,
      assignedToId,
      assignedStatus,
      assignedAt: assignedToId ? new Date() : null,
      scoreLocation,
      scoreBudget,
      customFields: {
        ...(raw.customFields || {}),
        ...(raw.alternatePhone ? { alternatePhone: raw.alternatePhone.trim() } : {}),
        statusChangedAt: new Date().toISOString(),
        bulkImported: true,
        importBatchId: batchId,
        importedAt: new Date().toISOString()
      }
    });
  }

  if (leadsToCreate.length === 0) {
    return {
      success: true,
      totalProcessed: leads.length,
      importedCount: 0,
      duplicatesSkipped,
      invalidSkipped,
      message: "No new leads to import. All entries were either duplicates or had invalid phone numbers."
    };
  }

  // Batch insert into database
  await prisma.lead.createMany({
    data: leadsToCreate
  });

  // Create audit activity log
  try {
    await prisma.activityLog.create({
      data: {
        action: "BULK_LEADS_IMPORTED",
        details: `Bulk imported ${leadsToCreate.length} leads. Duplicates skipped: ${duplicatesSkipped}. Invalid: ${invalidSkipped}. Strategy: ${assignmentStrategy}. Batch: ${batchId}`,
        userId: user.id
      }
    });
  } catch (e) {
    console.error("Error creating activity log for bulk import:", e);
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");

  return {
    success: true,
    totalProcessed: leads.length,
    importedCount: leadsToCreate.length,
    duplicatesSkipped,
    invalidSkipped,
    batchId
  };
}
