"use client";

import { useState } from "react";
import { updateLeadStatus } from "@/app/actions/leadActions";
import { LEAD_STATUS_COLORS, LEAD_STATUS_OPTIONS } from "@/lib/constants";

export default function LeadStatusDropdown({ leadId, initialStatus }: { leadId: string, initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus || "Fresh");
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setLoading(true);
    try {
      await updateLeadStatus(leadId, newStatus);
    } catch (err) {
      console.error(err);
      setStatus(initialStatus); // Revert on failure
    } finally {
      setLoading(false);
    }
  };

  const statusClass = LEAD_STATUS_COLORS[status] ?? "bg-gray-400 text-white";

  return (
    <div className="relative inline-block mt-1">
      <select
        value={status}
        onChange={handleChange}
        disabled={loading}
        className={`appearance-none pl-2 pr-6 py-0.5 rounded text-[10px] font-black cursor-pointer outline-none border-none ${statusClass}`}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: "right 4px center", backgroundRepeat: "no-repeat", backgroundSize: "10px" }}
      >
        {LEAD_STATUS_OPTIONS.map(opt => (
          <option key={opt} value={opt} className="bg-white text-gray-900 font-medium">
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
