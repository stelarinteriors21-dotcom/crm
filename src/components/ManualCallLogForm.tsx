"use client";
import { useState, useRef } from "react";
import { Phone, Loader2, UploadCloud, PhoneMissed, PhoneCall } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ManualCallLogForm({ leadId }: { leadId: string }) {
  const [status, setStatus] = useState<"CONNECTED" | "MISSED">("CONNECTED");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "CONNECTED" && !duration) return;
    
    setLoading(true);
    const fd = new FormData();
    fd.append("leadId", leadId);
    
    // If missed, duration is 0. If connected, parse the input.
    const finalDuration = status === "MISSED" ? 0 : parseInt(duration || "0", 10);
    fd.append("duration", String(finalDuration));
    
    // Auto-append Missed flag in notes if it's missed and notes are empty
    let finalNotes = notes;
    if (status === "MISSED" && !finalNotes) {
      finalNotes = "Missed Call / Not Reachable";
    }
    fd.append("notes", finalNotes);
    fd.append("userId", "MANUAL_WEB");
    
    if (file && status === "CONNECTED") fd.append("audio", file);

    try {
      const res = await fetch("/api/mobile/call-logs", {
        method: "POST",
        body: fd
      });
      if (res.ok) {
        setDuration("");
        setNotes("");
        setFile(null);
        setStatus("CONNECTED");
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
    <form onSubmit={handleSave} className="flex flex-col space-y-3 mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800 flex items-center">
          <Phone className="w-4 h-4 mr-2 text-[#4f46e5]" /> Log Manual Call
        </h3>
        
        {/* Status Toggle */}
        <div className="flex bg-gray-200 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setStatus("CONNECTED")}
            className={`px-3 py-1 text-xs font-bold rounded-md flex items-center transition-colors ${status === "CONNECTED" ? "bg-white text-[#4f46e5] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <PhoneCall className="w-3 h-3 mr-1" /> Connected
          </button>
          <button
            type="button"
            onClick={() => setStatus("MISSED")}
            className={`px-3 py-1 text-xs font-bold rounded-md flex items-center transition-colors ${status === "MISSED" ? "bg-red-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <PhoneMissed className="w-3 h-3 mr-1" /> Missed
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        {status === "CONNECTED" && (
          <input 
            type="number" 
            step="1" 
            placeholder="Duration (sec)" 
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm sm:w-1/4 text-gray-900 bg-white focus:outline-none focus:border-[#4f46e5]" 
            value={duration} 
            onChange={e => setDuration(e.target.value)} 
            required 
          />
        )}
        <input 
          type="text" 
          placeholder={status === "MISSED" ? "Reason (e.g. Number busy, switched off...)" : "Notes (optional)"} 
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4f46e5]" 
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
        />
        
        {status === "CONNECTED" && (
          <div className="flex items-center border border-gray-200 rounded-lg bg-white px-2 py-1 sm:w-1/4 overflow-hidden relative cursor-pointer hover:bg-gray-50 transition-colors">
            <input type="file" accept="audio/*" ref={fileInputRef} onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
            <UploadCloud className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
            <span className="text-xs text-gray-500 truncate">{file ? file.name : "Upload .mp3"}</span>
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loading} 
          className={`px-4 py-2 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center justify-center whitespace-nowrap transition-colors ${status === "MISSED" ? "bg-red-500 hover:bg-red-600" : "bg-[#4f46e5] hover:bg-purple-700"}`}
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Log"}
        </button>
      </div>
    </form>
  );
}
