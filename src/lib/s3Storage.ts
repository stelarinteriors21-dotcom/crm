import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION || "ap-south-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";
export const bucketName = process.env.AWS_S3_BUCKET_NAME || "stelar-crm-recordings-tvm";

export const isAwsConfigured = Boolean(accessKeyId && secretAccessKey && bucketName);

export function getS3Client(): S3Client {
  return new S3Client({
    region,
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

const AUDIO_EXT_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  amr: "audio/amr",
  "3gp": "audio/3gpp",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
};

/**
 * Extracts a safe lowercase extension and MIME type from an audio filename.
 */
export function resolveAudioFileMeta(filename?: string | null): { ext: string; contentType: string } {
  const match = (filename || "").trim().match(/\.([a-zA-Z0-9]+)$/);
  const candidateExt = match ? match[1].toLowerCase() : "mp3";
  const ext = AUDIO_EXT_MIME[candidateExt] ? candidateExt : "mp3";
  return {
    ext,
    contentType: AUDIO_EXT_MIME[ext] || "audio/mpeg",
  };
}

/**
 * Uploads a file buffer directly to AWS S3.
 */
export async function uploadBufferToS3(key: string, buffer: Buffer, contentType: string = "audio/mpeg"): Promise<{ success: boolean; url: string; error?: string }> {
  try {
    const s3 = getS3Client();
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType
    }));

    // Use permanent, non-expiring proxy streaming URL
    return {
      success: true,
      url: `/api/media?key=${encodeURIComponent(key)}`
    };
  } catch (err: any) {
    console.error("AWS S3 uploadBufferToS3 error:", err);
    return {
      success: false,
      url: "",
      error: err.message || "Failed to upload to S3"
    };
  }
}

/**
 * Generates a signed PUT URL for direct browser uploads to S3.
 */
export async function getS3PresignedUploadUrl(key: string, contentType: string = "audio/mpeg"): Promise<{ success: boolean; signedUrl: string; publicUrl: string; error?: string }> {
  try {
    const s3 = getS3Client();
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType
    });

    const signedUrl = await getSignedUrl(s3, putCommand, { expiresIn: 3600 });

    return {
      success: true,
      signedUrl,
      publicUrl: `/api/media?key=${encodeURIComponent(key)}`
    };
  } catch (err: any) {
    console.error("AWS S3 getS3PresignedUploadUrl error:", err);
    return {
      success: false,
      signedUrl: "",
      publicUrl: "",
      error: err.message || "Failed to generate S3 upload URL"
    };
  }
}
