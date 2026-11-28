"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/authActions";
import { revalidatePath } from "next/cache";

export interface WhatsAppApiConfig {
  provider: "META_CLOUD_API" | "COMPANION_WEB" | "UNCONFIGURED";
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  businessPhoneNumber: string;
  webhookUrl: string;
  verifyToken: string;
  isConnected: boolean;
  connectedAt?: string;
  lastTestedStatus?: string;
}

const DEFAULT_CONFIG: WhatsAppApiConfig = {
  provider: "UNCONFIGURED",
  phoneNumberId: "",
  wabaId: "",
  accessToken: "",
  businessPhoneNumber: "",
  webhookUrl: "/api/webhooks/whatsapp",
  verifyToken: "stelar_whatsapp_secure_2026",
  isConnected: false
};

/**
 * Get WhatsApp API configuration for the organization
 */
export async function getWhatsAppApiConfig(): Promise<WhatsAppApiConfig> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return DEFAULT_CONFIG;
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { customFieldLabels: true }
    });

    const labels = (org?.customFieldLabels as any) || {};
    const config = labels.whatsAppApiConfig;

    if (config) {
      return {
        ...DEFAULT_CONFIG,
        ...config
      };
    }

    return DEFAULT_CONFIG;
  } catch (err) {
    console.error("Failed to get WhatsApp API config:", err);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save WhatsApp API configuration
 */
export async function saveWhatsAppApiConfig(
  config: Partial<WhatsAppApiConfig>
): Promise<{ success: boolean; config?: WhatsAppApiConfig; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId }
    });

    const currentLabels = (org?.customFieldLabels as any) || {};
    const existingConfig = currentLabels.whatsAppApiConfig || DEFAULT_CONFIG;

    const updatedConfig: WhatsAppApiConfig = {
      ...existingConfig,
      ...config,
      isConnected: Boolean(config.phoneNumberId && config.accessToken)
    };

    if (updatedConfig.isConnected && !updatedConfig.connectedAt) {
      updatedConfig.connectedAt = new Date().toISOString();
    }

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        customFieldLabels: {
          ...currentLabels,
          whatsAppApiConfig: updatedConfig
        }
      }
    });

    revalidatePath("/whatsapp");
    return { success: true, config: updatedConfig };
  } catch (err: any) {
    console.error("Failed to save WhatsApp config:", err);
    return { success: false, error: err.message || "Failed to save configuration" };
  }
}

/**
 * Test WhatsApp API connection against Meta Graph API
 */
