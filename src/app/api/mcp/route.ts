import { NextRequest, NextResponse } from "next/server";
import {
  getLeadContextTool,
  generateMorningWhatsAppPitchTool,
  recordWhatsAppDispatchTool,
  listPendingMorningTouchpointsTool,
} from "@/mcp/stelarMcpServer";

// Expose standard MCP (Model Context Protocol) JSON-RPC 2.0 endpoints
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, method, params } = body;

    // Handle MCP protocol method: tools/list
    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "get_lead_context",
              description: "Reads complete context for a lead: customer details, call notes, recordings, general notes, site visit records, and budget.",
              inputSchema: {
                type: "object",
                properties: {
                  leadId: { type: "string", description: "The ID of the lead" },
                },
                required: ["leadId"],
              },
            },
            {
              name: "generate_morning_whatsapp_pitch",
              description: "Autonomously synthesizes a personalized WhatsApp pitch and wa.me deep-link for a lead based on past calls, notes, and site visit state.",
              inputSchema: {
                type: "object",
                properties: {
                  leadId: { type: "string", description: "The ID of the lead" },
                  tone: {
                    type: "string",
                    enum: ["consultative", "urgent", "site_visit", "catalog"],
                    description: "Tone or focus of the message",
                  },
                },
                required: ["leadId"],
              },
            },
            {
              name: "record_whatsapp_dispatch",
              description: "Records an outbound WhatsApp dispatch log in the database, verifying the employee sent the message.",
              inputSchema: {
                type: "object",
                properties: {
                  leadId: { type: "string", description: "The ID of the lead" },
                  message: { type: "string", description: "The message text dispatched" },
                  userId: { type: "string", description: "Optional user ID of the caller" },
                },
                required: ["leadId", "message"],
              },
            },
            {
              name: "list_pending_morning_touchpoints",
              description: "Lists all active leads in the organization that have not received an AI morning touchpoint today.",
              inputSchema: {
                type: "object",
                properties: {
                  organizationId: { type: "string", description: "Organization ID" },
                  assignedToId: { type: "string", description: "Optional filter for specific caller" },
                },
                required: ["organizationId"],
              },
            },
          ],
        },
      });
    }

    // Handle MCP protocol method: tools/call
    if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};

      let result: any;
      if (toolName === "get_lead_context") {
        result = await getLeadContextTool(args.leadId);
      } else if (toolName === "generate_morning_whatsapp_pitch") {
        result = await generateMorningWhatsAppPitchTool({
          leadId: args.leadId,
          tone: args.tone,
        });
      } else if (toolName === "record_whatsapp_dispatch") {
        result = await recordWhatsAppDispatchTool({
          leadId: args.leadId,
          message: args.message,
          userId: args.userId,
        });
      } else if (toolName === "list_pending_morning_touchpoints") {
        result = await listPendingMorningTouchpointsTool(
          args.organizationId,
          args.assignedToId
        );
      } else {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Tool "${toolName}" not found` },
        });
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structured: result,
        },
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method "${method}" not recognized` },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Stelar CRM Model Context Protocol (MCP) Server",
    version: "1.0.0",
    protocol: "JSON-RPC 2.0",
    description: "Autonomous AI engine reading lead notes, recording transcripts, and generating WhatsApp links.",
    status: "online",
  });
}
