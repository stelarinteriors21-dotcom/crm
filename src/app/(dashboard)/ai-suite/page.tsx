"use client"

import { useState } from "react";
import { Sparkles, Phone, FileText, Cpu, MessageCircle, Mail, Copy, X, ArrowRight, Info } from "lucide-react";
import Link from "next/link";

export default function AISuitePage() {
  const [showLeadIQModal, setShowLeadIQModal] = useState(false);

  const tools = [
    {
      id: 1,
      title: "Call IQ",
      status: "Live",
      statusColor: "text-green-600 bg-green-50",
      icon: <Phone className="w-5 h-5 text-purple-600" />,
      desc: "Call analysis & QA",
      details: "Listens to every recorded call, scores the rep, extracts intent and pushes a summary onto the lead.",
      button: "Manage Call IQ >",
      btnClass: "border border-purple-200 text-[#613cbc] hover:bg-purple-50",
      action: () => {}
    },
    {
      id: 2,
      title: "Lead IQ",
      status: "Not enabled",
      statusColor: "text-orange-600 bg-orange-50",
      icon: <FileText className="w-5 h-5 text-blue-500" />,
      desc: "Scoring & enrichment",
      details: "Reads the full lead trail and scores intent, so a rep knows what to say before the first call.",
      button: "Request Access",
      btnClass: "border border-purple-200 text-[#613cbc] hover:bg-purple-50",
      action: () => setShowLeadIQModal(true)
    },
    {
      id: 3,
      title: "MCP",
      status: "Live",
      statusColor: "text-green-600 bg-green-50",
      icon: <Cpu className="w-5 h-5 text-gray-700" />,
      desc: "Model Context Protocol",
      details: "Connects Claude, ChatGPT or Gemini to your workspace so you can query leads and run summaries in plain language.",
      button: "Manage MCP >",
      btnClass: "border border-purple-200 text-[#613cbc] hover:bg-purple-50",
      action: () => window.location.href = '/ai-suite/mcp'
    },
    {
      id: 4,
      title: "Chat IQ",
      status: "Coming soon",
      statusColor: "text-gray-500 bg-gray-100",
      icon: <MessageCircle className="w-5 h-5 text-gray-400" />,
      desc: "WhatsApp replies",
      details: "Replies to incoming WhatsApp messages within your approved playbook, and hands the chat over the moment a human is needed.",
      button: "Coming soon",
      btnClass: "text-gray-400 cursor-not-allowed",
      action: () => {}
    }
  ];

  return (
    <div className="h-full bg-white p-8 relative">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Sparkles className="w-6 h-6 mr-3 text-[#613cbc]" />
            AI Suite
          </h1>
          <p className="text-sm text-gray-500 mt-1 pl-9">
            Every telecrm AI feature in one place. Open any of them to set it up or change how it works.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tools.map(tool => (
            <div key={tool.id} className="border border-gray-200 rounded-xl p-5 flex flex-col h-[280px] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                  {tool.icon}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-gray-900">{tool.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tool.statusColor}`}>
                      • {tool.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{tool.desc}</p>
                </div>
              </div>
              
              <div className="flex-1 mt-4">
                <p className="text-[13px] text-gray-600 leading-relaxed">
                  {tool.details}
                </p>
              </div>

              <button 
                onClick={tool.action}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${tool.btnClass}`}
              >
                {tool.button}
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* Request Access to Lead-IQ Modal Overlay */}
      {showLeadIQModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mr-4 shrink-0">
                  <Mail className="w-5 h-5 text-[#613cbc]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Request access to Lead-IQ</h2>
                  <p className="text-[13px] text-gray-500 mt-1">We've prepared an email for your account manager. Send it automatically through your mail app, or copy it and send manually.</p>
                </div>
              </div>
              <button onClick={() => setShowLeadIQModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-[#F8F9FA] flex-1">
              
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4 shadow-sm">
                <div className="flex items-center px-4 py-3 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-400 w-16">TO</span>
                  <span className="text-sm font-medium text-gray-800 flex-1">support@telecrm.in</span>
                  <button className="text-gray-400 hover:text-gray-600"><Copy className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center px-4 py-3">
                  <span className="text-xs font-bold text-gray-400 w-16">SUBJECT</span>
                  <span className="text-sm font-medium text-gray-800 flex-1">Access Request — Lead-IQ | Stelar Interiors Pvt Ltd</span>
                  <button className="text-gray-400 hover:text-gray-600"><Copy className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative group">
                <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Copy className="w-4 h-4" />
                </button>
                <div className="text-[13px] text-gray-700 font-medium whitespace-pre-wrap leading-relaxed font-mono">
                  Hi Team,{"\n\n"}
                  I'd like to request access to Lead-IQ for my workspace. Please enable it for us.{"\n\n"}
                  Here are my workspace details:{"\n\n"}
                  • Workspace: Stelar Interiors Pvt Ltd{"\n"}
                  • WorkspaceId: 6a1e96a0155d5239a59e6bcf{"\n\n"}
                  Please let me know if you need anything else to process this request.{"\n\n"}
                  Thank you.
                </div>
              </div>
              
              <div className="mt-4 flex items-center text-[11px] text-gray-500">
                <Info className="w-3.5 h-3.5 mr-1.5" />
                Your workspace ID is included automatically so we can fast-track the approval.
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex justify-end items-center space-x-4">
              <button className="text-sm font-medium text-gray-500 flex items-center hover:text-gray-800">
                <Copy className="w-4 h-4 mr-2" /> Copy full email
              </button>
              <button className="bg-[#4d3691] hover:bg-purple-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center shadow-sm transition-colors">
                Open in mail app <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
