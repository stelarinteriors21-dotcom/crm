"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSiteVisitDetails } from "@/app/actions/leadActions";
import { Calendar, MapPin, Clock, MessageCircle, Save, CheckCircle2, History, RefreshCw, ChevronDown, ChevronUp, KeyRound, ClipboardCheck, Home, Ruler, Camera } from "lucide-react";
import SiteVisitChecklistModal from "./SiteVisitChecklistModal";

export default function SiteVisitDropdown({ lead, isAdmin = false }: { lead: any; isAdmin?: boolean }) {
  const router = useRouter();
  const currentSiteVisit = (lead.customFields as any)?.siteVisit || {};
  const history = (lead.customFields as any)?.siteVisitHistory || [];
  
  const [type, setType] = useState(currentSiteVisit.type || "");
  const [date, setDate] = useState(currentSiteVisit.date || "");
  const [time, setTime] = useState(currentSiteVisit.time || "");
  const [gmapLink, setGmapLink] = useState(currentSiteVisit.gmapLink || "");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [verifyOtpInput, setVerifyOtpInput] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const handleAdminCompleteOverride = async () => {
    if (!confirm("Are you sure you want to mark this site visit as Completed directly without OTP?")) {
      return;
    }
    setLoading(true);
    try {
      await updateSiteVisitDetails(lead.id, {
        ...currentSiteVisit,
        type: "Done",
        adminOverride: true,
        verifiedAt: new Date().toISOString()
      });
      setType("Done");
      router.refresh();
      alert("Site visit marked as Completed via Admin Override!");
      setIsExpanded(false);
    } catch (e) {
      console.error(e);
      alert("Failed to complete site visit.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanInput = verifyOtpInput.trim();
    const targetOtp = String(currentSiteVisit.otp || "").trim();
    if (cleanInput && targetOtp && cleanInput === targetOtp) {
      setVerifyingOtp(true);
      try {
        await updateSiteVisitDetails(lead.id, {
          ...currentSiteVisit,
          type: "Done",
          verifiedOtp: cleanInput,
          verifiedAt: new Date().toISOString()
        });
        setType("Done");
        router.refresh();
        alert("Site visit confirmed & verified successfully!");
      } catch (e) {
        console.error(e);
        alert("Failed to verify OTP.");
      } finally {
        setVerifyingOtp(false);
      }
    } else {
      alert("Invalid OTP! Please check the OTP sent to client's WhatsApp.");
    }
  };

  const handleSave = async (customType?: string, forceNewOtp: boolean = false, keepScheduledStatus: boolean = false) => {
    const finalType = customType || type;
    if ((finalType === "Scheduled" || finalType === "Rescheduled") && (!date || !time || !gmapLink)) {
      alert("Please fill in the Date, Time, and a mandatory Google Maps link.");
      return;
    }
    setLoading(true);
    try {
      let otp = currentSiteVisit.otp;
      let shouldOpenWhatsApp = false;

      if (finalType === "Scheduled" || finalType === "Rescheduled") {
        if (!otp || forceNewOtp || currentSiteVisit.type !== finalType || date !== currentSiteVisit.date || time !== currentSiteVisit.time) {
          // Generate new OTP if scheduling fresh, changing details, or explicitly regenerating
          otp = Math.floor(100000 + Math.random() * 900000).toString();
          shouldOpenWhatsApp = true;
        }
      }

      const dataToSave: any = { type: finalType, date, time, gmapLink, otp, keepScheduledStatus };
      await updateSiteVisitDetails(lead.id, dataToSave);
      router.refresh();
      
      if (shouldOpenWhatsApp && otp) {
        const msg = `Hi ${lead.name},\nYour Site Visit is scheduled for ${date} at ${time}.\nLocation: ${gmapLink}\n\nYour OTP to verify the visit is: *${otp}*.\nPlease share this with our executive at the site.`;
        const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
      } else {
        alert(keepScheduledStatus ? "Schedule updated without changing status!" : "Site visit details saved successfully!");
      }
      setIsExpanded(false);
    } catch (err: any) {
      console.error(err);
      alert("Failed to save site visit.");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppGroup = () => {
    const customData = lead.customFields || {};
    let reqStr = "";
    Object.entries(customData).forEach(([k, v]) => {
      if (k !== 'siteVisit' && k !== 'siteVisitHistory' && v) {
        reqStr += `${k}: ${v}\n`;
      }
    });

    const msg = `*Site Visit ${type === 'Rescheduled' ? 'Rescheduled' : 'Scheduled'}*
Name: ${lead.name}
Phone: ${lead.phone}
Date: ${date}
Time: ${time}
Location: ${gmapLink}

*Brief Requirement:*
${reqStr || "No specific requirements logged."}

*(Please forward this to the Site Visits Group)*`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const getStatusText = () => {
    if (type === "Done") return "Done";
    if (type === "Scheduled") return "Scheduled";
    if (type === "Rescheduled") return "Rescheduled";
    return "Not Scheduled";
  };

  const getStatusColor = () => {
    if (type === "Done") return "text-green-600 font-bold";
    if (type === "Scheduled") return "text-teal-600 font-bold";
    if (type === "Rescheduled") return "text-teal-700 font-bold";
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
          {type === "Done" ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          ) : type === "Scheduled" || type === "Rescheduled" ? (
            <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
          ) : (
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold text-gray-700">
            Site Visit: <span className={getStatusColor()}>{getStatusText()}</span>
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
            {date ? date : (type || "None")}
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
        <div className="p-2.5 border-t border-gray-100 bg-white max-h-56 overflow-y-auto space-y-2">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center">
            <History className="w-3 h-3 mr-1 text-[#4f46e5]" /> Site Visit History & Confirmation
          </div>
          {history.map((h: any, idx: number) => (
            <div key={idx} className="text-[11px] border border-gray-100 rounded-lg p-2 bg-gray-50/60 space-y-1">
              <div className="font-bold text-gray-700 flex justify-between items-center">
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                  h.type === "Done" ? "bg-emerald-100 text-emerald-800" :
                  h.type === "Rescheduled" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                }`}>
                  {h.type}
                </span>
                <span className="text-gray-400 font-normal text-[10px]">
                  {new Date(h.timestamp).toLocaleDateString()}
                </span>
              </div>
              {h.date && <div className="text-gray-500 text-[10px]">Date: {h.date} {h.time ? `| Time: ${h.time}` : ""}</div>}
              {h.verifiedOtp && (
                <div className="text-emerald-700 font-bold text-[10px] flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> OTP Verified: {h.verifiedOtp}
                </div>
              )}
              {h.roomsToRenovate && (
                <div className="text-gray-600 text-[10px] flex items-center">
                  <Home className="w-3 h-3 mr-1 text-indigo-500 shrink-0" /> Rooms: {h.roomsToRenovate}
                </div>
              )}
              {h.nextMeetingDate && (
                <div className="text-gray-600 text-[10px] flex items-center">
                  <Calendar className="w-3 h-3 mr-1 text-emerald-500 shrink-0" /> Next: {new Date(h.nextMeetingDate).toLocaleDateString()}
                </div>
              )}
              {h.measurements && (
                <div className="text-gray-600 text-[10px] truncate" title={h.measurements}>
                  📏 {h.measurements}
                </div>
              )}
              {h.photos && h.photos.length > 0 && (
                <div className="text-purple-700 text-[10px] font-medium flex items-center">
                  <Camera className="w-3 h-3 mr-1 text-purple-600" /> {h.photos.length} Photos Captured
                </div>
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
              <MapPin className="w-3 h-3 mr-1" /> Site Visit Status
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-teal-500 bg-white font-medium text-gray-800"
            >
              <option value="">Not Scheduled</option>
              <option value="Scheduled">Site Visit Scheduled</option>
              <option value="Rescheduled">Site Visit Rescheduled</option>
              <option value="Done" disabled={!isAdmin}>Site Visit Done {isAdmin ? "(Admin Override)" : ""}</option>
            </select>
          </div>

          {(type === "Scheduled" || type === "Rescheduled") && (
            <div className="space-y-3 bg-white p-3 border border-gray-200 rounded-lg shadow-sm text-sm">
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" /> Date
                </label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[#4f46e5] text-xs" 
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1 flex items-center">
                  <Clock className="w-3 h-3 mr-1" /> Time
                </label>
                <input 
                  type="time" 
                  value={time} 
                  onChange={e => setTime(e.target.value)} 
                  className="border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[#4f46e5] text-xs" 
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" /> Google Maps Link <span className="text-red-500 ml-1">*</span>
                </label>
                <input 
                  type="url" 
                  value={gmapLink} 
                  onChange={e => setGmapLink(e.target.value)} 
                  placeholder="https://maps.google.com/..." 
                  className="border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[#4f46e5] text-xs" 
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button 
                  type="button"
                  onClick={() => handleSave(undefined, false)} 
                  disabled={loading} 
                  className="flex-1 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold py-1.5 rounded flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3 h-3 mr-1" /> Save
                </button>
                {currentSiteVisit.type === type && (type === "Scheduled" || type === "Rescheduled") && (
                  <button 
                    type="button"
                    onClick={() => handleSave(undefined, true)} 
                    disabled={loading} 
                    className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-bold py-1.5 rounded flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer" 
                    title="Regenerate & Resend OTP"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> OTP
                  </button>
                )}
                <button 
                  type="button"
                  onClick={handleWhatsAppGroup} 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 rounded flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                >
                  <MessageCircle className="w-3 h-3 mr-1" /> Group
                </button>
              </div>

              {/* Admin Override: Update Date/Time without changing status to Rescheduled */}
              {isAdmin && (currentSiteVisit.type === "Scheduled" || type === "Scheduled" || currentSiteVisit.type === "Rescheduled" || type === "Rescheduled") && (
                <button 
                  type="button"
                  onClick={() => handleSave("Scheduled", false, true)} 
                  disabled={loading} 
                  className="w-full mt-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold py-1.5 px-3 rounded flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                  title="Update schedule date/time without moving to Rescheduled"
                >
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Update Schedule (Keep as Scheduled)
                </button>
              )}

              {/* OTP Confirmation Section */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center">
                    <KeyRound className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Confirm Visit with Client OTP
                  </span>
                  {currentSiteVisit.otp && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono font-bold px-2 py-0.5 rounded">
                      OTP: {currentSiteVisit.otp}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verifyOtpInput}
                    onChange={(e) => setVerifyOtpInput(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="flex-1 text-center font-bold tracking-widest border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-[#4f46e5] text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || !verifyOtpInput.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors disabled:opacity-50 flex items-center cursor-pointer shadow-xs"
                  >
                    {verifyingOtp ? "..." : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm</>}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChecklistModal(true)}
                  className="w-full mt-1.5 py-1.5 px-3 bg-[#4f46e5] hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" /> Complete Visit Checklist with OTP
                </button>
              </div>

              {/* Admin Override: 1-Click Complete Visit (No OTP Required) */}
              {isAdmin && type !== "Done" && (
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <button
                    type="button"
                    onClick={handleAdminCompleteOverride}
                    disabled={loading}
                    className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> ⚡ Admin Override: Mark Visit as Completed
                  </button>
                </div>
              )}
            </div>
          )}

          {type === "Done" && (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-emerald-800 border-b border-emerald-200/60 pb-1.5">
                <span className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" /> Site Visit Confirmed & Verified
                </span>
                {currentSiteVisit.verifiedOtp && (
                  <span className="bg-emerald-200/80 text-emerald-900 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
                    OTP: {currentSiteVisit.verifiedOtp}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-[11px] text-emerald-800">
                {currentSiteVisit.roomsToRenovate && (
                  <div className="flex items-center">
                    <Home className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                    <span>Rooms to Renovate: <strong>{currentSiteVisit.roomsToRenovate}</strong></span>
                  </div>
                )}
                {currentSiteVisit.nextMeetingDate && (
                  <div className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                    <span>Next Meeting: <strong>{new Date(currentSiteVisit.nextMeetingDate).toLocaleDateString()}</strong></span>
                  </div>
                )}
                {currentSiteVisit.photos && currentSiteVisit.photos.length > 0 && (
                  <div className="flex items-center">
                    <Camera className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                    <span>{currentSiteVisit.photos.length} Site Photos Attached</span>
                  </div>
                )}
                {currentSiteVisit.measurements && (
                  <div className="bg-white/80 p-2 rounded border border-emerald-200 text-gray-800 text-[11px] whitespace-pre-wrap">
                    <div className="font-bold text-[10px] text-emerald-700 uppercase mb-0.5">Measurements:</div>
                    {currentSiteVisit.measurements}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowChecklistModal(true)}
                className="w-full mt-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <ClipboardCheck className="w-3.5 h-3.5 mr-1" /> View / Update Checklist Details
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded font-medium cursor-pointer"
            >
              Close
            </button>
            {(!type || type === "Not Scheduled") && (
              <button
                type="button"
                onClick={() => handleSave("", false)}
                disabled={loading}
                className="px-3 py-1 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Checklist Modal */}
      <SiteVisitChecklistModal
        isOpen={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
        lead={lead}
        onSuccess={() => {
          setType("Done");
          router.refresh();
        }}
      />
    </div>
  );
}
