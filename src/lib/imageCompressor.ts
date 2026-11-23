/**
 * Client-Side Image Compressor for Site Visit Photos & Attachments
 * 
 * Compresses large mobile phone camera photos (typically 5MB - 12MB)
 * down to ~80KB - 160KB while maintaining crisp, high-definition visual clarity
 * for room inspections, measurements, and site documentation.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default: 0.75)
  format?: "image/jpeg" | "image/webp";
}

export interface CompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  width: number;
  height: number;
  format: string;
}

export interface AdaptiveImageResult extends CompressionResult {
  file: File;
  blob: Blob;
  tier: "slight" | "moderate" | "strong" | "aggressive" | "kept-original";
}

/**
 * Format bytes into human-readable string (KB, MB)
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Compresses an image file client-side using HTML5 Canvas.
 */
export async function compressImage(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.74,
    format = "image/jpeg"
  } = options;

  return new Promise((resolve, reject) => {
    // Check if the environment supports FileReader / Image
    if (typeof window === "undefined") {
      return reject(new Error("Image compression is only available in the browser"));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image element"));

      img.onload = () => {
        try {
          let { width, height } = img;

          // Calculate new dimensions preserving aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Create offscreen canvas
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return reject(new Error("Failed to get canvas 2d context"));
          }

          // Apply high-quality smoothing for sharp details
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL(format, quality);

          // Calculate compressed size from Base64
          const base64Content = dataUrl.split(",")[1] || "";
          const compressedSize = Math.round((base64Content.length * 3) / 4);
          const originalSize = file.size;
          const savingsPercent = originalSize > 0 
            ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
            : 0;

          resolve({
            dataUrl,
            originalSize,
            compressedSize,
            savingsPercent,
            width,
            height,
            format
          });
        } catch (err) {
          reject(err);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header?.match(/data:([^;]+);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binStr = atob(base64 || "");
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Adaptive tiered image compression:
 * - Small images (<= 250 KB): slight gentle optimization
 * - Medium images (250 KB - 1.5 MB): balanced compression
 * - Large images (1.5 MB - 5 MB): strong compression
 * - Huge images (> 5 MB): aggressive compression + iterative step-down under maxBytes
 */
export async function compressImageAdaptive(
  inputFile: File,
  maxBytes: number = 400 * 1024
): Promise<AdaptiveImageResult> {
  const origSize = inputFile.size;
  const baseName = inputFile.name.replace(/\.[^.]+$/, "") || "image";

  let tier: AdaptiveImageResult["tier"] = "slight";
  let steps: Array<{ maxDim: number; quality: number }> = [];

  if (origSize <= 250 * 1024) {
    tier = "slight";
    steps = [{ maxDim: 1600, quality: 0.88 }];
  } else if (origSize <= 1.5 * 1024 * 1024) {
    tier = "moderate";
    steps = [
      { maxDim: 1440, quality: 0.78 },
      { maxDim: 1200, quality: 0.65 },
      { maxDim: 960, quality: 0.55 },
    ];
  } else if (origSize <= 5 * 1024 * 1024) {
    tier = "strong";
    steps = [
      { maxDim: 1280, quality: 0.68 },
      { maxDim: 1080, quality: 0.55 },
      { maxDim: 900, quality: 0.44 },
    ];
  } else {
    tier = "aggressive";
    steps = [
      { maxDim: 1120, quality: 0.58 },
      { maxDim: 960, quality: 0.46 },
      { maxDim: 800, quality: 0.36 },
      { maxDim: 680, quality: 0.28 },
    ];
  }

  let bestResult: CompressionResult | null = null;
  for (const step of steps) {
    const res = await compressImage(inputFile, {
      maxWidth: step.maxDim,
      maxHeight: step.maxDim,
      quality: step.quality,
      format: "image/jpeg",
    });
    bestResult = res;
    if (res.compressedSize <= maxBytes) {
      break;
    }
  }

  if (!bestResult || (bestResult.compressedSize >= origSize && origSize <= maxBytes)) {
    const origUrl = await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => resolve("");
      fr.readAsDataURL(inputFile);
    });
    return {
      file: inputFile,
      blob: inputFile,
      dataUrl: origUrl,
      originalSize: origSize,
      compressedSize: origSize,
      savingsPercent: 0,
      width: bestResult?.width || 0,
      height: bestResult?.height || 0,
      format: inputFile.type || "image/jpeg",
      tier: "kept-original",
    };
  }

  const blob = dataUrlToBlob(bestResult.dataUrl);
  const outFile = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });

  return {
    ...bestResult,
    file: outFile,
    blob,
    compressedSize: outFile.size,
    savingsPercent: origSize > 0 ? Math.max(0, Math.round(((origSize - outFile.size) / origSize) * 100)) : 0,
    tier,
  };
}
