"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Loader2, Wand2, Settings2, X } from "lucide-react";
import { logWhatsAppMessage, getLeadContextForAI } from "@/app/actions/leadActions";

export default function WhatsAppLogForm({ leadId, phone }: { leadId: string, phone: string }) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [localAiUrl, setLocalAiUrl] = useState("http://localhost:11434/api/generate");
  const [localAiModel, setLocalAiModel] = useState("llama3");

  useEffect(() => {
    const savedUrl = localStorage.getItem("localAiUrl");
    const savedModel = localStorage.getItem("localAiModel");
    if (savedUrl) setLocalAiUrl(savedUrl);
    if (savedModel) setLocalAiModel(savedModel);
  }, []);

  const saveSettings = () => {
    localStorage.setItem("localAiUrl", localAiUrl);
    localStorage.setItem("localAiModel", localAiModel);
    setShowSettings(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    
    setLoading(true);
    await logWhatsAppMessage(leadId, msg);
    
    const formattedPhone = phone?.replace(/[^0-9]/g, '') || '';
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    
    setMsg("");
    setLoading(false);
  };

  const generateDraft = async () => {
    try {
      setAiLoading(true);
      const context = await getLeadContextForAI(leadId);
      
      const prompt = `You are a helpful sales assistant. Based on the following lead context, draft a short, friendly, and professional WhatsApp message to send to the lead. Do not include placeholders, use the information provided. Keep it under 3 sentences.\n\nContext:\n${context}`;

      const res = await fetch(localAiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: localAiModel,
          prompt: prompt,
          stream: false
        })
      });
      
      if (!res.ok) throw new Error("Failed to connect to local model");
      
      const data = await res.json();
      if (data && data.response) {
        setMsg(data.response.trim());
      } else if (data && data.choices && data.choices[0] && data.choices[0].text) {
        setMsg(data.choices[0].text.trim());
      } else if (data && data.choices && data.choices[0] && data.choices[0].message) {
        setMsg(data.choices[0].message.content.trim());
      }
    } catch (err: any) {
      alert("Error generating draft: " + err.message + ". Make sure your local model is running and CORS is enabled.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="relative">
      {showSettings && (
        <div className="absolute bottom-full mb-2 right-0 w-64 bg-white border border-gray-200 shadow-xl rounded-lg p-4 z-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Local AI Settings</h4>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Endpoint URL</label>
              <input type="text" value={localAiUrl} onChange={e => setLocalAiUrl(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Model Name</label>
              <input type="text" value={localAiModel} onChange={e => setLocalAiModel(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-purple-500" />
            </div>
            <button onClick={saveSettings} className="w-full bg-[#4f46e5] text-white py-1.5 rounded text-xs font-bold hover:bg-purple-800 transition-colors">Save Settings</button>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="flex flex-col space-y-2">
        <div className="flex space-x-2">
          <textarea 
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type a WhatsApp message to send..." 
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500 min-h-[90px] resize-y leading-relaxed" 
            required 
          />
        </div>
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button 
              type="button" 
              onClick={generateDraft}
              disabled={aiLoading}
              className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition-colors disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1.5" />}
              AI Draft (Local)
            </button>
            <button 
              type="button" 
              onClick={() => setShowSettings(!showSettings)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1.5 rounded-lg transition-colors"
              title="Configure Local AI"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center shadow-sm disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
            Send WhatsApp
          </button>
        </div>
      </form>
    </div>
  );
}
