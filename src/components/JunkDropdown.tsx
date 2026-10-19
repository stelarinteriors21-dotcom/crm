"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateJunkDetails } from "@/app/actions/leadActions";
import { Ban, Trash2, CheckCircle2, ChevronDown, ChevronUp, History, RotateCcw } from "lucide-react";

export default function JunkSection({ lead }: { lead: any }) {
  const router = useRouter();
  const currentJunk = (lead.customFields as any)?.junk || {};
  const history = (lead.customFields as any)?.junkHistory || [];
  
  const isCurrentlyJunk = lead.status === "Junk" || currentJunk.status === "Junk";

  const [reason, setReason] = useState(currentJunk.reason || "");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleMarkJunk = async () => {
    if (!reason.trim()) {
      setHasError(true);
      return;
    }

    setLoading(true);
    try {
      await updateJunkDetails(lead.id, {
        status: "Junk",
        reason: reason.trim(),
      });
      setIsExpanded(false);
      setHasError(false);
      router.refresh();
    } catch (err: any) {
      alert("Failed to update: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setLoading(true);
    try {
      await updateJunkDetails(lead.id, {
        status: "Active",
        reason: "Reactivated by agent",
      });
      setReason("");
      setIsExpanded(false);
      router.refresh();
    } catch (err: any) {
      alert("Failed to reactivate: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header / Clickable Toggle */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition-colors select-none"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isCurrentlyJunk ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
            <Ban className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-gray-800 truncate">
            Junk Lead
          </span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
            isCurrentlyJunk 
              ? "bg-red-50 text-red-700 border-red-200" 
              : "bg-gray-50 text-gray-500 border-gray-200"
          }`}>
            {isCurrentlyJunk ? "Marked as Junk" : "Active"}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {history.length > 0 && (
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowHistory(!showHistory); }}
              className="text-[10px] text-indigo-600 hover:underline flex items-center mr-1"
              title="View History"
            >
              <History className="w-3 h-3 mr-0.5" /> History
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* History Drawer */}
      {showHistory && (
        <div className="p-3 border-t border-gray-100 bg-gray-50/60 max-h-36 overflow-y-auto text-left">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Junk History</div>
          {history.map((h: any, idx: number) => (
            <div key={idx} className="text-xs border-b border-gray-100 last:border-0 py-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                <span className={h.status === "Junk" ? "text-red-600" : "text-emerald-600"}>{h.status}</span>
                <span className="text-[10px] text-gray-400 font-normal">
                  {h.timestamp ? new Date(h.timestamp).toLocaleDateString() : ""}
                </span>
              </div>
              {h.reason && (
                <p className="text-[11px] text-gray-600 mt-0.5 italic">"{h.reason}"</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 1 Single Section (No Select Dropdowns) */}
      {isExpanded && (
        <div className="p-3.5 border-t border-gray-100 bg-gray-50/40 space-y-3">
          {isCurrentlyJunk ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-red-50/60 border border-red-200/80 text-left">
                <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Current Junk Reason</div>
                <p className="text-xs font-medium text-gray-800 mt-1 italic">
                  "{currentJunk.reason || "Marked as Junk"}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleReactivate}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3 mr-1.5" /> Reactivate Lead (Mark Active)
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 text-left">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                Reason for marking as Junk *
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (hasError) setHasError(false);
                }}
                placeholder="Enter clear reason (e.g. Out of budget, location outside service area, chose competitor, fake enquiry)..."
                rows={3}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none resize-none transition-colors ${
                  hasError 
                    ? "border-red-400 focus:border-red-500 bg-red-50/20" 
                    : "border-gray-200 focus:border-red-500 bg-white"
                }`}
              />
              {hasError && (
                <p className="text-[11px] text-red-600 font-semibold">
                  ⚠️ Please enter the reason to mark this lead as Junk.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMarkJunk}
                  disabled={loading || !reason.trim()}
                  className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Ban className="w-3 h-3 mr-1.5" />
                  {loading ? "Saving..." : "Mark as Junk"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { JunkSection as JunkDropdown };
