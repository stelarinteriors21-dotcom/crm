"use client";

import React, { useState, useEffect } from "react";
import { 
  X, MessageSquare, Send, CheckCircle2, Clock, Sparkles, 
  User, RefreshCw, Eye, AlertCircle, ShieldCheck, ChevronRight
} from "lucide-react";
import { getMorningDispatchData, dispatchMorningMessage } from "@/app/actions/morningActions";

interface MorningLead {
  id: string;
  name: string;
  phone: string;
  status: string;
  assignedTo: string;
  assignedToId: string | null;
  contextSnippet: string;
  suggestedMessage: string;
  sentToday: boolean;
  sentAt: string | null;
  lastMessage: string | null;
}

interface AuditLog {
  id: string;
  userName: string;
  details: string;
  time: string;
}

export default function MorningDispatchModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<MorningLead[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, pending: 0, percent: 0 });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "SENT">("ALL");
  const [selectedCaller, setSelectedCaller] = useState<string>("ALL");
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getMorningDispatchData();
      setLeads(data.leads);
      setStats(data.stats);
      setAuditLogs(data.auditLogs);
      setIsAdmin(data.isAdmin);

      // Initialize editable message state
      const initialMsgs: Record<string, string> = {};
      data.leads.forEach((l) => {
        initialMsgs[l.id] = l.suggestedMessage;
      });
      setMessages(initialMsgs);
    } catch (err) {
      console.error("Failed to load morning dispatch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMessageChange = (leadId: string, text: string) => {
    setMessages((prev) => ({ ...prev, [leadId]: text }));
  };

  const handleSend = async (lead: MorningLead) => {
    const textToSend = messages[lead.id] || lead.suggestedMessage;
    const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
    
    // Open WhatsApp Web / App
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToSend)}`;
    window.open(waUrl, "_blank");

    // Optimistically update UI
    setSendingId(lead.id);
    try {
      const res = await dispatchMorningMessage(lead.id, textToSend);
      if (res.success) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id
              ? { ...l, sentToday: true, sentAt: res.sentAt, lastMessage: textToSend }
              : l
          )
        );
        setStats((prev) => {
          const newSent = prev.sent + 1;
          const newPending = Math.max(0, prev.pending - 1);
          return {
            ...prev,
            sent: newSent,
            pending: newPending,
            percent: Math.round((newSent / prev.total) * 100),
          };
        });
      }
    } catch (err) {
      console.error("Error logging dispatch:", err);
    } finally {
      setSendingId(null);
    }
  };

  // Tone quick templates
  const applyTone = (leadId: string, leadName: string, tone: "FRIENDLY" | "FORMAL" | "OFFER") => {
    const firstName = leadName.split(" ")[0];
    let newMsg = "";
    if (tone === "FRIENDLY") {
      newMsg = `Hey ${firstName}! ☀️ Hope you're having an awesome morning. Just checking in from Stelar Interiors to see how your project plans are coming along. Let us know if you want to chat today!`;
    } else if (tone === "FORMAL") {
      newMsg = `Dear ${firstName}, good morning from Stelar Interiors. We are reviewing our scheduled follow-ups and would like to confirm your convenience for a brief consultation today. Kind regards.`;
    } else if (tone === "OFFER") {
      newMsg = `Good morning ${firstName}! Stelar Interiors has released a fresh design lookbook with modular concepts that fit your style. Would you like us to share the PDF catalog directly on this chat? 🎨`;
    }
    setMessages((prev) => ({ ...prev, [leadId]: newMsg }));
  };

  // Unique callers list for admin filter
  const callersList = Array.from(new Set(leads.map((l) => l.assignedTo))).filter(Boolean);

  const filteredLeads = leads.filter((l) => {
    if (filter === "PENDING" && l.sentToday) return false;
    if (filter === "SENT" && !l.sentToday) return false;
    if (selectedCaller !== "ALL" && l.assignedTo !== selectedCaller) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
        
        {/* Top Header */}
        <div className="p-5 md:px-7 border-b border-gray-200 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/40 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">
                  Morning AI WhatsApp Dispatch
                </h2>
                <span className="bg-purple-100 text-purple-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  AI Context Engine
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">
                AI reads call recordings, transcripts & notes to craft personalized client messages every morning.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAudit(!showAudit)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                showAudit 
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              {showAudit ? "Hide Audit Log" : "Audit Tracking"}
            </button>
            <button
              onClick={loadData}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress & Accountability Bar */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600">Today's Dispatch:</span>
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                {stats.sent} / {stats.total} Sent ({stats.percent}%)
              </span>
            </div>

            <div className="w-32 bg-gray-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-green-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.percent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter tabs */}
            <div className="flex bg-white p-1 rounded-lg border border-gray-200 text-xs font-bold shadow-2xs">
              <button
                onClick={() => setFilter("ALL")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filter === "ALL" ? "bg-indigo-600 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilter("PENDING")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filter === "PENDING" ? "bg-amber-500 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Pending ({stats.pending})
              </button>
              <button
                onClick={() => setFilter("SENT")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filter === "SENT" ? "bg-emerald-600 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Sent ({stats.sent})
              </button>
            </div>

            {/* Admin Caller Selector */}
            {isAdmin && callersList.length > 0 && (
              <select
                value={selectedCaller}
                onChange={(e) => setSelectedCaller(e.target.value)}
                className="bg-white border border-gray-200 text-xs font-bold text-gray-700 px-3 py-1.5 rounded-lg outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Callers ({callersList.length})</option>
                {callersList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Audit Log Drawer if toggled */}
        {showAudit && (
          <div className="bg-slate-900 text-slate-100 p-4 px-6 border-b border-slate-800 max-h-48 overflow-y-auto shrink-0 animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Live Employee Click Audit Trail (Today)
              </span>
              <span className="text-[11px] text-slate-500">
                Audited upon each employee WhatsApp button click
              </span>
            </div>
            {auditLogs.length === 0 ? (
              <div className="text-xs text-slate-500 py-3 text-center italic">
                No morning messages clicked or sent yet today.
              </div>
            ) : (
              <div className="space-y-1.5">
                {auditLogs.map((log) => (
                  <div key={log.id} className="text-xs font-mono flex items-center justify-between bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-emerald-400 font-bold">[{log.userName}]</span>
                      <span className="text-slate-300 truncate">{log.details}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-4">{log.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Body: List of Leads */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 space-y-4">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs font-bold">AI is scanning call notes & generating morning messages...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
              <h3 className="text-base font-bold text-gray-700">No Messages Found</h3>
              <p className="text-xs text-gray-400 mt-1">
                {filter === "PENDING" 
                  ? "All morning follow-ups for this selection have been dispatched! 🎉" 
                  : "No active leads match the current filters."}
              </p>
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const currentMsg = messages[lead.id] ?? lead.suggestedMessage;
              const isSending = sendingId === lead.id;

              return (
                <div 
                  key={lead.id}
                  className={`bg-white rounded-xl border p-4 md:p-5 shadow-xs transition-all ${
                    lead.sentToday 
                      ? "border-emerald-200 bg-emerald-50/20" 
                      : "border-gray-200 hover:border-indigo-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    
                    {/* Left: Lead Info & AI Extracted Context */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                          {lead.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-gray-900">{lead.name}</h4>
                            <span className="text-xs font-bold text-gray-500">{lead.phone}</span>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                              {lead.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1 font-medium">
                              <User className="w-3 h-3 text-gray-400" />
                              Assigned to: <strong className="text-gray-700">{lead.assignedTo}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* AI Context Badge */}
                      <div className="mt-3 bg-purple-50/70 border border-purple-100 rounded-lg p-2.5 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-purple-900 leading-relaxed font-medium">
                          <strong className="font-bold text-purple-700 mr-1.5">AI Insights:</strong>
                          {lead.contextSnippet}
                        </div>
                      </div>

                      {/* Tone Preset Buttons */}
                      <div className="mt-3 flex items-center gap-1.5 text-[11px]">
                        <span className="text-gray-400 font-bold mr-1">Tone:</span>
                        <button
                          type="button"
                          onClick={() => applyTone(lead.id, lead.name, "FRIENDLY")}
                          className="px-2 py-0.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-gray-600 font-semibold transition-colors"
                        >
                          Friendly ☀️
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTone(lead.id, lead.name, "FORMAL")}
                          className="px-2 py-0.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-gray-600 font-semibold transition-colors"
                        >
                          Formal 💼
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTone(lead.id, lead.name, "OFFER")}
                          className="px-2 py-0.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-gray-600 font-semibold transition-colors"
                        >
                          Lookbook / Catalog 🎨
                        </button>
                      </div>

                      {/* Custom Message Text Area */}
                      <div className="mt-2">
                        <textarea
                          rows={3}
                          value={currentMsg}
                          onChange={(e) => handleMessageChange(lead.id, e.target.value)}
                          className="w-full text-xs font-sans text-gray-800 bg-gray-50/80 border border-gray-200 rounded-lg p-2.5 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none leading-relaxed"
                          placeholder="Type or edit WhatsApp message..."
                        />
                      </div>
                    </div>

                    {/* Right: Action & Status Button */}
                    <div className="md:w-56 shrink-0 flex flex-col items-end justify-between pt-1 space-y-2">
                      {lead.sentToday ? (
                        <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col items-center text-center">
                          <div className="flex items-center gap-1 text-emerald-700 font-extrabold text-xs mb-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Sent & Logged
                          </div>
                          <span className="text-[10px] text-emerald-600 font-medium">
                            Dispatched at {lead.sentAt || "Today"}
                          </span>
                          <button
                            onClick={() => handleSend(lead)}
                            disabled={isSending}
                            className="mt-2 text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            Send Again <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full flex flex-col space-y-2">
                          <button
                            onClick={() => handleSend(lead)}
                            disabled={isSending}
                            className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 px-4 rounded-xl font-black text-xs shadow-md shadow-green-100 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <Send className="w-4 h-4" />
                            {isSending ? "Opening..." : "Send via WhatsApp"}
                          </button>
                          <div className="text-center text-[10px] font-bold text-amber-600 flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending Dispatch
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] text-gray-400 text-right w-full">
                        Logged in system audit
                      </div>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 font-medium shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Clicking <strong>Send via WhatsApp</strong> opens the client chat and updates the employee accountability log.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
