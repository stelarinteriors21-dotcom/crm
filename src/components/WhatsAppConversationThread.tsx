"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, CheckCheck, Clock, User, ArrowDownLeft, ArrowUpRight, ShieldCheck, Sparkles, Smartphone, RefreshCw, FileText, Image as ImageIcon, Mic, Play, Trash2, ExternalLink } from "lucide-react";
import { formatDeterministicDateTime } from "@/lib/dateUtils";
import { clearLeadWhatsAppChatAction, sendWhatsAppMessageAction, getWhatsAppApiConfig, WhatsAppApiConfig } from "@/app/actions/whatsAppActions";

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
  const [clearing, setClearing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiConfig, setApiConfig] = useState<WhatsAppApiConfig | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    getWhatsAppApiConfig().then((cfg) => setApiConfig(cfg)).catch(() => {});
  }, []);

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

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // If user is within 70px of the bottom, consider them at the bottom
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 70;
    isUserScrolledUpRef.current = !isAtBottom;
  };

  // Live polling every 4 seconds to catch messages sent on WhatsApp app or web
  const fetchLatestMessages = async () => {
    if (!leadId) return;
    try {
      const res = await fetch(`/api/mobile/whatsapp-sync?leadId=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          setChatMessages((prev) => {
            // Deduplicate: avoid re-triggering state & re-renders if messages haven't changed
            if (
              prev.length === data.messages.length &&
              (prev.length === 0 || prev[prev.length - 1]?.id === data.messages[data.messages.length - 1]?.id)
            ) {
              return prev; // Return same reference so useEffect([chatMessages]) won't fire
            }
            return data.messages;
          });
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

  // Auto-scroll to bottom ONLY if initial load or user is not scrolled up reading past history
  useEffect(() => {
    if (scrollContainerRef.current) {
      if (isFirstLoadRef.current || !isUserScrolledUpRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        if (isFirstLoadRef.current && chatMessages.length > 0) {
          isFirstLoadRef.current = false;
        }
      }
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

  const handleClearChat = async () => {
    if (!confirm(`Are you sure you want to clear the entire WhatsApp chat history for ${leadName}? This cannot be undone.`)) {
      return;
    }
    setClearing(true);
    try {
      const res = await clearLeadWhatsAppChatAction(leadId);
      if (res.success) {
        setChatMessages([]);
      } else {
        alert(res.error || "Failed to clear chat");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error clearing chat.");
    } finally {
      setClearing(false);
    }
  };

  const handleSendDraft = async (textToSend: string, forceWebOpen: boolean = false) => {
    if (!textToSend.trim() || !formattedPhone) return;

    isUserScrolledUpRef.current = false;
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
      // 2. Dispatch via Cloud API if connected, and persist to database
      const res = await sendWhatsAppMessageAction({
        leadId,
        phone: formattedPhone,
        message: textToSend.trim(),
      });

      if (res.success && res.log) {
        setChatMessages((prev) =>
          prev.map((m) => (m.id === tempId ? res.log : m))
        );
      }

      // 3. If API is not connected or user explicitly asked for web open, open WhatsApp Web/App
      if (!apiConfig?.isConnected || forceWebOpen) {
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(textToSend.trim())}`;
        window.open(waUrl, "_blank");
      }
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
          {apiConfig?.isConnected ? (
            <span 
              className="text-[10px] font-semibold bg-emerald-700 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/40 flex items-center gap-1 cursor-default"
              title="Cloud API Active - messages sent automatically from company API number"
            >
              <Sparkles className="w-2.5 h-2.5 text-amber-300" /> Cloud API
            </span>
          ) : (
            <span 
              className="text-[10px] text-emerald-200 bg-white/10 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1 cursor-default"
              title="Web Mode - messages open via WhatsApp Web or mobile app"
            >
              Web Mode
            </span>
          )}

          <button
            type="button"
            onClick={handleClearChat}
            disabled={clearing || chatMessages.length === 0}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/90 text-emerald-100 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-white/10 cursor-pointer"
            title="Clear WhatsApp Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleManualRefresh}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-100 transition-colors cursor-pointer"
            title="Refresh WhatsApp Messages"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Messages Canvas */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
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
                  {msg.message.startsWith("📄 Document:") ? (
                    <div className="flex items-center gap-2.5 p-2.5 bg-white/95 border border-slate-200/90 rounded-xl my-1 shadow-2xs">
                      <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] uppercase font-bold text-red-600 tracking-wider">Document / PDF</div>
                        <div className="text-xs font-semibold text-slate-800 break-all">{msg.message.replace("📄 Document:", "").trim()}</div>
                      </div>
                    </div>
                  ) : msg.message.startsWith("📷 Photo") ? (
                    <div className="rounded-xl overflow-hidden border border-gray-200/90 bg-white/95 my-1 shadow-2xs min-w-[220px] max-w-[280px]">
                      {/* Visual Photo Card Representation */}
                      <div className="h-28 bg-gradient-to-br from-slate-100 via-indigo-50/60 to-slate-200 flex flex-col items-center justify-center p-3 relative select-none">
                        <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-indigo-600 mb-1.5">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 tracking-tight">Photo / Floor Plan</span>
                        <span className="text-[9px] text-slate-400">Image attachment</span>
                      </div>
                      {msg.message.replace(/^📷 Photo:?\s*/, "").replace("Photo / Drawing Attachment", "").replace("Photo Attachment", "").trim() && (
                        <div className="p-2 text-xs text-slate-800 bg-white border-t border-slate-100 font-medium">
                          {msg.message.replace(/^📷 Photo:?\s*/, "").trim()}
                        </div>
                      )}
                    </div>
                  ) : msg.message.startsWith("🎙️ Voice Note") ? (
                    <div className="flex items-center gap-3 p-2.5 bg-white/95 border border-emerald-200/90 rounded-2xl my-1 shadow-2xs min-w-[220px]">
                      {/* WhatsApp-Style Circular Play Button */}
                      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 select-none">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                      {/* Audio Soundwave Bars Representation */}
                      <div className="flex-1 flex flex-col justify-center select-none">
                        <div className="flex items-center gap-[2px] h-5 mb-1">
                          {[40, 75, 30, 95, 60, 100, 45, 80, 50, 90, 35, 75, 60, 85, 40, 70, 90, 50].map((h, i) => (
                            <div 
                              key={i} 
                              className="w-[3px] bg-emerald-500/80 rounded-full" 
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1"><Mic className="w-3 h-3 text-emerald-600" /> Voice Note</span>
                          <span className="font-semibold text-slate-700">{msg.message.match(/\d+:\d{2}/)?.[0] || "0:23"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed select-text font-normal">
                      {msg.message}
                    </p>
                  )}

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
        <button
          type="button"
          onClick={() => setDraft(`Hello ${leadName},\n\nYour site visit has been scheduled with Stelar Interiors. Our executive will visit your property at the scheduled time.\n\nPlease feel free to let us know if you need to reschedule. Thank you!`)}
          className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition-colors"
        >
          📍 Site Visit Scheduled
        </button>
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
        <div className="flex flex-col gap-1 shrink-0 mb-0.5 items-center">
          <button
            type="button"
            onClick={() => handleSendDraft(draft, false)}
            disabled={sending || !draft.trim() || !phone}
            className="bg-[#25D366] hover:bg-emerald-600 active:scale-95 text-white font-bold h-11 w-11 rounded-xl transition-all disabled:opacity-40 shadow-sm flex items-center justify-center cursor-pointer"
            title={apiConfig?.isConnected ? "Send directly via WhatsApp Cloud API" : "Send on WhatsApp (opens Web/App)"}
          >
            <Send className="w-5 h-5" />
          </button>
          
          {apiConfig?.isConnected && (
            <button
              type="button"
              onClick={() => handleSendDraft(draft, true)}
              disabled={sending || !draft.trim() || !phone}
              className="text-[9px] font-semibold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded px-1.5 py-0.5 flex items-center justify-center transition-colors cursor-pointer"
              title="Send and also open WhatsApp Web"
            >
              <ExternalLink className="w-2.5 h-2.5 mr-0.5" /> Web
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
