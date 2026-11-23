/**
 * Unified Adaptive File Compressor (Images, PDFs, Audio, Documents)
 *
 * Adapts compression strength to file size:
 * - Small files: light optimization preserving full sharpness / vector quality
 * - Medium files: balanced compression
 * - Large / oversized files: aggressive compression stepping down until strictly under maxBytes
 */

import { compressImageAdaptive, formatBytes } from "./imageCompressor";
import { compressAudioAdaptive } from "./audioCompressor";

export interface CompressedFileOutput {
  file: File;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  category: "image" | "pdf" | "audio" | "other";
  tier: string;
}

export interface FileCompressionLimits {
  maxImageBytes?: number; // Default 400 KB
  maxPdfBytes?: number;   // Default 1.8 MB
  maxAudioBytes?: number; // Default 3.5 MB
  maxOtherBytes?: number; // Default 5 MB
}

function uint8ToPdfBlob(bytes: Uint8Array): Blob {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "application/pdf" });
}

async function optimizePdfLossless(inputBytes: ArrayBuffer): Promise<Uint8Array | null> {
  try {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
    doc.setTitle("");
    doc.setProducer("Stelar CRM");
    return await doc.save({ useObjectStreams: true, addDefaultPage: false });
  } catch {
    return null;
  }
}

async function rasterCompressPdf(
  inputBytes: ArrayBuffer,
  scale: number,
  jpegQuality: number
): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const { jsPDF } = await import("jspdf");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(inputBytes.slice(0)) });
  const pdf = await loadingTask.promise;

  let outDoc: InstanceType<typeof jsPDF> | null = null;
  const maxPages = Math.min(pdf.numPages, 40);

  try {
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable for PDF compression");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      const imgData = canvas.toDataURL("image/jpeg", jpegQuality);

      // Keep original aspect ratio in points
      const unscaled = page.getViewport({ scale: 1 });
      const orientation = unscaled.width > unscaled.height ? "l" : "p";

      if (!outDoc) {
        outDoc = new jsPDF({
          orientation,
          unit: "pt",
          format: [unscaled.width, unscaled.height],
          compress: true,
        });
      } else {
        outDoc.addPage([unscaled.width, unscaled.height], orientation);
      }

      outDoc.addImage(imgData, "JPEG", 0, 0, unscaled.width, unscaled.height, undefined, "FAST");
      page.cleanup();
    }
  } finally {
    try {
      await pdf.destroy();
    } catch {}
  }

  if (!outDoc) {
    throw new Error("PDF has no readable pages");
  }

  return outDoc.output("blob");
}

