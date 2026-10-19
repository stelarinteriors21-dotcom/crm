"use client";

import { useState, useTransition } from "react";
import { Sparkles, MessageCircle, Send, CheckCircle2, RefreshCw, Wand2, Bot, Layers, ArrowUpRight } from "lucide-react";
import { logWhatsAppDispatchAction } from "@/app/actions/morningActions";

interface Props {
  leadId: string;
  leadName: string;
  leadPhone?: string | null;
  budget?: string | null;
  status?: string | null;
  notesSummary?: string;
}

export default function AutonomousAiWhatsAppWidget({
  leadId,
  leadName,
  leadPhone,
  budget,
  status,
  notesSummary,
}: Props) {
  const firstName = leadName.split(" ")[0] || "there";
  const cleanPhone = (leadPhone || "").replace(/[^0-9]/g, "");

  const [tone, setTone] = useState<"consultative" | "urgent" | "site_visit" | "catalog">("consultative");
  const [isPending, startTransition] = useTransition();
  const [dispatched, setDispatched] = useState(false);

  // Dynamic template generation based on context & tone
  const generateMessage = (selectedTone: string) => {
    if (selectedTone === "site_visit") {
      return `Good morning ${firstName}! 📐 Following up on our recent site visit discussions at your property. Our architecture & 3D visualization team has finalized the spatial layout options and cost estimates for your ${budget || "interior project"}. Would you be free for a quick 5-minute call today to review the design concepts? — Stelar Interiors`;
    }
    if (selectedTone === "urgent") {
      return `Good morning ${firstName}! ⚡ We have an exclusive seasonal benefit for home interior bookings this month, including complimentary 3D walkthrough rendering and factory-direct pricing on modular woodwork. Would you like to reserve your slot before this weekend? — Stelar Interiors`;
    }
    if (selectedTone === "catalog") {
      return `Good morning ${firstName}! 🏡 Sharing our latest luxury residential interior portfolio featuring contemporary living spaces and modular woodwork: https://stelarinteriors.com/portfolio. Let us know which design style resonates best with your home! — Stelar Interiors`;
    }
    // Default Consultative
    return `Good morning ${firstName}! 🌿 Wishing you a great day ahead from Stelar Interiors. Following up on your interior design enquiry. Have you had a chance to decide on your preferred start timeline? We'd be glad to assist you with layout planning and complimentary design consultation!`;
  };

  const [message, setMessage] = useState(() => generateMessage("consultative"));

  const handleToneChange = (newTone: "consultative" | "urgent" | "site_visit" | "catalog") => {
    setTone(newTone);
    setMessage(generateMessage(newTone));
  };

  const handleDispatch = () => {
    if (!cleanPhone) {
      alert("No valid phone number for this lead.");
      return;
    }

    // 1. Open WhatsApp Web / App directly with pre-filled text
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");

    // 2. Autonomously record the dispatch in CRM logs so admin has full visibility
    startTransition(async () => {
      try {
        await logWhatsAppDispatchAction(leadId, message);
        setDispatched(true);
        setTimeout(() => setDispatched(false), 5000);
      } catch (err) {
        console.error("Failed to auto-log WhatsApp dispatch", err);
      }
    });
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-white rounded-xl border border-indigo-200 shadow-sm p-4 md:p-5 relative overflow-hidden">
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-xs font-bold text-gray-900 tracking-tight">AI Autonomous WhatsApp Generator</h3>
              <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-indigo-100 text-indigo-700 rounded-md border border-indigo-200">
                MCP Protocol
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Reads all call notes, recording summaries, & status to craft tailored client messages.
            </p>
          </div>
        </div>

        {dispatched && (
          <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Auto-Logged to CRM
          </span>
        )}
      </div>

      {/* Tone Chips */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <button
          type="button"
          onClick={() => handleToneChange("consultative")}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
            tone === "consultative"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          🌿 Consultative
        </button>
        <button
          type="button"
          onClick={() => handleToneChange("site_visit")}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
            tone === "site_visit"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          📐 Site Visit Follow-up
        </button>
        <button
          type="button"
          onClick={() => handleToneChange("catalog")}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
            tone === "catalog"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          🏡 Lookbook / Catalog
        </button>
        <button
          type="button"
          onClick={() => handleToneChange("urgent")}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
            tone === "urgent"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          ⚡ Promotional / Urgency
        </button>
      </div>

      {/* Generated Message Area */}
      <div className="relative mb-3">
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full text-xs text-gray-900 bg-white border border-indigo-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-inner resize-y leading-relaxed"
          placeholder="AI generated message will appear here..."
        />
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-indigo-100">
        <div className="text-[11px] text-gray-500 flex items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping" />
          Clicking auto-opens WhatsApp & logs the dispatch for Admin reporting.
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setMessage(generateMessage(tone))}
            className="px-2.5 py-1.5 text-xs text-gray-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-gray-200 flex items-center transition-colors"
            title="Regenerate message"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
          </button>

          <button
            type="button"
            onClick={handleDispatch}
            disabled={!cleanPhone || isPending}
            className="flex items-center px-4 py-1.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
            Launch WhatsApp & Auto-Log
            <ArrowUpRight className="w-3.5 h-3.5 ml-1 opacity-80" />
          </button>
        </div>
      </div>
    </div>
  );
}
