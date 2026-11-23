"use client";

import React, { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, FileText, X, Link as LinkIcon, ExternalLink, Sparkles } from "lucide-react";
import { compressFileForUpload, formatBytes, FileCompressionLimits } from "@/lib/fileCompressor";

export interface UploadedFilePayload {
  url: string;
  fileName: string;
  size: number;
  type: string;
  savingsPercent?: number;
  originalSize?: number;
  tier?: string;
}

interface DirectFileUploaderProps {
  leadId: string;
  category: "floor-plan" | "quotation" | "payment-proof" | "attachment";
  value?: string;
  fileName?: string;
  onUploaded: (res: UploadedFilePayload) => void;
  onClear?: () => void;
  saveRecord?: boolean;
  displayNameOverride?: string;
  mandatory?: boolean;
  hasError?: boolean;
  accentColor?: "blue" | "amber" | "purple" | "green";
  accept?: string;
  helperText?: string;
  allowUrlFallback?: boolean;
  limits?: FileCompressionLimits;
}

export function normalizeDocumentHref(url: string): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export async function uploadCompressedFileToStorage(
  leadId: string,
  category: string,
  compressedFile: File,
  options: { saveRecord?: boolean; displayName?: string } = {}
): Promise<{ url: string; size: number; type: string }> {
  const displayName = (options.displayName || compressedFile.name || "Uploaded File").trim();

  // 1. Try presigned S3 direct upload first (bypasses server body limits)
  try {
    const presignRes = await fetch("/api/attachments/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "presign",
        leadId,
        category,
        fileName: compressedFile.name,
        fileSize: compressedFile.size,
      }),
    });

    if (presignRes.ok) {
      const presignData = await presignRes.json();
      if (presignData.success && presignData.signedUrl && presignData.publicUrl) {
        const s3Put = await fetch(presignData.signedUrl, {
          method: "PUT",
          body: compressedFile,
          headers: {
            "Content-Type": presignData.contentType || compressedFile.type || "application/octet-stream",
          },
        });

        if (s3Put.ok) {
          if (options.saveRecord) {
            await fetch("/api/attachments/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "confirm",
                leadId,
                url: presignData.publicUrl,
                displayName,
                size: compressedFile.size,
                fileType: presignData.contentType || compressedFile.type || "UPLOAD",
              }),
            });
          }
          return {
            url: presignData.publicUrl,
            size: compressedFile.size,
            type: presignData.contentType || compressedFile.type || "UPLOAD",
          };
        }
      }
    }
  } catch (presignErr) {
    console.warn("Presigned upload unavailable, falling back to direct server upload:", presignErr);
  }

  // 2. Fallback: FormData upload via server endpoint
  const fd = new FormData();
  fd.append("file", compressedFile);
  fd.append("leadId", leadId);
  fd.append("category", category);
  fd.append("displayName", displayName);
  if (options.saveRecord) {
    fd.append("saveRecord", "true");
  }

  const res = await fetch("/api/attachments/upload", {
    method: "POST",
    body: fd,
  });
  const data = await res.json();
  if (!res.ok || !data.success || !data.url) {
    throw new Error(data.error || "Failed to upload file");
  }

  return {
    url: data.url,
    size: data.size || compressedFile.size,
    type: data.type || compressedFile.type || "UPLOAD",
  };
}

