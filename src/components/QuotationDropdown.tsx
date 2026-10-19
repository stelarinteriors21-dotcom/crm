"use client";

import { useState } from "react";
import { updateQuotationDetails } from "@/app/actions/leadActions";
import { recordQuotationFollowUpDone } from "@/app/actions/alertActions";
import { FileText, Save, Link as LinkIcon, FileCheck, Layers, History } from "lucide-react";

export default function QuotationDropdown({ lead }: { lead: any }) {
  const currentQuotation = (lead.customFields as any)?.quotation || {};
  const history = (lead.customFields as any)?.quotationHistory || [];

  const isSiteVisitCompleted = 
    lead.scoreSiteVisit === "Done" || 
    (lead.customFields as any)?.siteVisit?.type === "Done" ||
    lead.status === "Site visit done";

  const getInitialStage = () => {
    if (currentQuotation.stage) return currentQuotation.stage;
    if (currentQuotation.status) {
      if (currentQuotation.status === "Estimate without site visit" || currentQuotation.status === "Quotation without site visit") return "Estimate";
      if (currentQuotation.status.startsWith("Estimate")) return "Estimate";
      if (["Preparing", "Sent", "Approved"].includes(currentQuotation.status)) return "Estimate";
      if (currentQuotation.status === "Revision Requested") return "Revised";
      if (currentQuotation.status === "Final") return "Final";
      if (currentQuotation.status === "Quotation Requested") return "Quotation Requested";
      return currentQuotation.status;
    }
    return "Not Started";
  };

  const getInitialSubStage = () => {
    if (currentQuotation.subStage) {
      if (currentQuotation.subStage === "Quotation without site visit") return "Estimate without site visit";
      return currentQuotation.subStage;
    }
    if (currentQuotation.status) {
      if (currentQuotation.status === "Estimate without site visit" || currentQuotation.status === "Quotation without site visit") return "Estimate without site visit";
      if (["Preparing", "Sent", "Approved"].includes(currentQuotation.status)) return currentQuotation.status;
    }
    return "Preparing";
  };

  const [stage, setStage] = useState(getInitialStage());
  const [subStage, setSubStage] = useState(getInitialSubStage());
  const [withoutSiteVisit, setWithoutSiteVisit] = useState(
    !!currentQuotation.withoutSiteVisit || 
    currentQuotation.subStage === "Estimate without site visit" ||
    currentQuotation.subStage === "Quotation without site visit" ||
    currentQuotation.status === "Estimate without site visit" ||
    currentQuotation.status === "Quotation without site visit"
  );
  const [docLink, setDocLink] = useState(currentQuotation.docLink || "");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Requirement: Hide "Quotation Requested", "Revised", "Final" until site visit is successfully completed
  const availableStages = isSiteVisitCompleted
    ? [
        "Not Started",
        "Quotation Requested",
        "Estimate",
        "Revised",
        "Final"
      ]
    : [
        "Not Started",
        "Estimate"
      ];

  const PRIMARY_STAGES = availableStages.includes(stage)
    ? availableStages
    : [stage, ...availableStages];

  const ESTIMATE_SUB_STAGES = [
    "Preparing", 
    "Sent", 
    "Approved", 
    "Estimate without site visit"
  ];

  const isFloorPlanMandatory = stage === "Quotation Requested";

  const isDocMandatory = 
    isFloorPlanMandatory ||
    (stage === "Estimate" && (subStage === "Sent" || subStage === "Approved" || subStage === "Estimate without site visit" || subStage === "Quotation without site visit" || withoutSiteVisit)) ||
    stage === "Revised" ||
    stage === "Final";

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validation: Require floor plan drive link for Quotation Requested, or document link for Estimate (Sent/Approved/No Visit), Revised, Final
    if (isDocMandatory && !docLink.trim()) {
      setHasError(true);
      if (isFloorPlanMandatory) {
        alert("The Google Drive link for the Floor Plan is mandatory when Quotation is requested. Please paste the floor plan drive link to proceed.");
      } else {
        alert(`Google Drive / Document link is mandatory when advancing to "${stage}". Please paste the link to proceed.`);
      }
      return;
    }

    setLoading(true);
    try {
      const isWithoutVisit = withoutSiteVisit || subStage === "Estimate without site visit" || subStage === "Quotation without site visit";
      const payload: any = {
        stage,
        docLink: docLink.trim(),
        status: isWithoutVisit ? "Estimate without site visit" : stage
      };
      if (stage === "Estimate") {
        payload.subStage = isWithoutVisit ? "Estimate without site visit" : subStage;
        payload.withoutSiteVisit = isWithoutVisit;
      }

      await updateQuotationDetails(lead.id, payload);
      setIsEditing(false);
      alert("Quotation details updated successfully!");
    } catch (err: any) {
      alert("Failed to save: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeText = () => {
    return stage || "Not Started";
  };

  const getBadgeColor = () => {
    if (stage === "Final" || (stage === "Estimate" && subStage === "Approved")) {
      return "text-green-600 font-bold";
    }
    if (stage === "Estimate" && subStage === "Sent") {
      return "text-blue-600 font-bold";
    }
    if (stage === "Estimate") {
      return "text-indigo-600 font-bold";
    }
    if (stage === "Revised") {
      return "text-purple-600 font-bold";
    }
    if (stage === "Quotation Requested") {
      return "text-amber-600 font-bold";
    }
    return "text-gray-500 font-normal";
  };

  return (
    <div className="mt-2 bg-white border border-gray-100 rounded-lg shadow-sm">
      <div 
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
        onClick={() => setIsEditing(!isEditing)}
      >
        <div className="flex items-center space-x-2">
          <FileCheck className={`w-4 h-4 ${
            stage === 'Final' || (stage === 'Estimate' && subStage === 'Approved') ? 'text-green-500' : 
            stage === 'Estimate' || stage === 'Revised' || stage === 'Quotation Requested' ? 'text-blue-500' : 
            'text-gray-400'
          }`} />
          <span className="text-xs font-semibold text-gray-700">
            Quotation: <span className={getBadgeColor()}>{getBadgeText()}</span>
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          {history.length > 0 && (
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowHistory(!showHistory); }}
              className="text-[10px] text-[#4f46e5] hover:underline flex items-center mr-1"
              title="View History"
            >
              <History className="w-3 h-3 mr-0.5" /> History
            </button>
          )}
          <div className="text-[10px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded">
            {docLink ? "Has Docs" : "No Docs"}
          </div>
        </div>
      </div>

      {((lead.customFields as any)?.quotationFollowUpActive && !(lead.customFields as any)?.quotationApproved) && (
        <div className="px-3 py-1.5 bg-blue-50/80 border-t border-blue-100 flex items-center justify-between text-[11px] text-blue-800">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="font-bold">Follow-up:</span>
            <span>1-Day Frequency Active</span>
          </div>
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              await recordQuotationFollowUpDone(lead.id);
              alert("Quotation follow-up logged! Next 1-day follow-up alert scheduled in 24 hours.");
            }}
            className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-0.5 rounded shadow-sm transition-colors"
            title="Record follow-up as completed for today"
          >
            Log Done
          </button>
        </div>
      )}

      {((lead.customFields as any)?.revisionAlertActive && !(lead.customFields as any)?.quotationApproved) && (
        <div className="px-3 py-1.5 bg-purple-50/80 border-t border-purple-100 flex items-center space-x-1.5 text-[11px] text-purple-800 font-semibold">
          <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
          <span>Revision Requested: Prepare & send revised quote</span>
        </div>
      )}

      {showHistory && (
        <div className="p-2 border-t border-gray-100 bg-white max-h-40 overflow-y-auto">
          <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Quotation History</div>
          {history.map((h: any, idx: number) => (
            <div key={idx} className="text-[11px] border-b border-gray-100 last:border-0 py-1">
              <div className="font-semibold text-gray-800 flex justify-between">
                <span>{h.stage || h.status} {h.subStage ? `- ${h.subStage}` : ''}</span>
                <span className="text-gray-400 font-normal text-[10px]">
                  {h.timestamp ? new Date(h.timestamp).toLocaleDateString() : ''}
                </span>
              </div>
              {h.docLink && (
                <a 
                  href={h.docLink.startsWith("http") ? h.docLink : `https://${h.docLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-500 hover:underline truncate block"
                >
                  {h.docLink}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {isEditing && (
        <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-lg space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1 flex items-center">
              <FileText className="w-3 h-3 mr-1" /> Quotation Stage
            </label>
            <select
              value={stage}
              onChange={e => {
                const newStage = e.target.value;
                setStage(newStage);
                if (newStage === "Estimate" && !subStage) {
                  setSubStage("Preparing");
                }
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 bg-white font-medium"
            >
              {PRIMARY_STAGES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {!isSiteVisitCompleted && (
              <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1 font-medium">
                🔒 Quotation Requested, Revised, and Final options unlock once a Site Visit is marked as Done.
              </p>
            )}
          </div>

          {stage === "Estimate" && (
            <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-blue-800 uppercase flex items-center mb-1">
                  <Layers className="w-3.5 h-3.5 mr-1 text-blue-600" /> Estimate Stage
                </label>
                <select
                  value={subStage === "Quotation without site visit" ? "Estimate without site visit" : subStage}
                  onChange={e => {
                    const val = e.target.value;
                    setSubStage(val);
                    if (val === "Estimate without site visit") {
                      setWithoutSiteVisit(true);
                    } else {
                      setWithoutSiteVisit(false);
                    }
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-md focus:outline-none focus:border-blue-500 bg-white font-medium text-gray-800"
                >
                  {ESTIMATE_SUB_STAGES.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center space-x-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={withoutSiteVisit || subStage === "Estimate without site visit" || subStage === "Quotation without site visit"}
                  onChange={e => {
                    const checked = e.target.checked;
                    setWithoutSiteVisit(checked);
                    if (checked) {
                      setSubStage("Estimate without site visit");
                    } else if (subStage === "Estimate without site visit" || subStage === "Quotation without site visit") {
                      setSubStage("Preparing");
                    }
                  }}
                  className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-blue-900">
                  Estimate without site visit
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1 flex items-center justify-between">
              <span className="flex items-center">
                <LinkIcon className="w-3 h-3 mr-1" /> {stage === "Quotation Requested" ? "Floor Plan Drive Link" : "Google Drive / Document Link"}
                {isDocMandatory ? (
                  <span className="text-red-600 font-bold ml-1.5 text-[10px] bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                    * Mandatory
                  </span>
                ) : (
                  <span className="text-gray-400 font-normal ml-1.5 text-[10px]">
                    (Optional)
                  </span>
                )}
              </span>
              {docLink && (
                <a 
                  href={docLink.startsWith("http") ? docLink : `https://${docLink}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] text-blue-600 hover:underline flex items-center font-normal"
                >
                  Open Link ↗
                </a>
              )}
            </label>
            <textarea
              value={docLink}
              onChange={e => {
                setDocLink(e.target.value);
                if (hasError) setHasError(false);
              }}
              placeholder={stage === "Quotation Requested" ? "Paste Google Drive link for the Floor Plan (Mandatory)..." : "Paste Google Drive, Zoho, or PDF link here..."}
              className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none min-h-[60px] ${
                hasError 
                  ? "border-red-400 focus:border-red-500 bg-red-50/20" 
                  : "border-gray-200 focus:border-blue-500 bg-white"
              }`}
            />
            {hasError && (
              <p className="text-[11px] text-red-600 mt-1 font-semibold flex items-center">
                ⚠️ {stage === "Quotation Requested" ? "Floor plan Google Drive link is required when Quotation is requested." : "A Google Drive or Document link is required for this phase."}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave()}
              disabled={loading}
              className="flex items-center px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : (
                <>
                  <Save className="w-3 h-3 mr-1" /> Save Quotation
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