export async function testWhatsAppApiConnection(
  phoneNumberId: string,
  accessToken: string
): Promise<{ success: boolean; message: string; verifiedName?: string }> {
  try {
    if (!phoneNumberId || !accessToken) {
      return { success: false, message: "Phone Number ID and Meta Access Token are required." };
    }

    // Call Meta Graph API to verify phone number details
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const data = await res.json();

    if (data.error) {
      return {
        success: false,
        message: data.error.message || "Meta API rejected credentials. Verify your token and Phone ID."
      };
    }

    const verifiedName = data.verified_name || data.display_phone_number || "Meta Verified WhatsApp Business Account";
    return {
      success: true,
      message: `Connection Verified! Linked to: ${verifiedName} (${data.display_phone_number || "Active"})`,
      verifiedName
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection failed: ${err.message || "Could not reach Meta Graph API"}`
    };
  }
}

/**
 * Fetch all conversations grouped by Lead with their latest message
 */
export async function getWhatsAppConversationsAction(): Promise<any[]> {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId;
    const isAdmin = user?.role === "ADMIN" || user?.role === "ROOT";

    const where: any = {
      ...(orgId ? { organizationId: orgId } : {}),
      phone: { not: "" }
    };

    // Non-admin callers only see WhatsApp messages of leads assigned to them
    if (!isAdmin && user?.id) {
      where.assignedToId = user.id;
    }

    // Fetch leads with their phone numbers & recent WhatsApp messages
    const leads = await prisma.lead.findMany({
      where,
      include: {
        whatsAppLogs: {
          orderBy: { createdAt: "desc" },
          take: 50
        },
        fileAttachments: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const mapped = leads.map((l) => {
      const logs = l.whatsAppLogs || [];
      const lastLog = logs[0] || null;
      const unreadCount = logs.filter(
        (m) => m.direction === "INBOUND" && m.status !== "READ"
      ).length;

      const cf = (l.customFields as any) || {};
      const sv = cf.siteVisit || {};

      return {
        leadId: l.id,
        name: l.name,
        phone: l.phone,
        status: l.status,
        scoreSiteVisit: l.scoreSiteVisit,
        siteVisitOtp: sv.otp || null,
        siteVisitDate: sv.date || null,
        lastMessage: lastLog ? lastLog.message : "No messages yet",
        lastMessageTime: lastLog ? lastLog.createdAt : l.createdAt,
        lastMessageDirection: lastLog ? lastLog.direction : null,
        unreadCount,
        messageCount: logs.length,
        messages: logs.slice().reverse()
      };
    });

    // Order like normal WhatsApp:
    // 1. Leads with messages come first, sorted by the latest message time (newest on top).
    // 2. Leads without messages come after, sorted by their creation date.
    mapped.sort((a, b) => {
      const aHas = (a.messageCount || 0) > 0;
      const bHas = (b.messageCount || 0) > 0;

      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;

      const timeA = new Date(a.lastMessageTime || 0).getTime();
      const timeB = new Date(b.lastMessageTime || 0).getTime();
      return timeB - timeA;
    });

    return mapped;
  } catch (err) {
    console.error("Failed to get WhatsApp conversations:", err);
    return [];
  }
}

/**
 * Upload a media file directly to Meta WhatsApp Cloud API
 */
export async function uploadWhatsAppMediaAction(formData: FormData): Promise<{
  success: boolean;
  mediaId?: string;
  url?: string;
  filename?: string;
  error?: string;
}> {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const config = await getWhatsAppApiConfig();
    if (!config.isConnected || !config.phoneNumberId || !config.accessToken) {
      return { success: false, error: "WhatsApp Cloud API is not configured" };
    }

    const metaFormData = new FormData();
    metaFormData.append("file", file, file.name);
    metaFormData.append("messaging_product", "whatsapp");
    metaFormData.append("type", file.type || "application/octet-stream");

    const res = await fetch(`https://graph.facebook.com/v19.0/${config.phoneNumberId}/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`
      },
      body: metaFormData
    });

    const data = await res.json();
    if (data?.id) {
      return {
        success: true,
        mediaId: data.id,
        url: `/api/whatsapp/media/${data.id}`,
        filename: file.name
      };
    } else {
      console.error("Meta media upload error:", data);
      const isAuthErr = data?.error?.code === 190 || data?.error?.type === "OAuthException" || (data?.error?.message || "").includes("expired");
      return {
        success: false,
        error: isAuthErr
          ? "Meta Access Token has expired (Authentication Error). Please update it in 'Connect API'."
          : (data?.error?.message || "Failed to upload media to WhatsApp Cloud API")
      };
    }
  } catch (err: any) {
    console.error("Upload media action failed:", err);
    return { success: false, error: err.message || "Failed to process media upload" };
  }
}

/**
 * Send an outbound WhatsApp message or document
 */
