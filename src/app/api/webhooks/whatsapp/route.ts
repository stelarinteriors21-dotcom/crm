import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getWhatsAppApiConfig } from "@/app/actions/whatsAppActions";

/**
 * Meta WhatsApp Webhook Verification (GET)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const config = await getWhatsAppApiConfig();
  const expectedToken = config.verifyToken || "stelar_whatsapp_secure_2026";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[WhatsApp Webhook] Verification Successful!");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Meta WhatsApp Incoming Messages Webhook (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object === "whatsapp_business_account" && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          const value = change?.value;
          const messages = value?.messages;
          const contact = value?.contacts?.[0];

          if (Array.isArray(messages)) {
            for (const message of messages) {
              const fromPhone = message.from; // e.g. "919876543210"
              const contactName = contact?.profile?.name || "WhatsApp Client";
              const messageType = message.type; // text, document, image, audio

              let messageText = "";

              if (messageType === "text") {
                messageText = message.text?.body || "";
              } else if (messageType === "document") {
                const doc = message.document;
                messageText = `📄 Document: ${doc?.filename || "Client_Document.pdf"} | /api/whatsapp/media/${doc?.id}${doc?.caption ? `\n${doc.caption}` : ""}`;
              } else if (messageType === "image") {
                const img = message.image;
                messageText = `📷 Photo: Image Attachment | /api/whatsapp/media/${img?.id}${img?.caption ? `\n${img.caption}` : ""}`;
              } else if (messageType === "audio") {
                messageText = `🎙️ Voice Note: Audio Message | /api/whatsapp/media/${message.audio?.id}`;
              }

              if (messageText && fromPhone) {
                const corePhone = fromPhone.slice(-10);

                // Find lead with matching phone number
                let lead = await prisma.lead.findFirst({
                  where: {
                    phone: { contains: corePhone }
                  }
                });

                // If no existing lead found, auto-create a lead for the incoming WhatsApp contact
                if (!lead) {
                  // Find default organization
                  const org = await prisma.organization.findFirst();
                  if (org) {
                    lead = await prisma.lead.create({
                      data: {
                        name: contactName,
                        phone: fromPhone,
                        source: "WhatsApp",
                        organizationId: org.id,
                        status: "FRESH",
                        customFields: {
                          source: "WhatsApp Incoming",
                          createdVia: "WhatsApp Cloud API"
                        }
                      }
                    });
                  }
                }

                if (lead) {
                  await prisma.whatsAppLog.create({
                    data: {
                      leadId: lead.id,
                      direction: "INBOUND",
                      message: messageText,
                      status: "DELIVERED"
                    }
                  });

                  console.log(`[WhatsApp Webhook] Logged incoming message for ${lead.name} (${fromPhone}): ${messageText.slice(0, 40)}`);
                }
              }
            }
          }

          // Handle message delivery & read status updates (Blue Ticks)
          const statuses = value?.statuses;
          if (statuses && Array.isArray(statuses)) {
            for (const st of statuses) {
              const rawStatus = (st.status || "").toUpperCase(); // "SENT", "DELIVERED", "READ", "FAILED"
              const recipientPhone = st.recipient_id || "";
              const corePhone = recipientPhone.slice(-10);

              if (corePhone && (rawStatus === "READ" || rawStatus === "DELIVERED" || rawStatus === "FAILED" || rawStatus === "SENT")) {
                const lead = await prisma.lead.findFirst({
                  where: { phone: { contains: corePhone } },
                  select: { id: true }
                });

                if (lead) {
                  const latestOutbound = await prisma.whatsAppLog.findFirst({
                    where: {
                      leadId: lead.id,
                      direction: "OUTBOUND"
                    },
                    orderBy: { createdAt: "desc" }
                  });

                  if (latestOutbound) {
                    // Never downgrade READ to DELIVERED or SENT
                    if (latestOutbound.status === "READ" && (rawStatus === "DELIVERED" || rawStatus === "SENT")) {
                      continue;
                    }
                    if (latestOutbound.status === "DELIVERED" && rawStatus === "SENT") {
                      continue;
                    }
                    await prisma.whatsAppLog.update({
                      where: { id: latestOutbound.id },
                      data: { status: rawStatus }
                    });
                    console.log(`[WhatsApp Webhook Status] Lead ${lead.id} message updated to: ${rawStatus}`);
                  }
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (err: any) {
    console.error("[WhatsApp Webhook] Error processing event:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
