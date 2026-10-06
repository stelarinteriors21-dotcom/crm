"use client";

import { useEffect, useState } from "react";
import { checkPendingScoreLead } from "@/app/actions/scoreActions";
import LeadScoreWidget from "./LeadScoreWidget";

export default function LeadScorePromptWatcher() {
  const [lead, setLead] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

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
    
    check();
  }, []);

  if (!lead) return null;

  const handleSave = (scores: any) => {
    // Dismiss the modal after they click save, regardless of filled state
    localStorage.setItem("lead_score_dismissed_" + lead.id, "true");
    setLead(null);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 bg-gradient-to-r from-purple-600 to-[#4f46e5] text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-bold text-lg">Lead Score Required</h2>
            <p className="text-xs text-purple-100 opacity-90">{lead.name}</p>
          </div>
          <button 
            onClick={() => {
              localStorage.setItem("lead_score_dismissed_" + lead.id, "true");
              setLead(null);
            }} 
            className="text-white hover:text-gray-200 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto bg-gray-50 flex-1 scrollbar-hide">
          <p className="text-sm text-gray-700 mb-2 font-medium leading-relaxed">
            You just completed the first call for <strong className="text-gray-900">{lead.name}</strong>! 
            Please take a moment to evaluate the lead's quality. All fields are mandatory.
          </p>
          {errorMsg && (
            <div className="mb-4 p-2 bg-red-50 text-red-600 text-sm font-semibold rounded-md border border-red-200">
              {errorMsg}
            </div>
          )}
          <div className="shadow-md rounded-xl overflow-hidden pointer-events-auto">
            <LeadScoreWidget leadId={lead.id} initialScores={lead.scores} onSave={handleSave} />
          </div>
        </div>
      </div>
    </div>
  );
}