export default function DirectFileUploader({
  leadId,
  category,
  value = "",
  fileName = "",
  onUploaded,
  onClear,
  saveRecord = false,
  displayNameOverride,
  hasError = false,
  accentColor = "blue",
  accept = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg,.zip,audio/*",
  helperText = "PDF, Photo, Drawing or Doc — auto-compressed to stay under storage limit",
  allowUrlFallback = true,
  limits,
}: DirectFileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "compressing" | "uploading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [statsText, setStatsText] = useState("");
  const [showUrlMode, setShowUrlMode] = useState(false);
  const [manualUrl, setManualUrl] = useState(
    value && (value.startsWith("http://") || value.startsWith("https://")) ? value : ""
  );

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;

    setErrorMsg("");
    setStatsText("");
    setStatus("compressing");

    try {
      const compressed = await compressFileForUpload(picked, limits);
      if (compressed.savingsPercent > 0) {
        setStatsText(
          `${formatBytes(compressed.originalSize)} -> ${formatBytes(compressed.compressedSize)} (${compressed.savingsPercent}% saved · ${compressed.tier})`
        );
      } else {
        setStatsText(`${formatBytes(compressed.compressedSize)} (optimized)`);
      }

      setStatus("uploading");
      const uploaded = await uploadCompressedFileToStorage(leadId, category, compressed.file, {
        saveRecord,
        displayName: displayNameOverride || compressed.file.name,
      });

      onUploaded({
        url: uploaded.url,
        fileName: displayNameOverride || compressed.file.name,
        size: uploaded.size,
        type: uploaded.type,
        savingsPercent: compressed.savingsPercent,
        originalSize: compressed.originalSize,
        tier: compressed.tier,
      });
      setStatus("idle");
    } catch (err: any) {
      console.error("File upload failed:", err);
      setStatus("error");
      setErrorMsg(err?.message || "Failed to process and upload file.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const borderTheme = hasError
    ? "border-red-400 bg-red-50/40"
    : accentColor === "green"
    ? "border-emerald-200 hover:border-emerald-400 bg-white"
    : accentColor === "amber"
    ? "border-amber-200 hover:border-amber-400 bg-white"
    : accentColor === "purple"
    ? "border-purple-200 hover:border-purple-400 bg-white"
    : "border-blue-200 hover:border-blue-400 bg-white";

  const isBusy = status === "compressing" || status === "uploading";
  const displayLabel =
    fileName ||
    (value.includes("key=") ? decodeURIComponent(value.split("key=").pop() || "").split("/").pop() : value);

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFilePicked}
        className="hidden"
      />

      {value && !showUrlMode ? (
        <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-gray-800 truncate" title={displayLabel}>
                  {displayLabel || "Uploaded File"}
                </div>
                {statsText && (
                  <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>{statsText}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={normalizeDocumentHref(value)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 px-2 py-1 rounded flex items-center gap-1"
              >
                <span>View</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => inputRef.current?.click()}
                className="text-[11px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-2 py-1 rounded"
              >
                Replace
              </button>
              {onClear && (
                <button
                  type="button"
                  onClick={() => {
                    setStatsText("");
                    onClear();
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : !showUrlMode ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
          className={`w-full px-3 py-3 border-2 border-dashed rounded-lg transition-colors flex flex-col items-center justify-center text-center gap-1 cursor-pointer ${borderTheme} ${
            isBusy ? "opacity-75 cursor-wait" : ""
          }`}
        >
          {isBusy ? (
            <>
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="text-[12px] font-semibold text-indigo-700">
                {status === "compressing" ? "Compressing file cleanly..." : "Uploading to CRM storage..."}
              </span>
              {statsText && <span className="text-[10px] text-emerald-700 font-medium">{statsText}</span>}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-700">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Click to Upload File Directly</span>
              </div>
              <span className="text-[10px] text-gray-500">{helperText}</span>
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <LinkIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => {
                setManualUrl(e.target.value);
                onUploaded({
                  url: e.target.value,
                  fileName: e.target.value,
                  size: 0,
                  type: "LINK",
                });
              }}
              placeholder="Paste external URL (https://...)"
              className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowUrlMode(false)}
            className="text-[11px] font-semibold text-indigo-600 hover:underline px-2 py-1 shrink-0"
          >
            Upload File
          </button>
        </div>
      )}

      {errorMsg && (
        <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
          <span>⚠️ {errorMsg}</span>
        </p>
      )}

      {allowUrlFallback && !showUrlMode && !isBusy && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowUrlMode(true)}
            className="text-[10px] text-gray-400 hover:text-gray-600 underline flex items-center gap-1"
          >
            <FileText className="w-2.5 h-2.5" /> Or paste an external link
          </button>
        </div>
      )}
    </div>
  );
}
