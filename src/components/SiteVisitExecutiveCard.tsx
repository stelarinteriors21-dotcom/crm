"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Phone, Calendar, Clock, KeyRound, CheckCircle2, User, ExternalLink, Check, RefreshCw, ClipboardCheck, Home, Ruler, Camera } from "lucide-react";
import { updateSiteVisitDetails } from "@/app/actions/leadActions";
import SiteVisitChecklistModal from "./SiteVisitChecklistModal";

export default function SiteVisitExecutiveCard({ 
  lead, 
  requireGps = false, 
  overviewMode = true 
}: { 
  lead: any; 
  requireGps?: boolean; 
  overviewMode?: boolean; 
}) {
  const sv = lead.customFields?.siteVisit || {};
  
  const [loading, setLoading] = useState(false);
  const [inputOtp, setInputOtp] = useState("");
  const [currentOtp, setCurrentOtp] = useState(sv.otp || "");
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [isDone, setIsDone] = useState(
    sv.type === "Done" || lead.status === "Site visit done" || lead.status === "Site Visit Done" || !!sv.verifiedAt
  );

  const verifyOTPAndMarkDone = async () => {
    const cleanInput = inputOtp.trim();
    const targetOtp = String(currentOtp || sv.otp || "").trim();

    if (cleanInput && targetOtp && cleanInput === targetOtp) {
      setLoading(true);
      try {
        await updateSiteVisitDetails(lead.id, { 
          ...sv, 
          type: "Done", 
          verifiedOtp: cleanInput,
          verifiedAt: new Date().toISOString() 
        });
        setIsDone(true);
      } catch (err) {
        console.error(err);
        alert("Failed to update status on server.");
      } finally {
        setLoading(false);
      }
    } else {
      alert("Invalid OTP! Please check the 6-digit OTP sent to the client.");
    }
  };

  const handleGenerateOrResendOtp = async () => {
    setLoading(true);
    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await updateSiteVisitDetails(lead.id, {
        ...sv,
        otp: newOtp
      });
      setCurrentOtp(newOtp);
      sv.otp = newOtp;

      if (lead.phone) {
        const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
        const msg = `Hi ${lead.name},\nYour Site Visit OTP is: *${newOtp}*.\nPlease share this with our executive at the site.`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
      } else {
        alert(`New OTP generated: ${newOtp}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-100 flex justify-between items-start">
        <div>
          <Link href={`/leads/${lead.id}`} className="font-bold text-gray-900 text-base hover:text-[#4f46e5] transition-colors">
            {lead.name}
          </Link>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-gray-500 text-xs">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center text-emerald-600 hover:underline">
                <Phone className="w-3 h-3 mr-1" /> {lead.phone}
              </a>
            )}
            {lead.assignedTo?.name && (
              <span className="flex items-center text-gray-500">
                <User className="w-3 h-3 mr-1 text-gray-400" /> {lead.assignedTo.name}
              </span>
            )}
          </div>
        </div>

        <div>
          {isDone ? (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-black flex items-center shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Completed
            </span>
          ) : (
            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center shadow-2xs">
              <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" /> Scheduled
            </span>
          )}
        </div>
      </div>
      
      <div className="p-4 bg-gray-50/50 flex-1 grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center">
            <Calendar className="w-3 h-3 mr-1 text-gray-400" /> Date
          </span>
          <span className="text-sm font-semibold text-gray-800">{sv.date || "Not set"}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center">
            <Clock className="w-3 h-3 mr-1 text-gray-400" /> Time
          </span>
          <span className="text-sm font-semibold text-gray-800">{sv.time || "Not set"}</span>
        </div>
        
        {sv.gmapLink && (
          <div className="col-span-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center">
              <MapPin className="w-3 h-3 mr-1 text-orange-500" /> Location
            </span>
            <a href={sv.gmapLink} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#4f46e5] hover:underline truncate block">
              {sv.gmapLink}
            </a>
          </div>
        )}
      </div>

      {/* Footer: Admin Overview vs Field Agent OTP Mode */}
      {overviewMode ? (
        <div className="p-3.5 border-t border-gray-100 bg-white space-y-2 text-xs">
          {isDone ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-emerald-700 font-semibold">
                <div className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                  <span>Completed by {lead.assignedTo?.name || "Field Executive"}</span>
                  {sv.verifiedAt && (
                    <span className="text-[11px] text-gray-400 font-normal ml-2">
                      ({new Date(sv.verifiedAt).toLocaleDateString()})
                    </span>
                  )}
                </div>
                <Link
                  href={`/leads/${lead.id}`}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-semibold transition-colors text-[11px]"
                >
                  <span>View Lead</span>
                  <ExternalLink className="w-3 h-3 ml-1 text-gray-400" />
                </Link>
              </div>

              {/* Checklist Confirmation Summary in Overview */}
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-lg space-y-1 text-[11px]">
                <div className="grid grid-cols-2 gap-1.5 text-emerald-900 font-medium">
                  {sv.roomsToRenovate && (
                    <div className="flex items-center">
                      <Home className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                      <span>{sv.roomsToRenovate}</span>
                    </div>
                  )}
                  {sv.nextMeetingDate && (
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                      <span>Next: {new Date(sv.nextMeetingDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {sv.photos && sv.photos.length > 0 && (
                    <div className="flex items-center">
                      <Camera className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                      <span>{sv.photos.length} Photos Captured</span>
                    </div>
                  )}
                  {sv.verifiedOtp && (
                    <div className="text-emerald-700 font-bold">
                      ✓ OTP Verified: {sv.verifiedOtp}
                    </div>
                  )}
                  {sv.measurements && (
                    <div className="col-span-2 text-gray-700 bg-white/70 p-1.5 rounded border border-emerald-100/70 whitespace-pre-wrap">
                      <span className="font-bold text-[10px] text-emerald-800">Measurements:</span> {sv.measurements}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-amber-700 font-medium">
                <Clock className="w-4 h-4 mr-1.5 text-amber-500" />
                <span>Awaiting visit by {lead.assignedTo?.name || "Field Team"}</span>
              </div>
              <Link
                href={`/leads/${lead.id}`}
                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-semibold transition-colors text-[11px]"
              >
                <span>View Lead</span>
                <ExternalLink className="w-3 h-3 ml-1.5 text-gray-400" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* Field Agent OTP Verification Section */
        <div className="p-4 border-t border-gray-100 bg-white">
          {isDone ? (
            <div className="p-3.5 bg-emerald-50 text-emerald-900 rounded-xl text-xs border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600 shrink-0" />
                  Site Visit Completed & OTP Verified
                </div>
                {sv.verifiedAt && (
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {new Date(sv.verifiedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Checklist details summary */}
              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-emerald-200/60 text-[11px]">
                {sv.roomsToRenovate && (
                  <div className="flex items-center text-emerald-800">
                    <Home className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                    <span>{sv.roomsToRenovate}</span>
                  </div>
                )}
                {sv.nextMeetingDate && (
                  <div className="flex items-center text-emerald-800">
                    <Calendar className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                    <span>Next: {new Date(sv.nextMeetingDate).toLocaleDateString()}</span>
                  </div>
                )}
                {sv.photos && sv.photos.length > 0 && (
                  <div className="flex items-center text-emerald-800">
                    <Camera className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                    <span>{sv.photos.length} Photo{sv.photos.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {sv.measurements && (
                  <div className="flex items-center text-emerald-800 col-span-2 truncate">
                    <Ruler className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                    <span className="truncate">{sv.measurements}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowChecklistModal(true)}
                className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 font-semibold text-[11px] transition-colors flex items-center justify-center cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5 mr-1" /> View / Update Checklist Details
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-1">
              <button
                type="button"
                onClick={() => setShowChecklistModal(true)}
                className="w-full bg-[#4f46e5] hover:bg-indigo-700 active:scale-98 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center shadow-md shadow-indigo-500/20 transition-all cursor-pointer mb-2.5"
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Enter OTP & Complete Checklist
              </button>

              <div className="w-full flex items-center gap-2 my-1">
                <div className="h-px bg-gray-200 flex-1" />
                <span className="text-[10px] text-gray-400 font-medium uppercase">or quick verify</span>
                <div className="h-px bg-gray-200 flex-1" />
              </div>

              {currentOtp ? (
                <div className="flex flex-col items-center gap-1.5 w-full mt-1">
                  <div className="flex gap-2 w-full">
                    <input 
                      type="text" 
                      value={inputOtp} 
                      onChange={e => setInputOtp(e.target.value)} 
                      placeholder="6-digit OTP" 
                      className="flex-1 text-center font-bold tracking-widest border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-[#4f46e5] text-xs" 
                    />
                    <button 
                      onClick={verifyOTPAndMarkDone} 
                      disabled={loading || !inputOtp.trim()} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center cursor-pointer shadow-xs"
                    >
                      {loading ? "..." : <><CheckCircle2 className="w-3.5 h-3.5 mr-1"/> Verify</>}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateOrResendOtp}
                    disabled={loading}
                    className="text-[11px] text-[#4f46e5] hover:underline flex items-center mt-0.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Resend OTP to Client
                  </button>
                </div>
              ) : (
                <div className="text-center mt-1">
                  <p className="text-[11px] text-amber-600 mb-1.5 font-medium">No OTP generated for this visit yet.</p>
                  <button
                    type="button"
                    onClick={handleGenerateOrResendOtp}
                    disabled={loading}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors flex items-center mx-auto shadow-xs cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 mr-1" /> Generate & Send OTP
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className="text-gray-400">Scheduled by Sales</span>
            <Link
              href={`/leads/${lead.id}`}
              className="inline-flex items-center text-[#4f46e5] hover:underline font-semibold"
            >
              <span>View Full Lead Details</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </div>
      )}

      {/* Checklist Modal */}
      <SiteVisitChecklistModal
        isOpen={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
        lead={lead}
        onSuccess={() => setIsDone(true)}
      />
    </div>
  );
}
