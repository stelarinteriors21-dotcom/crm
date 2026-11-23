"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, Link as LinkIcon } from "lucide-react";
import { addFileAttachment } from "@/app/actions/fileActions";
import DirectFileUploader from "./DirectFileUploader";
import { formatBytes } from "@/lib/fileCompressor";

export default function FileAttachmentForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [feedback, setFeedback] = useState("");

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    setLoading(true);
    setFeedback("");

    const formData = new FormData();
    formData.append("leadId", leadId);
    formData.append("name", name);
    formData.append("url", url);

    await addFileAttachment(formData);

    setName("");
    setUrl("");
    setLoading(false);
    setFeedback("Link attached.");
    router.refresh();
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-lg bg-gray-200/70 p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
              mode === "upload" ? "bg-white text-purple-700 shadow-xs" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <Upload className="w-3 h-3" /> Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode("link")}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
              mode === "link" ? "bg-white text-purple-700 shadow-xs" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <LinkIcon className="w-3 h-3" /> External Link
          </button>
        </div>

        {feedback && (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            {feedback}
          </span>
        )}
      </div>

      {mode === "upload" ? (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Optional label (e.g. Floor Plan, Quotation v1, WhatsApp PDF)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-1.5 text-[12px] border border-gray-200 rounded-lg outline-none focus:border-purple-400 bg-white"
          />
          <DirectFileUploader
            leadId={leadId}
            category="attachment"
            saveRecord={true}
            displayNameOverride={name.trim() || undefined}
            allowUrlFallback={false}
            accentColor="purple"
            helperText="Upload PDF, Photo, Audio, or Drawing — auto-compressed & saved directly"
            onUploaded={(res) => {
              const savedText =
                res.savingsPercent && res.savingsPercent > 0 && res.originalSize
                  ? `Saved "${res.fileName}" (${formatBytes(res.originalSize)} -> ${formatBytes(res.size)}, ${res.savingsPercent}% saved)`
                  : `Saved "${res.fileName}" (${formatBytes(res.size)})`;
              setFeedback(savedText);
              setName("");
              router.refresh();
            }}
          />
        </div>
      ) : (
        <form onSubmit={handleLinkSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Document Name (e.g. Quote v1)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-purple-300 bg-white"
            required
          />
          <input
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-purple-300 bg-white"
            required
          />
          <button
            type="submit"
            disabled={loading || !name || !url}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-semibold text-[12px] flex items-center justify-center disabled:opacity-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </button>
        </form>
      )}
    </div>
  );
}
