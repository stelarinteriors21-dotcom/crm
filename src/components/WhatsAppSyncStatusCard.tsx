"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, 
  Settings, Smartphone, RefreshCw, Download, ArrowRight, Info, Sparkles 
} from "lucide-react";

export default function WhatsAppSyncStatusCard() {
  const [isNative, setIsNative] = useState<boolean>(false);
  const [permissions, setPermissions] = useState<{
    accessibilityEnabled: boolean;
    notificationEnabled: boolean;
    filesAccessEnabled: boolean;
  }>({ accessibilityEnabled: false, notificationEnabled: false, filesAccessEnabled: false });
  const [checking, setChecking] = useState<boolean>(true);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const checkPermissions = async () => {
    setChecking(true);
    if (typeof window !== "undefined") {
      const capacitor = (window as any).Capacitor;
      const isApp = Boolean(capacitor && capacitor.isNativePlatform && capacitor.isNativePlatform());
      setIsNative(isApp);

      if (isApp && capacitor?.Plugins?.AndroidCallLog?.checkWhatsAppSyncPermissions) {
        try {
          const res = await capacitor.Plugins.AndroidCallLog.checkWhatsAppSyncPermissions();
          setPermissions({
            accessibilityEnabled: Boolean(res.accessibilityEnabled),
            notificationEnabled: Boolean(res.notificationEnabled),
            filesAccessEnabled: Boolean(res.filesAccessEnabled),
          });
        } catch (e) {
          console.warn("Error checking WA permissions:", e);
        }
      }
    }
    setChecking(false);
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  const handleOpenAccessibility = async () => {
    const capacitor = (window as any).Capacitor;
    if (capacitor?.Plugins?.AndroidCallLog?.openAccessibilitySettings) {
      await capacitor.Plugins.AndroidCallLog.openAccessibilitySettings();
    }
  };

  const handleOpenNotifications = async () => {
    const capacitor = (window as any).Capacitor;
    if (capacitor?.Plugins?.AndroidCallLog?.openNotificationListenerSettings) {
      await capacitor.Plugins.AndroidCallLog.openNotificationListenerSettings();
    }
  };

  const handleOpenFilesAccess = async () => {
    const capacitor = (window as any).Capacitor;
    if (capacitor?.Plugins?.AndroidCallLog?.requestAllFilesAccess) {
      await capacitor.Plugins.AndroidCallLog.requestAllFilesAccess();
    }
  };

  const handleOpenAppInfo = async () => {
    const capacitor = (window as any).Capacitor;
    if (capacitor?.Plugins?.AndroidCallLog?.openAppSettings) {
      await capacitor.Plugins.AndroidCallLog.openAppSettings();
    }
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    try {
      const res = await fetch("/api/mobile/whatsapp-sync?leadId=cmv67mtn100033dijnpy2342k");
      if (res.ok) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
      }
    } catch {
      setTestStatus("error");
    }
    setTimeout(() => setTestStatus(null), 4000);
  };

  const allActive = permissions.accessibilityEnabled && permissions.notificationEnabled && permissions.filesAccessEnabled;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden mb-6">
      <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight">WhatsApp 2-Way Sync Engine</h3>
              {isNative ? (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${allActive ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"}`}>
                  {allActive ? "🟢 100% Active" : "⚠️ Permissions Needed"}
                </span>
              ) : (
                <span className="text-[10px] font-medium bg-white/10 text-gray-300 px-2 py-0.5 rounded-full border border-white/10">
                  Desktop & Companion
                </span>
              )}
            </div>
            <p className="text-xs text-gray-300 mt-0.5">
              Syncs outgoing messages typed inside official WhatsApp & customer replies with 0% ban risk.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={checkPermissions}
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${checking ? "animate-spin" : ""}`} />
            Refresh Status
          </button>
          <a
            href="/Stelar-CRM.apk"
            download
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download APK
          </a>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {isNative ? (
          <>
            {/* Xiaomi HyperOS / Android 14 Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">Xiaomi HyperOS / Android 14 Setup Required:</div>
                <div className="text-[11px] text-amber-800 leading-relaxed">
                  Android disables accessibility on sideloaded APKs until allowed:
                  <ol className="list-decimal ml-4 mt-1 space-y-0.5 font-medium">
                    <li>Tap <strong>Open App Info ⚙️</strong> below</li>
                    <li>Tap <strong>⋮ (3 dots)</strong> in top-right corner → tap <strong>Allow restricted settings</strong></li>
                    <li>Turn ON <strong>Autostart</strong> & set <strong>Battery saver</strong> to <strong>No restrictions</strong></li>
                    <li>Return here and enable <strong>Outgoing & Incoming Sync</strong></li>
                  </ol>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleOpenAppInfo}
                    className="inline-flex items-center px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-md transition-colors"
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Open App Info ⚙️
                  </button>
                </div>
              </div>
            </div>

            {/* Permission Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Outgoing Message Capture */}
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">1. Outgoing Message Sync</span>
                    {permissions.accessibilityEnabled ? (
                      <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3 mr-1 text-rose-600" /> Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                    Captures chats typed directly in WhatsApp and syncs to CRM in real-time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAccessibility}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                    permissions.accessibilityEnabled 
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200" 
                      : "bg-[#4f46e5] hover:bg-indigo-700 text-white shadow-xs"
                  }`}
                >
                  {permissions.accessibilityEnabled ? "Modify in Accessibility ⚙️" : "Enable Accessibility Service 🟢"}
                </button>
              </div>

              {/* Incoming Replies Capture */}
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">2. Customer Replies Sync</span>
                    {permissions.notificationEnabled ? (
                      <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3 mr-1 text-rose-600" /> Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                    Reads incoming WhatsApp replies from notifications and updates chat history.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenNotifications}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                    permissions.notificationEnabled 
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200" 
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  }`}
                >
                  {permissions.notificationEnabled ? "Modify in Notifications ⚙️" : "Enable Notification Access 🟢"}
                </button>
              </div>

              {/* Call Recordings Access (Xiaomi / Android 14) */}
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between space-y-2 sm:col-span-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">3. Call Recordings Audio Sync (Xiaomi HyperOS / Android 14)</span>
                    {permissions.filesAccessEnabled ? (
                      <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Active (Storage Access Granted)
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[11px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" /> Restricted by Android 14
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                    Allows Stelar CRM to access native Xiaomi MIUI Sound Recorder files (<code>MIUI/sound_recorder/call_rec</code>) so calls automatically attach high-quality audio recordings without manual upload.
                  </p>
                </div>
                {!permissions.filesAccessEnabled ? (
                  <button
                    type="button"
                    onClick={handleOpenFilesAccess}
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center transition-all bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                  >
                    Grant All Files Access (Call Recordings) 🎙️
                  </button>
                ) : (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                    <span>✓ Phone recorder directory accessible. Auto-sync active.</span>
                    <button
                      type="button"
                      onClick={handleOpenFilesAccess}
                      className="text-gray-500 hover:text-gray-700 underline text-[10px]"
                    >
                      Storage Settings
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Company Phone Setup Guide
              </div>
              <p className="text-[11px] text-slate-600 max-w-xl leading-relaxed">
                Install the <strong>Stelar CRM Mobile App</strong> on the company phone to activate automatic 2-way WhatsApp tracking. Chats sent or received directly on that phone sync straight to the CRM.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleTestConnection}
                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors text-[11px]"
              >
                {testStatus === "testing" ? "Testing..." : testStatus === "success" ? "✓ Sync Server Online" : testStatus === "error" ? "✕ Server Offline" : "Test Sync API"}
              </button>
              <a
                href="/Stelar-CRM.apk"
                download
                className="px-3.5 py-1.5 bg-[#4f46e5] hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors text-[11px] shadow-2xs"
              >
                Download Stelar APK
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
