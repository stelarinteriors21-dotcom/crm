import { NextRequest, NextResponse } from "next/server";
import { getS3Client, isAwsConfigured, bucketName, resolveAudioFileMeta } from "@/lib/s3Storage";
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
    const rangeHeader = req.headers.get("range");
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
      ...(rangeHeader ? { Range: rangeHeader } : {})
    });

    const response = await s3.send(command);
    if (!response.Body) {
      return new NextResponse("File body is empty", { status: 404 });
    }

    // Determine content type from key extension
    const lowerKey = cleanKey.toLowerCase();
    let contentType = response.ContentType || "application/octet-stream";
    if (lowerKey.endsWith(".jpg") || lowerKey.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (lowerKey.endsWith(".png")) contentType = "image/png";
    else if (lowerKey.endsWith(".webp")) contentType = "image/webp";
    else if (/\.(mp3|m4a|mp4|aac|amr|3gp|ogg|opus|wav)$/.test(lowerKey)) {
      contentType = resolveAudioFileMeta(lowerKey).contentType;
    }

    // Transform AWS body stream to web stream
    const bodyStream = (response.Body as any).transformToWebStream
      ? (response.Body as any).transformToWebStream()
      : (response.Body as any);

    const isPartial = Boolean(rangeHeader && response.ContentRange);
    return new NextResponse(bodyStream, {
      status: isPartial ? 206 : 200,
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(response.ContentRange ? { "Content-Range": response.ContentRange } : {}),
        ...(response.ContentLength !== undefined ? { "Content-Length": String(response.ContentLength) } : {})
      }
    });
  } catch (err: any) {
    if (err?.name === "InvalidRange" || err?.$metadata?.httpStatusCode === 416) {
      return new NextResponse("Requested range not satisfiable", { status: 416 });
    }
    console.error("Error streaming media from S3:", err?.message || err);
    return new NextResponse("Media file not found or inaccessible", { status: 404 });
  }
}
