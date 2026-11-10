import { NextResponse } from "next/server";
import { isAwsConfigured, getS3PresignedUploadUrl } from "@/lib/s3Storage";
import { MOBILE_CORS_HEADERS, resolveCallLeadAndStoragePath } from "@/lib/callLogHelpers";

export async function POST(request: Request) {
  try {
    if (!isAwsConfigured) {
      return NextResponse.json(
        { success: false, error: "AWS S3 storage is not configured" },
        { status: 503, headers: MOBILE_CORS_HEADERS }
      );
    }

    const body = await request.json();
    const resolved = await resolveCallLeadAndStoragePath({
      leadIdFromForm: body.leadId,
      phone: body.phone,
      userId: body.userId,
      fileName: body.fileName,
    });

    if (!resolved.ok) {
      return new NextResponse(resolved.error, { status: resolved.status, headers: MOBILE_CORS_HEADERS });
    }

    const s3Res = await getS3PresignedUploadUrl(resolved.s3Key, resolved.contentType);
    if (!s3Res.success || !s3Res.signedUrl) {
      return NextResponse.json(
        { success: false, error: s3Res.error || "Failed to generate S3 upload URL" },
        { status: 500, headers: MOBILE_CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        leadId: resolved.leadId,
        userId: resolved.finalUserId,
        signedUrl: s3Res.signedUrl,
        publicUrl: s3Res.publicUrl,
        contentType: resolved.contentType,
      },
      { headers: MOBILE_CORS_HEADERS }
    );
  } catch (error: any) {
    console.error("Error generating mobile presigned URL:", error);
    return new NextResponse("Internal Server Error", { status: 500, headers: MOBILE_CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: MOBILE_CORS_HEADERS });
}