async function compressPdfAdaptive(
  inputFile: File,
  maxBytes: number
): Promise<CompressedFileOutput> {
  const origSize = inputFile.size;
  const arrBuf = await inputFile.arrayBuffer();

  // 1. Small files (<= 600 KB): light lossless structure compression only
  if (origSize <= 600 * 1024) {
    const lossless = await optimizePdfLossless(arrBuf);
    if (lossless && lossless.byteLength < origSize) {
      const outFile = new File([uint8ToPdfBlob(lossless)], inputFile.name, { type: "application/pdf" });
      return {
        file: outFile,
        originalSize: origSize,
        compressedSize: outFile.size,
        savingsPercent: Math.round(((origSize - outFile.size) / origSize) * 100),
        category: "pdf",
        tier: "slight",
      };
    }
    return {
      file: inputFile,
      originalSize: origSize,
      compressedSize: origSize,
      savingsPercent: 0,
      category: "pdf",
      tier: "kept-original",
    };
  }

  // 2. Try lossless pass first — often shrinks exported CAD/PDF documents cleanly
  const lossless = await optimizePdfLossless(arrBuf);
  if (lossless && lossless.byteLength <= Math.min(maxBytes * 0.75, origSize * 0.75)) {
    const outFile = new File([uint8ToPdfBlob(lossless)], inputFile.name, { type: "application/pdf" });
    return {
      file: outFile,
      originalSize: origSize,
      compressedSize: outFile.size,
      savingsPercent: Math.round(((origSize - outFile.size) / origSize) * 100),
      category: "pdf",
      tier: "moderate",
    };
  }

  // 3. Adaptive raster recompression for heavy image-laden PDFs (floor plans, scanned quotes)
  const steps =
    origSize <= 2 * 1024 * 1024
      ? [
          { scale: 1.35, quality: 0.74, tier: "moderate" },
          { scale: 1.15, quality: 0.62, tier: "strong" },
          { scale: 0.95, quality: 0.50, tier: "aggressive" },
        ]
      : [
          { scale: 1.15, quality: 0.64, tier: "strong" },
          { scale: 0.95, quality: 0.52, tier: "aggressive" },
          { scale: 0.80, quality: 0.42, tier: "aggressive" },
        ];

  let bestBlob: Blob | null = null;
  let usedTier = "strong";

  for (const step of steps) {
    try {
      const candidate = await rasterCompressPdf(arrBuf, step.scale, step.quality);
      if (!bestBlob || candidate.size < bestBlob.size) {
        bestBlob = candidate;
        usedTier = step.tier;
      }
      if (candidate.size <= maxBytes) {
        break;
      }
    } catch (e) {
      console.warn("PDF page raster compression fallback:", e);
      break;
    }
  }

  if (bestBlob && bestBlob.size < origSize) {
    const outFile = new File([bestBlob], inputFile.name, { type: "application/pdf" });
    return {
      file: outFile,
      originalSize: origSize,
      compressedSize: outFile.size,
      savingsPercent: Math.max(0, Math.round(((origSize - outFile.size) / origSize) * 100)),
      category: "pdf",
      tier: usedTier,
    };
  }

  if (lossless && lossless.byteLength < origSize) {
    const outFile = new File([uint8ToPdfBlob(lossless)], inputFile.name, { type: "application/pdf" });
    return {
      file: outFile,
      originalSize: origSize,
      compressedSize: outFile.size,
      savingsPercent: Math.round(((origSize - outFile.size) / origSize) * 100),
      category: "pdf",
      tier: "slight",
    };
  }

  if (origSize > maxBytes) {
    throw new Error(`PDF (${formatBytes(origSize)}) could not be compressed below ${formatBytes(maxBytes)}.`);
  }

  return {
    file: inputFile,
    originalSize: origSize,
    compressedSize: origSize,
    savingsPercent: 0,
    category: "pdf",
    tier: "kept-original",
  };
}

export async function compressFileForUpload(
  file: File,
  limits: FileCompressionLimits = {}
): Promise<CompressedFileOutput> {
  const {
    maxImageBytes = 400 * 1024,
    maxPdfBytes = 1.8 * 1024 * 1024,
    maxAudioBytes = 3.5 * 1024 * 1024,
    maxOtherBytes = 5 * 1024 * 1024,
  } = limits;

  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  // 1. Images
  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|bmp|heic)$/i.test(name)) {
    const res = await compressImageAdaptive(file, maxImageBytes);
    return {
      file: res.file,
      originalSize: res.originalSize,
      compressedSize: res.compressedSize,
      savingsPercent: res.savingsPercent,
      category: "image",
      tier: res.tier,
    };
  }

  // 2. Audio
  if (mime.startsWith("audio/") || /\.(mp3|m4a|mp4|aac|amr|3gp|ogg|opus|wav|webm)$/i.test(name)) {
    const res = await compressAudioAdaptive(file, maxAudioBytes);
    return {
      file: res.file,
      originalSize: res.originalSize,
      compressedSize: res.compressedSize,
      savingsPercent: res.savingsPercent,
      category: "audio",
      tier: res.tier,
    };
  }

  // 3. PDFs
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return await compressPdfAdaptive(file, maxPdfBytes);
  }

  // 4. Other files (DOCX, XLSX, DWG, ZIP - enforce storage cap)
  if (file.size > maxOtherBytes) {
    throw new Error(
      `${file.name} (${formatBytes(file.size)}) exceeds the ${formatBytes(maxOtherBytes)} storage cap for non-image/PDF files.`
    );
  }

  return {
    file,
    originalSize: file.size,
    compressedSize: file.size,
    savingsPercent: 0,
    category: "other",
    tier: "kept-original",
  };
}

export { formatBytes };
