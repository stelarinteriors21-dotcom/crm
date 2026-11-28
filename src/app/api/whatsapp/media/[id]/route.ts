import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mediaId = params.id;
    if (!mediaId) {
      return new NextResponse("Missing media ID", { status: 400 });
    }

    const org = await prisma.organization.findFirst({ select: { customFieldLabels: true } });
    const config = (org?.customFieldLabels as any)?.whatsAppApiConfig;
    const accessToken = config?.accessToken;

    if (!accessToken) {
      return new NextResponse("WhatsApp API not configured", { status: 503 });
    }

    // 1. Get media URL and metadata from Meta Graph API
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
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
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!mediaBinaryRes.ok) {
      console.warn("Failed to download media binary from:", metaData.url);
      return new NextResponse("Failed to download media", { status: mediaBinaryRes.status });
    }

    const contentType = metaData.mime_type || mediaBinaryRes.headers.get("content-type") || "application/octet-stream";
    const body = mediaBinaryRes.body;

    const isDownload = req.nextUrl.searchParams.get("download") === "1";
    let defaultFilename = "WhatsApp_Media";
    if (contentType.includes("pdf")) {
      defaultFilename = "Document.pdf";
    } else if (contentType.includes("image")) {
      defaultFilename = "WhatsApp_Photo.jpg";
    } else if (contentType.includes("audio")) {
      defaultFilename = "Voice_Note.ogg";
    }
    const filename = req.nextUrl.searchParams.get("filename") || defaultFilename;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Disposition": isDownload ? `attachment; filename="${filename}"` : "inline"
      }
    });
  } catch (err: any) {
    console.error("WhatsApp Media Proxy Error:", err);
    return new NextResponse(err.message || "Internal Server Error", { status: 500 });
  }
}
