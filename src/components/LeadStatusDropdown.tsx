"use client";

import { LEAD_STATUS_COLORS } from "@/lib/constants";

const DISPLAY_NAMES: Record<string, string> = {
  "Advance recieved": "Advance Received",
  "final Quotation": "Final Quotation",
  "Site visit Schedules": "Site Visit Scheduled",
  "Site visit Recheduled": "Site Visit Rescheduled",
  "Site visit done": "Site Visit Done",
  "Estimate without site visit": "Estimate Without Site Visit",
  "Quotation without site visit": "Estimate Without Site Visit",
  "just curious": "Just Curious",
  "follow up": "Follow Up",
};

export default function LeadStatusDropdown({ 
  leadId, 
  initialStatus,
  isAdmin = false 
}: { 
  leadId: string; 
  initialStatus: string;
  isAdmin?: boolean; 
}) {
  const rawStatus = initialStatus || "Fresh";
  // Ensure no stage or state is written in brackets in the status
  const status = rawStatus.replace(/\s*\([^)]*\)\s*/g, '').trim() || "Fresh";
  const statusClass = LEAD_STATUS_COLORS[status] ?? LEAD_STATUS_COLORS[rawStatus] ?? "bg-gray-500 text-white";
  const displayName = DISPLAY_NAMES[status] || status;

  return (
    <div className="mt-1.5 mb-2 flex items-center">
      <span 
        title={`Current Status: ${displayName}`}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wide shadow-xs ${statusClass}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 opacity-90" />
        {displayName}
      </span>
    </div>
  );
}

export { LeadStatusDropdown as LeadStatusBadge };
