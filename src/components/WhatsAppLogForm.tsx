"use client";

import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { logWhatsAppMessage } from "@/app/actions/leadActions";

export default function WhatsAppLogForm({ leadId, phone }: { leadId: string, phone: string }) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    
    setLoading(true);
    // Log it in the DB
    await logWhatsAppMessage(leadId, msg);
    
    // Open WhatsApp in new tab
    const formattedPhone = phone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    
    setMsg("");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSend} className="flex space-x-2">
      <input 
        type="text" 
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Type a WhatsApp message to send & log..." 
        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500" 
        required 
      />
      <button 
        type="submit" 
        disabled={loading}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-sm disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
        Log & Send
      </button>
    </form>
  );
}