export async function sendWhatsAppMessageAction(params: {
  leadId: string;
  phone: string;
  message: string;
  mediaUrl?: string;
  mediaId?: string;
  mediaType?: "document" | "image" | "audio";
  filename?: string;
}): Promise<{ success: boolean; log?: any; metaDelivered?: boolean; error?: string }> {
  try {
    const { leadId, phone, message, mediaUrl, mediaId, mediaType, filename } = params;
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    let finalMessage = message.trim();
    const effectiveUrl = mediaUrl || (mediaId ? `/api/whatsapp/media/${mediaId}` : "");

    if (effectiveUrl) {
      if (mediaType === "document") {
        finalMessage = `📄 Document: ${filename || "Document.pdf"} | ${effectiveUrl}${finalMessage ? `\n\n${finalMessage}` : ""}`;
      } else if (mediaType === "image") {
        finalMessage = `📷 Photo: ${filename || "Photo.jpg"} | ${effectiveUrl}${finalMessage ? `\n\n${finalMessage}` : ""}`;
      }
    }

    if (!finalMessage) {
      return { success: false, error: "Message content or document is required" };
    }

    // 1. Check if Meta Cloud API is configured to dispatch real message
    const config = await getWhatsAppApiConfig();
    let metaDelivered = false;
    let metaError: string | null = null;

    if (config.isConnected && config.phoneNumberId && config.accessToken) {
      try {
        let payload: any = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
        };

        if (mediaType === "document") {
          payload.type = "document";
          if (mediaId) {
            payload.document = {
              id: mediaId,
              caption: message.trim() || undefined,
              filename: filename || "Document.pdf"
            };
          } else if (mediaUrl) {
            payload.document = {
              link: mediaUrl.startsWith("http") ? mediaUrl : `${process.env.NEXTAUTH_URL || ""}${mediaUrl}`,
              caption: message.trim() || undefined,
              filename: filename || "Document.pdf"
            };
          }
        } else if (mediaType === "image") {
          payload.type = "image";
          if (mediaId) {
            payload.image = {
              id: mediaId,
              caption: message.trim() || undefined
            };
          } else if (mediaUrl) {
            payload.image = {
              link: mediaUrl.startsWith("http") ? mediaUrl : `${process.env.NEXTAUTH_URL || ""}${mediaUrl}`,
              caption: message.trim() || undefined
            };
          }
        } else {
          payload.type = "text";
          payload.text = { body: finalMessage };
        }

        const metaRes = await fetch(`https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const metaData = await metaRes.json();
        if (metaData?.messages?.[0]?.id) {
          metaDelivered = true;
        } else if (metaData?.error) {
          console.warn("Meta Cloud API warning:", metaData.error.message);
          const isAuthErr = metaData.error.code === 190 || metaData.error.type === "OAuthException" || (metaData.error.message || "").includes("expired");
          metaError = isAuthErr
            ? "Meta Access Token has expired (Authentication Error). Please update it in 'Connect API'."
            : metaData.error.message;
        }
      } catch (metaErr: any) {
        console.error("Meta dispatch error:", metaErr);
        metaError = metaErr.message;
      }
    } else {
      metaError = "WhatsApp Cloud API is not configured or access token is missing.";
    }

    // 2. Persist in database
    const log = await prisma.whatsAppLog.create({
      data: {
        leadId,
        direction: "OUTBOUND",
        message: finalMessage,
        status: metaError ? "FAILED" : (metaDelivered ? "DELIVERED" : "SENT")
      }
    });

    // 3. If an attachment was sent, also save to lead's file attachments
    if (mediaUrl && filename) {
      const user = await getCurrentUser();
      if (user?.id) {
        await prisma.fileAttachment.create({
          data: {
            leadId,
            userId: user.id,
            name: filename,
            url: mediaUrl,
            type: mediaType || "document"
          }
        }).catch(() => {});
      }
    }

    if (metaError) {
      return { success: false, log, metaDelivered: false, error: metaError };
    }

    return { success: true, log, metaDelivered };
  } catch (err: any) {
    console.error("Failed to send WhatsApp message:", err);
    return { success: false, error: err.message || "Failed to send message" };
  }
}

/**
 * Simulate an inbound WhatsApp message or client document (for local testing)
 */
export async function simulateIncomingWhatsAppAction(params: {
  leadId: string;
  message: string;
  mediaUrl?: string;
  mediaType?: "document" | "image";
  filename?: string;
}): Promise<{ success: boolean; log?: any; error?: string }> {
  try {
    const { leadId, message, mediaUrl, mediaType, filename } = params;

    let finalMessage = message.trim();
    if (mediaUrl) {
      if (mediaType === "document") {
        finalMessage = `📄 Document: ${filename || "Client_FloorPlan.pdf"} | ${mediaUrl}${finalMessage ? `\n\n${finalMessage}` : ""}`;
      } else if (mediaType === "image") {
        finalMessage = `📷 Photo: ${filename || "Site_Reference.jpg"} | ${mediaUrl}${finalMessage ? `\n\n${finalMessage}` : ""}`;
      }
    }

    if (!finalMessage) {
      return { success: false, error: "Message or media content is required." };
    }

    const log = await prisma.whatsAppLog.create({
      data: {
        leadId,
        direction: "INBOUND",
        message: finalMessage,
        status: "DELIVERED"
      }
    });

    return { success: true, log };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Clear all WhatsApp conversation messages for a specific lead
 */
export async function clearLeadWhatsAppChatAction(
  leadId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const res = await prisma.whatsAppLog.deleteMany({
      where: { leadId }
    });

    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/whatsapp");

    return { success: true, count: res.count };
  } catch (err: any) {
    console.error("Failed to clear WhatsApp chat:", err);
    return { success: false, error: err.message || "Failed to clear chat." };
  }
}

/**
 * Clear all WhatsApp logs across all leads (admin reset)
 */
export async function clearAllWhatsAppLogsAction(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) {
      return { success: false, error: "Unauthorized. Admin permissions required." };
    }

    const res = await prisma.whatsAppLog.deleteMany({});
    revalidatePath("/whatsapp");
    revalidatePath("/leads");

    return { success: true, count: res.count };
  } catch (err: any) {
    console.error("Failed to clear all WhatsApp logs:", err);
    return { success: false, error: err.message || "Failed to clear all logs." };
  }
}
