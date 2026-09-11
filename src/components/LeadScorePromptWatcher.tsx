"use client";

import { useEffect, useState } from "react";
import { checkPendingScoreLead } from "@/app/actions/scoreActions";
import LeadScoreWidget from "./LeadScoreWidget";
import { X } from "lucide-react";

export default function LeadScorePromptWatcher() {
  const [lead, setLead] = useState<any>(null);

  useEffect(() => {
    async function check() {
      try {
        const pendingLead = await checkPendingScoreLead();
        if (pendingLead) {
          // Check local storage to see if we already dismissed it for this specific lead
          const dismissed = localStorage.getItem("lead_score_dismissed_" + pendingLead.id);
          if (!dismissed) {
            setLead(pendingLead);
          }
        }
      } catch (err) {
        console.error("Failed to check pending score lead:", err);
      }
    }
    
    // We only check once when the component mounts (which happens when page loads or is reloaded after a call sync)
    check();
  }, []);

  if (!lead) return null;

  const handleClose = () => {
    localStorage.setItem("lead_score_dismissed_" + lead.id, "true");
    setLead(null);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 bg-gradient-to-r from-purple-600 to-[#613cbc] text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-bold text-lg">Lead Score Required</h2>
            <p className="text-xs text-purple-100 opacity-90">{lead.name}</p>
          </div>
          <button onClick={handleClose} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto bg-gray-50 flex-1 scrollbar-hide">
          <p className="text-sm text-gray-700 mb-5 font-medium leading-relaxed">
            You just completed the first call for <strong className="text-gray-900">{lead.name}</strong>! 
            Please take a moment to evaluate the lead's quality.
          </p>
          <div className="shadow-md rounded-xl overflow-hidden">
            <LeadScoreWidget leadId={lead.id} initialScores={lead.scores} />
          </div>
        </div>
      </div>
    </div>
  );
}