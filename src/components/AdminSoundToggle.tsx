"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { toggleGlobalSoundMuted } from "@/app/actions/settingsActions";
import { AlertNotificationManager } from "@/lib/alertNotifier";

export default function AdminSoundToggle({
  isAdmin = false,
  initialMuted = false,
}: {
  isAdmin?: boolean;
  initialMuted?: boolean;
}) {
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsMuted(initialMuted);
    AlertNotificationManager.setGlobalMuted(initialMuted);
  }, [initialMuted]);

  useEffect(() => {
    const handleGlobalChange = (e: any) => {
      if (typeof e.detail?.muted === "boolean") {
        setIsMuted(e.detail.muted);
      }
    };
    window.addEventListener("crm_global_sound_changed", handleGlobalChange);
    return () => {
      window.removeEventListener("crm_global_sound_changed", handleGlobalChange);
    };
  }, []);

  const handleToggle = async () => {
    if (!isAdmin || loading) return;

    setLoading(true);
    const nextState = !isMuted;
    // Optimistic UI update
    setIsMuted(nextState);
    AlertNotificationManager.setGlobalMuted(nextState);

    try {
      const res = await toggleGlobalSoundMuted();
      setIsMuted(res.muted);
      AlertNotificationManager.setGlobalMuted(res.muted);
      window.dispatchEvent(
        new CustomEvent("crm_global_sound_changed", { detail: { muted: res.muted } })
      );
    } catch (err: any) {
      // Rollback on failure
      setIsMuted(!nextState);
      AlertNotificationManager.setGlobalMuted(!nextState);
      alert(err.message || "Failed to toggle sound setting");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    if (!isMuted) return null;
    return (
      <div 
        className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 select-none shadow-2xs"
        title="All CRM notification sounds are muted globally by Administrator"
      >
        <VolumeX className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        <span className="hidden md:inline">Sounds Muted</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
        isMuted
          ? "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300 ring-2 ring-rose-400/30"
          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
      }`}
      title={
        isMuted
          ? "All CRM sounds are MUTED globally for every user. Click to Unmute."
          : "CRM sounds are ACTIVE for all users. Click to Mute All CRM Sounds globally."
      }
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
      ) : isMuted ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
          </span>
          <VolumeX className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="hidden sm:inline">Sounds Muted (All Users)</span>
          <span className="sm:hidden">Muted</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="hidden sm:inline">CRM Sounds On</span>
          <span className="sm:hidden">Sounds On</span>
        </>
      )}
    </button>
  );
}
