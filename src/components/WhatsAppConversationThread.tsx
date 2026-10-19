"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, CheckCheck, Clock, User, ArrowDownLeft, ArrowUpRight, ShieldCheck, Sparkles, Smartphone, RefreshCw } from "lucide-react";
import { formatDeterministicDateTime } from "@/lib/dateUtils";

interface WhatsAppMessage {
  id: string;
  leadId: string;
  direction: string; // "INBOUND" or "OUTBOUND"
  message: string;
  status: string;
  createdAt: Date | string;
}

interface Props {
  leadId: string;
  leadName: string;
  phone: string | null;
  siteVisitOtp?: string | null;
  messages: WhatsAppMessage[];
}

export default function WhatsAppConversationThread({
  leadId,
  leadName,
  phone,
  siteVisitOtp,
  messages = [],
}: Props) {
  const [chatMessages, setChatMessages] = useState<WhatsAppMessage[]>(messages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [waPerms, setWaPerms] = useState<{ accessibilityEnabled: boolean; notificationEnabled: boolean } | null>(null);

  const checkSyncPerms = async () => {
    if (typeof window !== "undefined") {
      const capacitor = (window as any).Capacitor;
      if (capacitor?.isNativePlatform && capacitor.isNativePlatform() && capacitor?.Plugins?.AndroidCallLog?.checkWhatsAppSyncPermissions) {
        try {
          const res = await capacitor.Plugins.AndroidCallLog.checkWhatsAppSyncPermissions();
          setWaPerms({
            accessibilityEnabled: Boolean(res.accessibilityEnabled),
            notificationEnabled: Boolean(res.notificationEnabled),
          });
        } catch (e) {
          console.warn("Could not check WA permissions:", e);
        }
      }
    }
  };

  useEffect(() => {
    checkSyncPerms();
  }, []);

  const handleOpenAccessibility = async () => {
    const capacitor = (window as any).Capacitor;
    if (capacitor?.Plugins?.AndroidCallLog?.openAccessibilitySettings) {
      await capacitor.Plugins.AndroidCallLog.openAccessibilitySettings();
    }
  };

  const handleOpenNotificationAccess = async () => {
    const capacitor = (window as any).Capacitor;
    if (capacitor?.Plugins?.AndroidCallLog?.openNotificationListenerSettings) {
      await capacitor.Plugins.AndroidCallLog.openNotificationListenerSettings();
    }
  };

  // Auto-resize textarea to fit full message and remove vertical scrollbar
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.max(68, scrollHeight)}px`;
    }
  }, [draft]);

  // Sync when initial messages prop changes
  useEffect(() => {
    if (messages && messages.length > 0) {
      setChatMessages(messages);
    }
  }, [messages]);

  // Prime native Android SharedPreferences so WhatsAppAccessibilityService knows the active lead
  useEffect(() => {
    if (typeof window !== "undefined") {
      const capacitor = (window as any).Capacitor;
      if (capacitor?.Plugins?.AndroidCallLog?.saveActiveLead) {
        const primaryUrl = window.location.origin.includes("localhost")
          ? "https://bullet-lounge-ccd-tri.trycloudflare.com"
          : window.location.origin;

        capacitor.Plugins.AndroidCallLog.saveActiveLead({
          leadId,
          leadName,
          phone,
          serverUrl: primaryUrl,
        }).catch(() => {});
      }
    }
  }, [leadId, leadName, phone]);

  // Live polling every 3 seconds to catch messages sent on WhatsApp app or web
  const fetchLatestMessages = async () => {
    if (!leadId) return;
    try {
      const res = await fetch(`/api/mobile/whatsapp-sync?leadId=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          setChatMessages(data.messages);
        }
      }
    } catch (e) {
      console.error("Error refreshing WhatsApp messages:", e);
    }
  };

  useEffect(() => {
    fetchLatestMessages();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchLatestMessages();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [leadId]);

  // Auto-scroll to bottom when chat messages change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchLatestMessages();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Sort chronological for chat view (oldest to newest)
  const sortedMessages = [...chatMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const handleSendDraft = async (textToSend: string) => {
    if (!textToSend.trim() || !formattedPhone) return;

    setSending(true);
    const tempId = "temp-" + Date.now();
    const optimisticMsg: WhatsAppMessage = {
      id: tempId,
      leadId,
      direction: "OUTBOUND",
      message: textToSend.trim(),
      status: "SENT",
      createdAt: new Date().toISOString(),
    };

    // 1. Optimistically display in conversation immediately
    setChatMessages((prev) => [...prev, optimisticMsg]);
    setDraft("");

    try {
      // 2. Record outbound in database
      const res = await fetch("/api/mobile/whatsapp-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formattedPhone,
          contactName: leadName,
          message: textToSend.trim(),
          direction: "OUTBOUND",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.log) {
          setChatMessages((prev) =>
            prev.map((m) => (m.id === tempId ? data.log : m))
          );
        }
      }

      // 3. Open official WhatsApp Web / Mobile chat
      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(textToSend.trim())}`;
      window.open(waUrl, "_blank");
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleUseOtpTemplate = () => {
    if (siteVisitOtp) {
      setDraft(`Hello ${leadName},\n\nYour 6-digit site visit verification OTP for Stelar Interiors is: *${siteVisitOtp}*.\n\nPlease share this with our executive upon arrival.`);
    } else {
      setDraft(`Hello ${leadName},\n\nThank you for choosing Stelar Interiors. We look forward to meeting you for your scheduled site visit.`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-[#075e54] text-white px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-sm">
            {leadName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-sm flex items-center gap-1.5">
              <span>{leadName}</span>
              <span className="text-[10px] font-medium bg-emerald-700/80 px-2 py-0.5 rounded-full border border-emerald-400/30">
                WhatsApp
              </span>
            </div>
            <div className="text-[11px] text-emerald-100 flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              <span>{phone || "No phone registered"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleManualRefresh}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-100 transition-colors"
            title="Refresh WhatsApp Messages"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Sync Permission Status Alert (when on Android app and permissions needed) */}
      {waPerms && (!waPerms.accessibilityEnabled || !waPerms.notificationEnabled) && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-amber-800">⚠️ WhatsApp Sync:</span>
            <span>
              {!waPerms.accessibilityEnabled && !waPerms.notificationEnabled
                ? "Turn ON Accessibility & Notification Access"
                : !waPerms.accessibilityEnabled
                ? "Accessibility Service is OFF or was suspended by Android update"
                : "Notification Access is OFF"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!waPerms.accessibilityEnabled && (
              <button
                type="button"
                onClick={handleOpenAccessibility}
                className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-semibold px-2.5 py-1 rounded-lg text-[11px] shadow-xs"
              >
                Turn ON Accessibility
              </button>
            )}
            {!waPerms.notificationEnabled && (
              <button
                type="button"
                onClick={handleOpenNotificationAccess}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold px-2.5 py-1 rounded-lg text-[11px] shadow-xs"
              >
                Turn ON Notification Access
              </button>
            )}
            <button
              type="button"
              onClick={checkSyncPerms}
              className="text-amber-800 underline text-[11px] font-medium ml-1"
            >
              Recheck
            </button>
          </div>
        </div>
      )}

      {/* Messages Canvas */}
      <div 
        ref={scrollContainerRef}
        className="p-3.5 sm:p-4 space-y-3 overflow-y-auto min-h-[140px] max-h-[380px] bg-[#efeae2]/50"
        style={{
          backgroundImage: "radial-gradient(#0000000d 1px, transparent 1px)",
          backgroundSize: "16px 16px"
        }}
      >
        {sortedMessages.length === 0 ? (
          <div className="text-center py-5 px-3">
            <div className="w-9 h-9 bg-emerald-100/70 rounded-full flex items-center justify-center mx-auto mb-1.5 text-emerald-700">
              <MessageCircle className="w-4.5 h-4.5" />
            </div>
            <h4 className="text-xs font-bold text-gray-700">No WhatsApp messages recorded yet</h4>
            <p className="text-[11px] text-gray-500 max-w-sm mx-auto mt-0.5 leading-relaxed">
              When the client replies on WhatsApp or your executive chats on the company phone, messages sync automatically right here.
            </p>
          </div>
        ) : (
          sortedMessages.map((msg) => {
            const isInbound = msg.direction === "INBOUND";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs ${
                    isInbound
                      ? "bg-white text-gray-900 border border-gray-200/70 rounded-tl-xs"
                      : "bg-[#d9fdd3] text-gray-900 border border-emerald-200/70 rounded-tr-xs"
                  }`}
                >
                  {/* Sender Tag */}
                  <div className="flex items-center gap-1 text-[10px] font-bold mb-1 opacity-70">
                    {isInbound ? (
                      <span className="text-emerald-700 flex items-center">
                        <ArrowDownLeft className="w-3 h-3 mr-0.5" /> Client (Incoming)
                      </span>
                    ) : (
                      <span className="text-blue-700 flex items-center">
                        <ArrowUpRight className="w-3 h-3 mr-0.5" /> Team (Outgoing)
                      </span>
                    )}
                  </div>

                  {/* Message Body */}
                  <p className="whitespace-pre-wrap leading-relaxed select-text font-normal">
                    {msg.message}
                  </p>

                  {/* Timestamp & Status */}
                  <div className="flex items-center justify-end gap-1 text-[9px] text-gray-400 mt-1">
                    <span>{formatDeterministicDateTime(msg.createdAt)}</span>
                    {!isInbound && <CheckCheck className="w-3 h-3 text-emerald-600" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Template Chips */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Quick Templates:</span>
        {siteVisitOtp && (
          <button
            type="button"
            onClick={handleUseOtpTemplate}
            className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition-colors"
          >
            🔑 Site Visit OTP ({siteVisitOtp})
          </button>
        )}
        <button
          type="button"
          onClick={() => setDraft(`Hello ${leadName},\n\nFollowing up regarding your inquiry with Stelar Interiors. When would be a good time to speak?`)}
          className="text-[11px] font-medium bg-white text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          👋 Introduction
        </button>
        <button
          type="button"
          onClick={() => setDraft(`Hello ${leadName},\n\nYour preliminary quotation and project estimate are ready for review. Please let us know if you have any questions!`)}
          className="text-[11px] font-medium bg-white text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          📄 Quotation Ready
        </button>
      </div>

      {/* Reply Input Bar */}
      <div className="p-3 bg-white border-t border-gray-200 flex items-end gap-2.5">
        <textarea
          ref={textareaRef}
          rows={3}
          style={{ minHeight: "90px" }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Type a WhatsApp message to ${leadName}... (Press Enter to send, Shift+Enter for new line)`}
          className="flex-1 text-[13px] bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#25D366]/20 focus:border-[#25D366] resize-y overflow-hidden leading-relaxed text-gray-800 transition-[height] duration-75"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendDraft(draft);
            }
          }}
        />
        <button
          type="button"
          onClick={() => handleSendDraft(draft)}
          disabled={sending || !draft.trim() || !phone}
          className="bg-[#25D366] hover:bg-emerald-600 active:scale-95 text-white font-bold h-11 w-11 rounded-xl transition-all disabled:opacity-40 shadow-sm shrink-0 flex items-center justify-center mb-0.5"
          title="Send on WhatsApp"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
