"use client"

import { useState } from "react";
import { ArrowLeft, MessageCircle, ChevronRight, ChevronDown, Plus, Mail, UserPlus, Save, CheckCircle, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AutomationCreatePage() {
  const [name, setName] = useState("New Lead WhatsApp Follow-up");
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);

  return (
    <div className="h-full bg-[#f8f9fa] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <Link href="/flowcharts/workflows" className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Create Automation</h1>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            Save Draft
          </button>
          <button className="bg-[#613cbc] hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" /> Publish Automation
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center">
        <div className="w-full max-w-2xl space-y-6 pb-20">
          
          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Automation Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-lg font-bold text-gray-900 outline-none focus:border-[#613cbc] focus:ring-2 focus:ring-purple-100 transition-all shadow-sm"
              placeholder="E.g. Facebook Lead Follow-up"
            />
          </div>

          <div className="pt-4">
            {/* Trigger Block */}
            <div className="relative">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">When this happens</label>
              <div 
                className="bg-white border-2 border-purple-200 hover:border-[#613cbc] rounded-xl p-5 shadow-sm cursor-pointer transition-colors group"
                onClick={() => setTriggerModalOpen(true)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">WhatsApp</h3>
                      <p className="text-sm text-gray-500 mt-0.5">When a lead is created from WhatsApp</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#613cbc] transition-colors" />
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center py-2">
              <div className="w-0.5 h-6 bg-gray-300"></div>
            </div>

            {/* Condition Block */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">If these conditions are true</label>
                <button className="text-xs font-bold text-[#613cbc] hover:bg-purple-50 px-2 py-1 rounded transition-colors flex items-center">
                  <Plus className="w-3 h-3 mr-1" /> Add condition
                </button>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center space-x-3">
                <select className="bg-gray-50 border border-gray-200 text-sm font-medium rounded-lg px-3 py-2 outline-none focus:border-[#613cbc] flex-1">
                  <option>Lead Source</option>
                  <option>Lead Rating</option>
                  <option>Status</option>
                </select>
                <span className="text-sm text-gray-400 font-medium">is</span>
                <select className="bg-gray-50 border border-gray-200 text-sm font-medium rounded-lg px-3 py-2 outline-none focus:border-[#613cbc] flex-1">
                  <option>WhatsApp</option>
                  <option>Facebook</option>
                  <option>Website</option>
                </select>
                <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center py-2">
              <div className="w-0.5 h-6 bg-gray-300"></div>
            </div>

            {/* Action Block 1 */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Then do this</label>
                <button className="text-xs font-bold text-[#613cbc] hover:bg-purple-50 px-2 py-1 rounded transition-colors flex items-center">
                  <Plus className="w-3 h-3 mr-1" /> Add action
                </button>
              </div>
              <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-4 shadow-sm cursor-pointer transition-colors group mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-bold text-gray-900 text-sm">Send Email</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </div>
              </div>

              {/* Action Block 2 */}
              <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-4 shadow-sm cursor-pointer transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-[#613cbc]" />
                    </div>
                    <span className="font-bold text-gray-900 text-sm">Assign Lead</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center py-4">
              <div className="w-0.5 h-8 bg-gray-300"></div>
            </div>

            {/* Summary Block */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-lg text-white">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Automation Summary</h3>
              <div className="space-y-3 font-medium text-sm">
                <div className="flex items-center">
                  <span className="text-green-400 mr-2">When</span> WhatsApp lead is created
                </div>
                <div className="ml-2 border-l-2 border-gray-600 pl-4 py-1">
                  <div className="flex items-center text-gray-300">
                    <span className="text-purple-400 mr-2">If</span> Lead Source = WhatsApp
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-400 mr-2">Then</span> Send Email <span className="mx-2 text-gray-500">+</span> Assign Lead
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
