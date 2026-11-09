import { NextRequest, NextResponse } from "next/server";
import { getS3Client, isAwsConfigured, bucketName } from "@/lib/s3Storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");

  if (!key) {
    return new NextResponse("Missing storage key parameter", { status: 400 });
  }

  // Sanitize key - only allow expected safe directories
  const cleanKey = decodeURIComponent(key).replace(/^\/+/, "");
  const allowedPrefixes = ["site-visits/", "recordings/", "uploads/", "attachments/"];
  const isAllowed = allowedPrefixes.some((p) => cleanKey.startsWith(p));

  if (!isAllowed) {
    return new NextResponse("Forbidden storage path", { status: 403 });
  }

  if (!isAwsConfigured) {
    return new NextResponse("AWS S3 storage is not configured", { status: 503 });
  }

  try {
    const s3 = getS3Client();
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cleanKey
    });

    const response = await s3.send(command);
    if (!response.Body) {
      return new NextResponse("File body is empty", { status: 404 });
    }

    // Determine content type
    let contentType = response.ContentType || "application/octet-stream";
    if (cleanKey.endsWith(".jpg") || cleanKey.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (cleanKey.endsWith(".png")) contentType = "image/png";
    else if (cleanKey.endsWith(".webp")) contentType = "image/webp";
    else if (cleanKey.endsWith(".mp3")) contentType = "audio/mpeg";

    // Transform AWS body stream to web stream
    const bodyStream = (response.Body as any).transformToWebStream
      ? (response.Body as any).transformToWebStream()
      : (response.Body as any);

    return new NextResponse(bodyStream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(response.ContentLength ? { "Content-Length": String(response.ContentLength) } : {})
      }
    });
  } catch (err: any) {
    console.error("Error streaming media from S3:", err?.message || err);
    return new NextResponse("Media file not found or inaccessible", { status: 404 });
  }
}
