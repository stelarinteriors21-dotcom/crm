import prisma from "@/lib/prisma";
import { resolveAudioFileMeta } from "@/lib/s3Storage";

export const MOBILE_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ResolveCallTargetParams {
  leadIdFromForm?: string | null;
  phone?: string | null;
  userId?: string | null;
  fileName?: string | null;
}

export type ResolveCallTargetResult =
  | {
      ok: true;
      leadId: string;
      finalUserId: string;
      categoryFolder: string;
      userFolder: string;
      s3Key: string;
      contentType: string;
      ext: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

/**
 * Resolves a CRM lead (by ID or phone), caller user folder, and target S3 object key.
 */
export async function resolveCallLeadAndStoragePath({
  leadIdFromForm,
  phone,
  userId,
  fileName,
}: ResolveCallTargetParams): Promise<ResolveCallTargetResult> {
  if (!leadIdFromForm && !phone) {
    return { ok: false, status: 400, error: "Missing required fields: leadId or phone" };
  }

  let leadId = leadIdFromForm || "";

  if (!leadId && phone) {
    const normalizedPhone = phone.replace(/\D/g, "");
    const corePhone = normalizedPhone.length >= 10 ? normalizedPhone.slice(-10) : normalizedPhone;
    if (!corePhone) {
      return { ok: false, status: 404, error: `Lead not found for phone: ${phone}` };
    }

    let lead = userId
      ? await prisma.lead.findFirst({
          where: { phone: { contains: corePhone }, assignedToId: userId },
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true },
        })
      : null;

    if (!lead) {
      lead = await prisma.lead.findFirst({
        where: { phone: { contains: corePhone } },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true },
      });
    }

    if (!lead) {
      return { ok: false, status: 404, error: `Lead not found for phone: ${phone}` };
    }
    leadId = lead.id;
  }

  let finalUserId = userId || "";
  let callerUser =
    userId && userId !== "MANUAL_WEB"
      ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } })
      : null;

  if (!callerUser) {
    const leadForUser = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { assignedTo: { select: { id: true, name: true, role: true } } },
    });
    if (leadForUser?.assignedTo) {
      finalUserId = leadForUser.assignedTo.id;
      callerUser = leadForUser.assignedTo;
    } else {
      const admin = await prisma.user.findFirst({ select: { id: true, name: true, role: true } });
      if (admin) {
        finalUserId = admin.id;
        callerUser = admin;
      }
    }
  }

  const rawUserName = callerUser?.name || "general";
  const userFolder = rawUserName.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "_");
  const isSiteVisitor = callerUser?.role === "SITE_VISITOR";
  const categoryFolder = isSiteVisitor ? "site-visits" : "recordings";
  const { ext, contentType } = resolveAudioFileMeta(fileName);
  const s3Key = `${categoryFolder}/${userFolder}/call_${leadId}_${Date.now()}.${ext}`;

  return {
    ok: true,
    leadId,
    finalUserId,
    categoryFolder,
    userFolder,
    s3Key,
    contentType,
    ext,
  };
}
