"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, PhoneCall, AlertCircle, CheckCircle2, Calendar, Send } from "lucide-react";
import { createQuickFollowUp, scheduleCustomFollowUp } from "@/app/actions/leadActions";

export default function QuickFollowUp({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // Custom follow-up state
  const [customDateTime, setCustomDateTime] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [customLoading, setCustomLoading] = useState(false);

  // Quick preset scheduler
  const handleSchedule = async (minutes: number, label: string) => {
    setLoading(true);
    setSuccess("");
    try {
      await createQuickFollowUp(leadId, minutes);
      setSuccess(`Follow-up set for ${label}! Status updated to "follow up".`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("followup_scheduled", { detail: { leadId } }));
      }
      router.refresh();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to schedule follow up.");
    } finally {
      setLoading(false);
    }
  };

  // Custom date/time scheduler
  const handleCustomSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDateTime) {
      alert("Please select a date and time for the follow-up.");
      return;
    }
    if (!customNote.trim()) {
      alert("A reason is mandatory for scheduling a custom follow-up.");
      return;
    }

    setCustomLoading(true);
    setSuccess("");
    try {
      const dateIso = new Date(customDateTime).toISOString();
      await scheduleCustomFollowUp(leadId, dateIso, customNote);
      setSuccess(`Custom follow-up scheduled! Status updated to "follow up".`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("followup_scheduled", { detail: { leadId } }));
      }
      setCustomDateTime("");
      setCustomNote("");
      router.refresh();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to schedule custom follow up.");
    } finally {
      setCustomLoading(false);
    }
  };

  // Min datetime for date picker (current time in YYYY-MM-DDTHH:MM)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

  return (
    <div className="mb-4">
      {/* Quick Follow-up Section */}
      <h3 className="text-[13px] font-bold text-gray-700 mb-1.5 flex items-center">
        <PhoneCall className="w-4 h-4 mr-2 text-[#4f46e5]" /> Quick Follow-up Call
      </h3>
      <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
        Need to call them back shortly? Tap a preset to schedule an automatic alert and set status to <strong>follow up</strong>.
      </p>

      {success && (
        <div className="mb-3 bg-green-50 text-green-700 text-xs font-bold p-2.5 rounded-lg flex items-center justify-center border border-green-200 transition-all">
          <CheckCircle2 className="w-4 h-4 mr-1.5 flex-shrink-0" /> {success}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button 
          type="button"
          disabled={loading || customLoading}
          onClick={() => handleSchedule(15, "15 Minutes")}
          className="flex items-center justify-center py-2 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-100 text-xs font-bold transition-colors disabled:opacity-50"
        >
          <Clock className="w-3 h-3 mr-1" /> 15 Mins
        </button>
        
        <button 
          type="button"
          disabled={loading || customLoading}
          onClick={() => handleSchedule(30, "30 Minutes")}
          className="flex items-center justify-center py-2 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-100 text-xs font-bold transition-colors disabled:opacity-50"
        >
          <Clock className="w-3 h-3 mr-1" /> 30 Mins
        </button>
        
        <button 
          type="button"
          disabled={loading || customLoading}
          onClick={() => handleSchedule(60, "1 Hour")}
          className="flex items-center justify-center py-2 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-100 text-xs font-bold transition-colors disabled:opacity-50"
        >
          <Clock className="w-3 h-3 mr-1" /> 1 Hour
        </button>
        
        <button 
          type="button"
          disabled={loading || customLoading}
          onClick={() => handleSchedule(1440, "Tomorrow")}
          className="flex items-center justify-center py-2 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-100 text-xs font-bold transition-colors disabled:opacity-50"
        >
          <AlertCircle className="w-3 h-3 mr-1" /> Tomorrow
        </button>
      </div>

      {/* Custom Follow-up Section */}
      <div className="pt-3 border-t border-gray-100">
        <h4 className="text-[12px] font-bold text-gray-800 mb-1 flex items-center">
          <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#4f46e5]" /> Custom Follow-up
        </h4>
        <p className="text-[11px] text-gray-500 mb-2.5">
          Pick a specific date and time for custom follow-up:
        </p>

        <form onSubmit={handleCustomSchedule} className="space-y-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-200/80">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
              Select Date & Time *
            </label>
            <input 
              type="datetime-local"
              min={minDateTime}
              value={customDateTime}
              onChange={e => setCustomDateTime(e.target.value)}
              required
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-800 focus:outline-none focus:border-[#4f46e5] font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center justify-between">
              <span>Reason for Follow-up <span className="text-red-500">*</span></span>
              <span className="text-red-600 text-[10px] font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                * Mandatory
              </span>
            </label>
            <input 
              type="text"
              placeholder="e.g. Client requested callback regarding revised quote..."
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              required
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-800 focus:outline-none focus:border-[#4f46e5] font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={customLoading || loading || !customDateTime || !customNote.trim()}
            className="w-full mt-1 flex items-center justify-center py-2 px-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {customLoading ? (
              "Scheduling..."
            ) : (
              <>
                <Send className="w-3 h-3 mr-1.5" /> Schedule Custom Follow-up
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
