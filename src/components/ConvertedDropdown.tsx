"use client";

import { useState } from "react";
import { updateConvertedDetails } from "@/app/actions/leadActions";
import { Trophy, CheckCircle2, Clock, Link as LinkIcon, Save, History, ChevronDown, ChevronUp, AlertCircle, IndianRupee } from "lucide-react";

export default function ConvertedDropdown({ lead }: { lead: any }) {
  const currentConverted = (lead.customFields as any)?.converted || {};
  const history = (lead.customFields as any)?.convertedHistory || [];

  const getInitialStatus = () => {
    if (currentConverted.status) return currentConverted.status;
    if (lead.status === "Won" || lead.status === "Advance recieved" || lead.status === "Pay Pending") {
      return lead.status;
    }
    return "Not Converted";
  };

  const [status, setStatus] = useState(getInitialStatus());
  const [proofLink, setProofLink] = useState(currentConverted.proofLink || "");
  const [amount, setAmount] = useState(currentConverted.amount || "");
  const [notes, setNotes] = useState(currentConverted.notes || "");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hasError, setHasError] = useState(false);

  const CONVERTED_STAGES = [
    { value: "Not Converted", label: "Not Converted" },
    { value: "Advance recieved", label: "Advance Received" },
    { value: "Pay Pending", label: "Pay Pending" },
    { value: "Won", label: "Won (Full Deal Closed)" }
  ];

  const isProofMandatory = status === "Advance recieved" || status === "Pay Pending" || status === "Won";

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isProofMandatory && !proofLink.trim()) {
      setHasError(true);
      const stageObj = CONVERTED_STAGES.find(s => s.value === status);
      alert(`Google Drive / proof document link is mandatory for saving "${stageObj?.label || status}". Please paste the link to proceed.`);
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        status,
        proofLink: proofLink.trim(),
        amount: amount.trim(),
        notes: notes.trim()
      };

      await updateConvertedDetails(lead.id, payload);
      setIsExpanded(false);
      setHasError(false);
      alert("Converted details updated successfully!");
    } catch (err: any) {
      alert("Failed to save: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    if (status === "Won") return "Won";
    if (status === "Advance recieved") return "Advance Received";
    if (status === "Pay Pending") return "Pay Pending";
    return "Not Converted";
  };

  const getStatusColor = () => {
    if (status === "Won") return "text-green-600 font-bold";
    if (status === "Advance recieved") return "text-blue-600 font-bold";
    if (status === "Pay Pending") return "text-orange-600 font-bold";
    return "text-gray-500 font-normal";
  };

  return (
    <div className="mt-2 bg-white border border-gray-100 rounded-lg shadow-sm">
      {/* Retractable / Expandable Header */}
      <div 
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {status === "Won" ? (
            <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
          ) : status === "Advance recieved" ? (
            <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
          ) : status === "Pay Pending" ? (
            <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
          ) : (
            <Trophy className="w-4 h-4 text-gray-300 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold text-gray-700">
            Converted: <span className={getStatusColor()}>{getStatusDisplay()}</span>
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
            {proofLink ? "Has Proof" : (amount ? amount : "No Proof")}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
          )}
        </div>
      </div>

      {/* History Drawer */}
      {showHistory && (
        <div className="p-2 border-t border-gray-100 bg-white max-h-40 overflow-y-auto">
          <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Conversion History</div>
          {history.map((h: any, idx: number) => (
            <div key={idx} className="text-[11px] border-b border-gray-100 last:border-0 py-1">
              <div className="font-semibold text-gray-800 flex justify-between">
                <span>{h.status === "Advance recieved" ? "Advance Received" : h.status}</span>
                <span className="text-gray-400 font-normal text-[10px]">
                  {h.timestamp ? new Date(h.timestamp).toLocaleDateString() : ''}
                </span>
              </div>
              {h.amount && <div className="text-gray-500 text-[10px]">Amount: {h.amount}</div>}
              {h.proofLink && (
                <a 
                  href={h.proofLink.startsWith("http") ? h.proofLink : `https://${h.proofLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-500 hover:underline truncate block"
                >
                  Proof: {h.proofLink}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expanded Form Section */}
      {isExpanded && (
        <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-lg space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1 flex items-center">
              <Trophy className="w-3.5 h-3.5 mr-1 text-amber-500" /> Conversion Stage
            </label>
            <select
              value={status}
              onChange={e => {
                setStatus(e.target.value);
                if (hasError) setHasError(false);
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-amber-500 bg-white font-medium text-gray-800"
            >
              {CONVERTED_STAGES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1 flex items-center">
              <IndianRupee className="w-3 h-3 mr-1 text-gray-400" /> Payment / Deal Amount (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. ₹50,000 or ₹12,00,000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-amber-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1 flex items-center justify-between">
              <span className="flex items-center">
                <LinkIcon className="w-3 h-3 mr-1" /> Proof of Payment / Won (Drive Link)
                {isProofMandatory ? (
                  <span className="text-red-600 font-bold ml-1.5 text-[10px] bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                    * Mandatory
                  </span>
                ) : (
                  <span className="text-gray-400 font-normal ml-1.5 text-[10px]">
                    (Optional)
                  </span>
                )}
              </span>
              {proofLink && (
                <a 
                  href={proofLink.startsWith("http") ? proofLink : `https://${proofLink}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] text-blue-600 hover:underline flex items-center font-normal"
                >
                  Open Link ↗
                </a>
              )}
            </label>
            <textarea
              value={proofLink}
              onChange={e => {
                setProofLink(e.target.value);
                if (hasError) setHasError(false);
              }}
              placeholder="Paste Google Drive receipt, transaction screenshot, or agreement link here..."
              className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none min-h-[60px] ${
                hasError 
                  ? "border-red-400 focus:border-red-500 bg-red-50/20" 
                  : "border-gray-200 focus:border-amber-500 bg-white"
              }`}
            />
            {hasError && (
              <p className="text-[11px] text-red-600 mt-1 font-semibold flex items-center">
                ⚠️ A Google Drive or Document proof link is required to advance to this stage.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Received via NEFT / Cash receipt #104..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-amber-500 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave()}
              disabled={loading}
              className="flex items-center px-3 py-1.5 text-xs font-bold text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {loading ? "Saving..." : (
                <>
                  <Save className="w-3 h-3 mr-1" /> Save Converted Stage
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
