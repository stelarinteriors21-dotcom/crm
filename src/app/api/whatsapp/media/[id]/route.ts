import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppApiConfig } from "@/app/actions/whatsAppActions";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mediaId = params.id;
    if (!mediaId) {
      return new NextResponse("Missing media ID", { status: 400 });
    }

    const config = await getWhatsAppApiConfig();
    if (!config.accessToken) {
      return new NextResponse("WhatsApp API not configured", { status: 503 });
    }

    // 1. Get media URL and metadata from Meta Graph API
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`
      }
    });

    const metaData = await metaRes.json();
    if (!metaData?.url) {
      console.warn("Media metadata not found for ID:", mediaId, metaData);
      return new NextResponse("Media not found on Meta servers", { status: 404 });
    }

    // 2. Stream the raw media binary with Bearer authorization
    const mediaBinaryRes = await fetch(metaData.url, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`
      }
    });

    if (!mediaBinaryRes.ok) {
      console.warn("Failed to download media binary from:", metaData.url);
      return new NextResponse("Failed to download media", { status: mediaBinaryRes.status });
    }

    const contentType = metaData.mime_type || mediaBinaryRes.headers.get("content-type") || "application/octet-stream";
    const body = mediaBinaryRes.body;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Disposition": "inline"
      }
    });
  } catch (err: any) {
    console.error("WhatsApp Media Proxy Error:", err);
    return new NextResponse(err.message || "Internal Server Error", { status: 500 });
  }
}
