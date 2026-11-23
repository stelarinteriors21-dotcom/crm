"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/authActions";
import { isAwsConfigured, uploadBufferToS3 } from "@/lib/s3Storage";

/**
 * Uploads a compressed site visit photo.
 * If AWS S3 is active, uploads to `site-visits/{userName}/photos/...` and returns
 * a permanent, fast-loading media proxy URL.
 * If S3 is not configured, safely returns the compressed data URL.
 */
export async function uploadSiteVisitPhotoAction(
  leadId: string,
  compressedDataUrl: string
): Promise<{ success: boolean; url: string; error?: string }> {
  try {
    if (!compressedDataUrl) {
      return { success: false, url: "", error: "No photo data provided" };
    }

    // 1. If not a base64 data URL (e.g. already an S3 or http URL), return as is
    if (!compressedDataUrl.startsWith("data:image/")) {
      return { success: true, url: compressedDataUrl };
    }

    // 2. Identify the site visitor or uploader
    const currentUser = await getCurrentUser();
    let userName = currentUser?.name || null;

    if (!userName) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { assignedTo: { select: { name: true, role: true } } }
      });
      userName = lead?.assignedTo?.name || "general";
    }

    const cleanUserFolder = userName.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "_");

    // 3. If AWS S3 is configured, upload to S3
    if (isAwsConfigured) {
      const match = compressedDataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        const rawFormat = match[1].toLowerCase();
        const ext = rawFormat.includes("webp") ? "webp" : "jpg";
        const mimeType = rawFormat.includes("webp") ? "image/webp" : "image/jpeg";
        const buffer = Buffer.from(match[2], "base64");

        const randId = Math.random().toString(36).substring(2, 7);
        const s3Key = `site-visits/${cleanUserFolder}/photos/lead_${leadId}_${Date.now()}_${randId}.${ext}`;

        const uploadRes = await uploadBufferToS3(s3Key, buffer, mimeType);
        if (uploadRes.success) {
          // Return permanent cached route URL
          const mediaUrl = `/api/media?key=${encodeURIComponent(s3Key)}`;
          return {
            success: true,
            url: mediaUrl
          };
        }
      }
    }

    // 4. Fallback: Return the already compressed base64 data URL
    return {
      success: true,
      url: compressedDataUrl
    };
  } catch (err: any) {
    console.error("Failed to upload site visit photo:", err);
    // Graceful fallback to compressed data URL so visitor never loses their photo
    return {
      success: true,
      url: compressedDataUrl
    };
  }
}
