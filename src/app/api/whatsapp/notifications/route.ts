import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/authActions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get("since");
    const leadIdParam = searchParams.get("leadId");

    const user = await getCurrentUser();
    const orgId = user?.organizationId;

    // Filter leads belonging to organization if scoped
    const leadScope = orgId ? { organizationId: orgId } : {};

    // 1. Total unread inbound messages
    const unreadCount = await prisma.whatsAppLog.count({
      where: {
        direction: "INBOUND",
        status: { not: "READ" },
        lead: leadScope
      }
    });

    // 2. Query recent inbound messages
    let whereClause: any = {
      direction: "INBOUND",
      lead: leadScope
    };

    if (leadIdParam) {
      whereClause.leadId = leadIdParam;
    }

    if (sinceParam) {
      const sinceDate = new Date(sinceParam);
      if (!isNaN(sinceDate.getTime())) {
        whereClause.createdAt = { gt: sinceDate };
      }
    } else {
      // Default: only fetch very recent messages (last 20 seconds)
      whereClause.createdAt = { gt: new Date(Date.now() - 20000) };
    }

    const newMessages = await prisma.whatsAppLog.findMany({
      where: whereClause,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            scoreSiteVisit: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 15
    });

    const formattedMessages = newMessages.map((m) => ({
      id: m.id,
      leadId: m.leadId,
      senderName: m.lead?.name || "WhatsApp Contact",
      senderPhone: m.lead?.phone || "",
      message: m.message,
      status: m.status,
      direction: m.direction,
      createdAt: m.createdAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      unreadCount,
      messages: formattedMessages,
      serverTime: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[WhatsApp Notifications API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, leadId, messageId } = body;

    if (action === "mark_read" && leadId) {
      const updated = await prisma.whatsAppLog.updateMany({
        where: {
          leadId,
          direction: "INBOUND",
          status: { not: "READ" }
        },
        data: {
          status: "READ"
        }
      });

      return NextResponse.json({
        success: true,
        updatedCount: updated.count
      });
    }

    if (action === "mark_read_single" && messageId) {
      const updated = await prisma.whatsAppLog.update({
        where: { id: messageId },
        data: { status: "READ" }
      });

      return NextResponse.json({
        success: true,
        updated
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[WhatsApp Mark Read Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update status" },
      { status: 500 }
    );
  }
}
