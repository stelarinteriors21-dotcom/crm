"use client";

import React, { useState } from "react";
import { KeyRound, CheckCircle2, Camera, Calendar, Clock, Ruler, Home, X, RefreshCw, Upload, AlertCircle, Trash2 } from "lucide-react";
import { updateSiteVisitDetails } from "@/app/actions/leadActions";
import { useRouter } from "next/navigation";

interface SiteVisitChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  onSuccess?: () => void;
}

export default function SiteVisitChecklistModal({
  isOpen,
  onClose,
  lead,
  onSuccess
}: SiteVisitChecklistModalProps) {
  const router = useRouter();
  const sv = lead?.customFields?.siteVisit || {};

  const [inputOtp, setInputOtp] = useState("");
  const [currentOtp, setCurrentOtp] = useState(sv.otp || "");
  const [roomsToRenovate, setRoomsToRenovate] = useState(sv.roomsToRenovate || "3 Rooms");
  const [customRooms, setCustomRooms] = useState("");
  const [measurements, setMeasurements] = useState(sv.measurements || "");
  const [photos, setPhotos] = useState<string[]>(Array.isArray(sv.photos) ? sv.photos : []);
  const [nextMeetingDate, setNextMeetingDate] = useState(sv.nextMeetingDate || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen || !lead) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResendOtp = async () => {
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
        const cleanPhone = String(lead.phone).replace(/[^0-9]/g, "");
        const msg = `Hi ${lead.name},\nYour Site Visit OTP is: *${newOtp}*.\nPlease share this with our executive at the site.`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
      } else {
        alert(`New OTP generated: ${newOtp}`);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to generate and resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const finalRooms = customRooms.trim() || roomsToRenovate;

    setLoading(true);
    try {
      await updateSiteVisitDetails(lead.id, {
        ...sv,
        type: "Done",
        verifiedAt: new Date().toISOString(),
        roomsToRenovate: finalRooms,
        measurements: measurements.trim(),
        photos: photos,
        nextMeetingDate: nextMeetingDate
      });

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to submit checklist and mark site visit as completed.");
      setLoading(false);
    }
  };

  const setPresetDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const dateStr = d.toISOString().split("T")[0];
    setNextMeetingDate(`${dateStr}T11:00`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold leading-tight">Complete Site Visit</h2>
              <p className="text-[11px] text-indigo-100 truncate max-w-[280px]">
                {lead.name} {lead.phone ? `· ${lead.phone}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Site Visit Completed & Checklist Saved Successfully!</span>
            </div>
          )}

          {/* 1. Number of Rooms to Renovate */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-gray-500" />
              Number of Rooms to Renovate
            </label>
            <div className="flex flex-wrap gap-1.5">
              {["1 Room", "2 Rooms", "3 Rooms", "4 Rooms", "Full Villa / 5+"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setRoomsToRenovate(option);
                    setCustomRooms("");
                  }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold border transition-all ${
                    roomsToRenovate === option && !customRooms
                      ? "bg-[#4f46e5] text-white border-[#4f46e5] shadow-xs"
                      : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Or specify custom (e.g. 3BHK + Terrace Kitchen)"
              value={customRooms}
              onChange={(e) => setCustomRooms(e.target.value)}
              className="w-full text-xs px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
            />
          </div>

          {/* 3. Measurements & Site Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-gray-500" />
              Measurements & Site Details
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Total Area: ~1400 sq ft. Living: 18x14 ft, Master Bedroom: 14x12 ft, Modular kitchen required with acrylic finish..."
              value={measurements}
              onChange={(e) => setMeasurements(e.target.value)}
              className="w-full text-xs p-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* 4. Site Photos */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-gray-500" />
                Site Photos ({photos.length})
              </label>
              <label className="cursor-pointer text-[11px] font-bold text-[#4f46e5] hover:underline flex items-center">
                <Upload className="w-3 h-3 mr-1" /> Add Photos
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {photos.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto p-1 bg-gray-50 rounded-xl border border-gray-100">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-100">
                    <img src={photo} alt={`Site photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <label className="border border-dashed border-gray-200 hover:border-indigo-300 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 hover:bg-indigo-50/20 transition-colors">
                <Camera className="w-5 h-5 text-gray-400 mb-1" />
                <span className="text-[11px] text-gray-500 font-medium">Click to take or upload site photos</span>
                <span className="text-[10px] text-gray-400">Supports camera capture on mobile</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* 5. Next Meeting Date */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                Next Meeting Date (Quotation Presentation)
              </label>
              <div className="flex gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPresetDate(2)}
                  className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded font-medium"
                >
                  +2 Days
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDate(4)}
                  className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded font-medium"
                >
                  +4 Days
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDate(7)}
                  className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded font-medium"
                >
                  +1 Week
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              value={nextMeetingDate}
              onChange={(e) => setNextMeetingDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center cursor-pointer"
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Complete Site Visit & Save Checklist
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
