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

    // Fetch leads with their phone numbers & recent WhatsApp messages
    const leads = await prisma.lead.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        phone: { not: "" }
      },
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

    return leads.map((l) => {
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
  } catch (err) {
    console.error("Failed to get WhatsApp conversations:", err);
    return [];
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
  mediaType?: "document" | "image" | "audio";
  filename?: string;
}): Promise<{ success: boolean; log?: any; metaDelivered?: boolean; error?: string }> {
  try {
    const { leadId, phone, message, mediaUrl, mediaType, filename } = params;
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    let finalMessage = message.trim();
    if (mediaUrl) {
      if (mediaType === "document") {
        finalMessage = `📄 Document: ${filename || "Document.pdf"} | ${mediaUrl}${finalMessage ? `\n\n${finalMessage}` : ""}`;
      } else if (mediaType === "image") {
        finalMessage = `📷 Photo: ${filename || "Photo.jpg"} | ${mediaUrl}${finalMessage ? `\n\n${finalMessage}` : ""}`;
      }
    }

    if (!finalMessage) {
      return { success: false, error: "Message content or document is required" };
    }

    // 1. Check if Meta Cloud API is configured to dispatch real message
    const config = await getWhatsAppApiConfig();
    let metaDelivered = false;

    if (config.isConnected && config.phoneNumberId && config.accessToken) {
      try {
        let payload: any = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
        };

        if (mediaUrl && mediaType === "document") {
          payload.type = "document";
          payload.document = {
            link: mediaUrl.startsWith("http") ? mediaUrl : `${process.env.NEXTAUTH_URL || ""}${mediaUrl}`,
            caption: message.trim() || undefined,
            filename: filename || "Document.pdf"
          };
        } else if (mediaUrl && mediaType === "image") {
          payload.type = "image";
          payload.image = {
            link: mediaUrl.startsWith("http") ? mediaUrl : `${process.env.NEXTAUTH_URL || ""}${mediaUrl}`,
            caption: message.trim() || undefined
          };
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
        }
      } catch (metaErr) {
        console.error("Meta dispatch error:", metaErr);
      }
    }

    // 2. Persist in database
    const log = await prisma.whatsAppLog.create({
      data: {
        leadId,
        direction: "OUTBOUND",
        message: finalMessage,
        status: metaDelivered ? "DELIVERED" : "SENT"
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
