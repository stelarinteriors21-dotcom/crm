import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/authActions";
import {
  isAwsConfigured,
  uploadBufferToS3,
  getS3PresignedUploadUrl,
  resolveMediaFileMeta,
} from "@/lib/s3Storage";
import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";
import { revalidatePath } from "next/cache";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB hard storage guard

function sanitizeFolderSegment(val: string): string {
  return (val || "general").toLowerCase().trim().replace(/[^a-z0-9_-]/g, "_") || "general";
}

function buildAttachmentKey(leadId: string, category: string, fileName: string): { key: string; contentType: string } {
  const safeCategory = sanitizeFolderSegment(category || "general");
  const { ext, contentType } = resolveMediaFileMeta(fileName);
  const base = (fileName || "file")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 40) || "file";
  const key = `attachments/${safeCategory}/${leadId}_${Date.now()}_${base}.${ext}`;
  return { key, contentType };
}

async function resolveUploaderId(currentUserId: string | undefined, leadId: string): Promise<string | undefined> {
  if (currentUserId) return currentUserId;
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { assignedToId: true } });
  if (lead?.assignedToId) return lead.assignedToId;
  const fallbackAdmin = await prisma.user.findFirst({ select: { id: true } });
  return fallbackAdmin?.id;
}

/**
 * Supports:
 * 1) JSON { action: "presign", leadId, category, fileName, fileSize, contentType } -> returns S3 PUT signedUrl + publicUrl
 * 2) Multipart FormData { file, leadId, category, displayName, saveRecord } -> uploads file directly & optionally saves FileAttachment row
 */
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const reqContentType = request.headers.get("content-type") || "";

    // 1. Presigned direct S3 upload URL request (or saveRecord confirmation)
    if (reqContentType.includes("application/json")) {
      const body = await request.json();
      const { leadId, category = "general", fileName = "document.pdf", fileSize = 0, action = "presign" } = body;

      if (!leadId) {
        return NextResponse.json({ success: false, error: "leadId is required" }, { status: 400 });
      }

      const leadExists = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
      if (!leadExists) {
        return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
      }

      if (fileSize && Number(fileSize) > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json(
          { success: false, error: "File exceeds maximum allowed 10 MB storage limit after compression." },
          { status: 413 }
        );
      }

      if (action === "confirm") {
        const { url, displayName, size, fileType } = body;
        if (!url || !displayName) {
          return NextResponse.json({ success: false, error: "Missing url or displayName" }, { status: 400 });
        }

        const uploaderId = await resolveUploaderId(currentUser?.id, leadId);
        if (!uploaderId) {
          return NextResponse.json({ success: false, error: "Unable to resolve uploader" }, { status: 400 });
        }

        const existing = await prisma.fileAttachment.findFirst({ where: { leadId, url } });
        const attachment =
          existing ||
          (await prisma.fileAttachment.create({
            data: {
              leadId,
              userId: uploaderId,
              name: displayName,
              url,
              size: size ? Number(size) : null,
              type: fileType || "UPLOAD",
            },
          }));

        revalidatePath(`/leads/${leadId}`);
        return NextResponse.json({ success: true, attachment });
      }

      if (!isAwsConfigured) {
        return NextResponse.json({ success: false, useFormDataFallback: true });
      }

      const { key, contentType } = buildAttachmentKey(leadId, category, fileName);
      const s3Res = await getS3PresignedUploadUrl(key, contentType);
      if (!s3Res.success || !s3Res.signedUrl) {
        return NextResponse.json({ success: false, useFormDataFallback: true, error: s3Res.error });
      }

      return NextResponse.json({
        success: true,
        signedUrl: s3Res.signedUrl,
        publicUrl: s3Res.publicUrl,
        contentType,
        key,
      });
    }

    // 2. Direct Multipart FormData upload (S3 or local disk fallback)
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const leadId = (formData.get("leadId") as string) || "";
    const category = (formData.get("category") as string) || "general";
    const displayName = ((formData.get("displayName") as string) || file?.name || "Uploaded File").trim();
    const saveRecord = formData.get("saveRecord") === "true";

    if (!file || !leadId) {
      return NextResponse.json({ success: false, error: "file and leadId are required" }, { status: 400 });
    }

    const leadExists = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
    if (!leadExists) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json(
        { success: false, error: "File exceeds maximum 10 MB storage limit after compression." },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const { key, contentType } = buildAttachmentKey(leadId, category, file.name || displayName);

    let fileUrl = "";
    if (isAwsConfigured) {
      const s3Res = await uploadBufferToS3(key, buffer, contentType);
      if (s3Res.success && s3Res.url) {
        fileUrl = s3Res.url;
      }
    }

    if (!fileUrl) {
      const localDir = path.join(process.cwd(), "public", "uploads", "attachments", sanitizeFolderSegment(category));
      if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
      const baseFile = path.basename(key);
      await writeFile(path.join(localDir, baseFile), buffer);
      fileUrl = `/uploads/attachments/${sanitizeFolderSegment(category)}/${baseFile}`;
    }

    let attachment = null;
    if (saveRecord) {
      const uploaderId = await resolveUploaderId(currentUser?.id, leadId);
      if (uploaderId) {
        attachment = await prisma.fileAttachment.create({
          data: {
            leadId,
            userId: uploaderId,
            name: displayName,
            url: fileUrl,
            size: buffer.length,
            type: file.type || contentType || "UPLOAD",
          },
        });
        revalidatePath(`/leads/${leadId}`);
      }
    }

    return NextResponse.json({
      success: true,
      url: fileUrl,
      key,
      name: displayName,
      size: buffer.length,
      type: contentType,
      attachment,
    });
  } catch (err: any) {
    console.error("Attachment upload error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
