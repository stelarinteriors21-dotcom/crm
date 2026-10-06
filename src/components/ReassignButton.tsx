"use client";

import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { assignLeadToUser } from "@/app/actions/leadActions";

export default function ReassignButton({ leadId, currentAssigneeId, callers }: { leadId: string, currentAssigneeId: string | null, callers: { id: string, name: string }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(currentAssigneeId || "");
  const [processing, setProcessing] = useState(false);

  // If there are no callers available, do not render the button
  if (callers.length === 0) return null;

  const handleAssign = async () => {
    if (!selectedAssignee) return;
    setProcessing(true);
    await assignLeadToUser(leadId, selectedAssignee);
    setProcessing(false);
    setIsOpen(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors border border-gray-200"
      >
        <UserPlus className="w-3.5 h-3.5" /> Reassign
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reassign Lead</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
              <select 
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-[#4f46e5] focus:border-[#4f46e5]"
              >
                <option value="">-- Select --</option>
                {callers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleAssign}
                disabled={processing || !selectedAssignee}
                className="flex items-center px-4 py-2 bg-[#4f46e5] hover:bg-purple-800 text-white text-sm font-bold rounded-lg disabled:opacity-50"
              >
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
