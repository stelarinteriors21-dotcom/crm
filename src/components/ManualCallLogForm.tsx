"use client";
import { useState, useRef } from "react";
import { Phone, Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ManualCallLogForm({ leadId }: { leadId: string }) {
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duration) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("leadId", leadId);
    fd.append("duration", String(parseFloat(duration) * 60));
    fd.append("notes", notes);
    fd.append("userId", "MANUAL_WEB");
    if (file) fd.append("audio", file);

    try {
      const res = await fetch("/api/mobile/call-logs", {
        method: "POST",
        body: fd
      });
      if (res.ok) {
        setDuration("");
        setNotes("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } else {
        alert("Failed to save: " + await res.text());
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col space-y-2 mt-4 bg-gray-50 p-4 rounded-md border">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center justify-between">
        <div className="flex items-center"><Phone className="w-4 h-4 mr-2" /> Log Manual Call</div>
      </h3>
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <input type="number" step="0.1" placeholder="Duration (minutes)" className="px-3 py-2 border rounded-md text-sm sm:w-1/4 text-gray-900 bg-white" value={duration} onChange={e => setDuration(e.target.value)} required />
        <input type="text" placeholder="Notes (optional)" className="flex-1 px-3 py-2 border rounded-md text-sm text-gray-900 bg-white" value={notes} onChange={e => setNotes(e.target.value)} />
        <div className="flex items-center border rounded-md bg-white px-2 py-1 sm:w-1/4 overflow-hidden relative cursor-pointer hover:bg-gray-50">
          <input type="file" accept="audio/*" ref={fileInputRef} onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
          <UploadCloud className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
          <span className="text-xs text-gray-500 truncate">{file ? file.name : "Upload .mp3"}</span>
        </div>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-[#4f46e5] text-white rounded-md text-sm font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center whitespace-nowrap">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Log"}
        </button>
      </div>
    </form>
  );
}
