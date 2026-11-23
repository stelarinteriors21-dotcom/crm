"use client";

import React, { useState } from "react";
import { LEAD_STATUS_COLORS, LEAD_STATUS_OPTIONS, isPastMilestoneStatus, getLeadPastMilestone } from "@/lib/constants";
import { updateLeadStatus } from "@/app/actions/leadActions";
import { History, ChevronDown, Check, ArrowRight, X, Clock, User } from "lucide-react";
import { formatDeterministicDateTime } from "@/lib/dateUtils";

const DISPLAY_NAMES: Record<string, string> = {
  "Advance recieved": "Advance Received",
  "final Quotation": "Final Quotation",
  "Site visit Scheduled": "Site Visit Scheduled",
  "Site visit Rescheduled": "Site Visit Rescheduled",
  "Site visit Schedules": "Site Visit Scheduled",
  "Site visit Recheduled": "Site Visit Rescheduled",
  "Site visit done": "Site Visit Done",
  "Estimate without site visit": "Estimate Without Site Visit",
  "Quotation without site visit": "Estimate Without Site Visit",
  "follow up": "Follow Up",
};

interface StatusHistoryItem {
  from: string;
  to: string;
  changedAt: string;
  changedBy?: string;
}

export default function LeadStatusDropdown({ 
  leadId, 
  initialStatus,
  pastStatus: initialPastStatus,
  statusHistory: initialHistory = [],
  statusChangedAt,
  isAdmin = false 
}: { 
  leadId: string; 
  initialStatus: string;
  pastStatus?: string | null;
  statusHistory?: StatusHistoryItem[];
  statusChangedAt?: string | null;
  isAdmin?: boolean; 
}) {
  const initialValidPast = (initialPastStatus && isPastMilestoneStatus(initialPastStatus)) 
    ? initialPastStatus 
    : getLeadPastMilestone({ statusHistory: initialHistory, pastStatus: initialPastStatus }, initialStatus);

  const [currentStatus, setCurrentStatus] = useState<string>(initialStatus || "Fresh");
  const [pastStatus, setPastStatus] = useState<string | null>(initialValidPast);
  const [history, setHistory] = useState<StatusHistoryItem[]>(initialHistory);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);

  // Clean status name
  const rawStatus = currentStatus || "Fresh";
  const status = rawStatus.replace(/\s*\([^)]*\)\s*/g, '').trim() || "Fresh";
  const statusClass = LEAD_STATUS_COLORS[status] ?? LEAD_STATUS_COLORS[rawStatus] ?? "bg-gray-500 text-white";
  const displayName = DISPLAY_NAMES[status] || status;

  const validPastStatus = (pastStatus && isPastMilestoneStatus(pastStatus)) ? pastStatus : null;
  const pastDisplayName = validPastStatus ? (DISPLAY_NAMES[validPastStatus] || validPastStatus) : null;
  const pastStatusClass = validPastStatus ? (LEAD_STATUS_COLORS[validPastStatus] ?? "bg-gray-400 text-white") : "";

  const handleSelectStatus = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      setMenuOpen(false);
      return;
    }
    setUpdating(true);
    setMenuOpen(false);

    try {
      const oldStatus = currentStatus;
      await updateLeadStatus(leadId, newStatus);
      
      setCurrentStatus(newStatus);
      if (isPastMilestoneStatus(oldStatus)) {
        setPastStatus(oldStatus);
      }
      setHistory(prev => [
        {
          from: oldStatus,
          to: newStatus,
          changedAt: new Date().toISOString()
        },
        ...prev
      ]);
    } catch (err: any) {
      alert("Failed to update status: " + (err?.message || "Unknown error"));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="mt-1.5 mb-2 flex items-center flex-wrap gap-2 relative">
      {/* 1. CURRENT STATUS BADGE & DROPDOWN */}
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={updating}
          title={`Click to change Current Status (Currently: ${displayName})`}
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide shadow-xs cursor-pointer hover:opacity-95 transition-all ${statusClass}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 opacity-90 animate-pulse" />
          <span className="mr-1">Current: {displayName}</span>
          <ChevronDown className="w-3 h-3 opacity-80" />
        </button>

        {/* Status Dropdown Menu */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-0 top-full mt-1.5 w-60 max-h-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-y-auto divide-y divide-gray-100 p-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-400">
                Select New Status
              </div>
              <div className="py-1">
                {LEAD_STATUS_OPTIONS.map((opt) => {
                  const optDisplay = DISPLAY_NAMES[opt] || opt;
                  const isCurrent = opt === currentStatus;
                  const optColor = LEAD_STATUS_COLORS[opt] ?? "bg-gray-400 text-white";

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectStatus(opt)}
                      className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between rounded-lg hover:bg-gray-50 transition-colors ${
                        isCurrent ? "font-bold text-[#4f46e5]" : "text-gray-700"
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className={`w-2 h-2 rounded-full ${optColor}`} />
                        <span className="truncate">{optDisplay}</span>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-[#4f46e5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2. PAST STATUS PILL */}
      {validPastStatus && (
        <div 
          className="inline-flex items-center bg-gray-50 border border-gray-200/90 text-gray-700 text-xs px-2.5 py-1 rounded-md shadow-2xs font-medium"
          title={`Previous Status milestone before ${displayName}: ${pastDisplayName}`}
        >
          <History className="w-3 h-3 text-gray-400 mr-1.5" />
          <span className="text-[10px] uppercase font-bold text-gray-400 mr-1.5">Past:</span>
          <span className={`inline-flex px-1.5 py-0.2 rounded text-[11px] font-bold ${pastStatusClass} shadow-2xs`}>
            {pastDisplayName}
          </span>
        </div>
      )}

      {/* 3. STATUS HISTORY TRIGGER */}
      {(history.length > 0 || statusChangedAt) && (
        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          className="inline-flex items-center text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/70 px-2 py-0.5 rounded-md transition-colors"
          title="View full status transition history"
        >
          <Clock className="w-3 h-3 mr-1" />
          <span>History {history.length > 0 ? `(${history.length})` : ""}</span>
        </button>
      )}

      {/* 4. STATUS HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#4f46e5] flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-none">Status Audit Trail</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Timeline of past and current statuses</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-80 overflow-y-auto space-y-4">
              {/* Current Active Status */}
              <div className="relative pl-6 pb-2 border-l-2 border-emerald-500">
                <span className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    🟢 Current: {displayName}
                  </span>
                  <span className="text-[10px] text-gray-400">Active Now</span>
                </div>
              </div>

              {/* History Items */}
              {history.length > 0 ? (
                history.map((item, idx) => (
                  <div key={idx} className="relative pl-6 pb-4 border-l-2 border-gray-200 last:border-l-transparent">
                    <span className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-gray-300 ring-4 ring-white" />
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap font-semibold text-gray-800">
                        <span className="text-gray-500">{DISPLAY_NAMES[item.from] || item.from}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-900">{DISPLAY_NAMES[item.to] || item.to}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                        <span>{formatDeterministicDateTime(item.changedAt)}</span>
                        {item.changedBy && (
                          <span className="flex items-center gap-1">
                            <User className="w-2.5 h-2.5" />
                            <span>{item.changedBy}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 italic pl-6">
                  {pastStatus ? `Previously transitioned from "${pastDisplayName}".` : "No previous status transitions recorded yet."}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-gray-900 hover:bg-black text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { LeadStatusDropdown as LeadStatusBadge };
