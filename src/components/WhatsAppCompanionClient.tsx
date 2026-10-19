"use client";

import React, { useState } from "react";
import { 
  MessageCircle, ExternalLink, ShieldCheck, KeyRound, 
  Send, Users, Copy, Check, QrCode, Smartphone, Info 
} from "lucide-react";
import WhatsAppConversationThread from "@/components/WhatsAppConversationThread";
import WhatsAppSyncStatusCard from "@/components/WhatsAppSyncStatusCard";

interface LeadOption {
  id: string;
  name: string;
  phone: string | null;
  siteVisitOtp?: string | null;
}

export default function WhatsAppCompanionClient({ recentLeads = [] }: { recentLeads?: LeadOption[] }) {
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // When a lead is selected, pre-fill phone and an OTP or greeting
  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = recentLeads.find(l => l.id === leadId);
    if (!lead) return;

    if (lead.phone) {
      setPhone(lead.phone.replace(/[^0-9]/g, ""));
    }

    if (lead.siteVisitOtp) {
      setMessage(`Hello ${lead.name},\n\nYour 6-digit site visit verification OTP for Stelar Interiors is: *${lead.siteVisitOtp}*.\n\nPlease share this OTP with our visiting executive upon arrival.\n\nThank you!`);
    } else {
      setMessage(`Hello ${lead.name},\n\nThank you for connecting with Stelar Interiors. We are following up regarding your interior design inquiry.\n\nPlease let us know a convenient time to speak.\n\nBest regards,\nStelar Interiors Team`);
    }
  };

  const handleLaunchWhatsAppWeb = () => {
    // Open WhatsApp Web as a dedicated standalone desktop companion window
    const width = 1150;
    const height = 820;
    const left = window.screen.width > width ? Math.round((window.screen.width - width) / 2) : 50;
    const top = window.screen.height > height ? Math.round((window.screen.height - height) / 2) : 50;

    window.open(
      "https://web.whatsapp.com",
      "WhatsAppCompanion",
      `width=${width},height=${height},top=${top},left=${left},menubar=no,status=no,toolbar=no`
    );
  };

  const handleSendMessage = () => {
    const cleanNumber = phone.replace(/[^0-9]/g, "");
    if (!cleanNumber) {
      alert("Please enter a valid phone number with country code (e.g. 919876543210).");
      return;
    }

    // Format phone with country code (defaults to 91 for India if 10 digits)
    const formattedPhone = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const encodedText = encodeURIComponent(message);
    const targetUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;

    // Open directly in the linked companion window
    window.open(
      targetUrl,
      "WhatsAppCompanion",
      "width=1150,height=820,menubar=no,status=no,toolbar=no"
    );
  };

  const handleCopyMessage = () => {
    if (!message) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* WhatsApp Native & Companion Sync Status Card */}
      <WhatsAppSyncStatusCard />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-white/20 rounded-lg">
                <MessageCircle className="w-5 h-5 text-white" />
              </span>
              <h1 className="text-xl font-bold">WhatsApp Web Companion</h1>
            </div>
            <p className="text-xs text-emerald-100 max-w-xl">
              Connect your official WhatsApp as a linked device. Forward OTPs, greetings, and quotations with 1-click while keeping your account 100% safe.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLaunchWhatsAppWeb}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-white text-emerald-800 font-bold text-xs rounded-xl hover:bg-emerald-50 transition-all shadow-sm shrink-0"
          >
            <QrCode className="w-4 h-4 mr-2 text-emerald-600" />
            Launch WhatsApp Web
            <ExternalLink className="w-3.5 h-3.5 ml-1.5 text-emerald-500" />
          </button>
        </div>
      </div>

      {/* Safety Notice & How it Works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
          <div className="flex items-center text-emerald-700 font-bold">
            <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
            0% Ban Risk (Meta Official)
          </div>
          <p className="text-gray-500 leading-relaxed text-[11px]">
            Uses the official WhatsApp Web engine. No unofficial bots or emulators that could get your phone number flagged.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
          <div className="flex items-center text-indigo-700 font-bold">
            <Smartphone className="w-4 h-4 mr-1.5 text-indigo-600" />
            Linked Companion Device
          </div>
          <p className="text-gray-500 leading-relaxed text-[11px]">
            Scan the QR code once from your phone’s <strong>Linked Devices</strong> menu. You stay logged in automatically.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
          <div className="flex items-center text-amber-700 font-bold">
            <KeyRound className="w-4 h-4 mr-1.5 text-amber-600" />
            Instant OTP & Quote Dispatch
          </div>
          <p className="text-gray-500 leading-relaxed text-[11px]">
            Select any lead below to automatically pre-fill the customer’s phone number and verification OTP into WhatsApp Web.
          </p>
        </div>
      </div>

      {/* Quick Dispatcher Form */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Forward Message or Site Visit OTP</h2>
            <p className="text-xs text-gray-400">Pre-fill the client’s number and click send to open in your companion window.</p>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            Ready to Dispatch
          </span>
        </div>

        {/* Lead Selector */}
        {recentLeads.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center">
              <Users className="w-3.5 h-3.5 mr-1 text-[#4f46e5]" />
              Select Recent Lead (Optional Shortcut)
            </label>
            <select
              value={selectedLeadId}
              onChange={(e) => handleLeadSelect(e.target.value)}
              className="w-full text-xs font-medium border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/50 outline-none focus:border-[#4f46e5] focus:bg-white"
            >
              <option value="">-- Choose a lead to auto-fill phone & OTP --</option>
              {recentLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.phone || "No phone"}{l.siteVisitOtp ? ` • OTP: ${l.siteVisitOtp}` : ""})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Phone Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700">Customer Phone Number</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 8590609880 or 918590609880"
            className="w-full text-xs font-mono font-medium border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#4f46e5]"
          />
        </div>

        {/* Quick Template Buttons */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700">Quick Template Snippets</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMessage("Hello, your 6-digit site visit verification OTP for Stelar Interiors is: *123456*. Please share this with our visiting executive upon arrival. Thank you!")}
              className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              🔑 Site Visit OTP Template
            </button>
            <button
              type="button"
              onClick={() => setMessage("Hi, following up on our call today regarding your interior design inquiry with Stelar Interiors. Please let us know if you have any questions or when you would like to schedule a site visit!")}
              className="text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              📞 Post-Call Follow-up
            </button>
            <button
              type="button"
              onClick={() => setMessage("Hello, thank you for contacting Stelar Interiors. Our team has prepared your customized estimate. Please let us know if you'd like to review it together.")}
              className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              📐 Quotation Ready
            </button>
          </div>
        </div>

        {/* Message Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700">Message Content</label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="text-[11px] font-medium text-gray-500 hover:text-gray-800 flex items-center"
            >
              {copied ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? "Copied!" : "Copy text"}
            </button>
          </div>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type message or OTP to forward to customer..."
            className="w-full text-xs font-medium border border-gray-200 rounded-xl p-3 outline-none focus:border-[#4f46e5] resize-y min-h-[110px] leading-relaxed"
          />
        </div>

        {/* Send Action */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
          <div className="text-[11px] text-gray-400 flex items-center">
            <Info className="w-3.5 h-3.5 mr-1 text-gray-400 shrink-0" />
            Opens WhatsApp Web directly into this customer’s chat.
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!phone.trim() || !message.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send on WhatsApp Web
            </button>
          </div>
        </div>

      </div>

      {/* Live 2-Way Chat Stream for Selected Lead */}
      {(() => {
        const activeLead = recentLeads.find((l) => l.id === selectedLeadId) || recentLeads[0];
        if (!activeLead) return null;
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center">
                <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Live Conversation Stream: {activeLead.name}
              </h3>
            </div>
            <WhatsAppConversationThread
              leadId={activeLead.id}
              leadName={activeLead.name}
              phone={activeLead.phone}
              siteVisitOtp={activeLead.siteVisitOtp}
              messages={[]}
            />
          </div>
        );
      })()}

    </div>
  );
}
