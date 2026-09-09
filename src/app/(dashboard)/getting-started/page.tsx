"use client";

import { Download, HelpCircle, ExternalLink, MessageSquare, PlayCircle, Rocket } from "lucide-react";

export default function GettingStartedPage() {
  return (
    <div className="h-full bg-white flex -m-3 md:-m-6 relative overflow-hidden">
      
      {/* Left Sidebar Menu */}
      <div className="w-[280px] bg-white border-r border-gray-100 flex flex-col shrink-0">
        <div className="p-4 pt-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          USER GUIDES
        </div>
        
        <div className="space-y-1 px-4">
          <button className="w-full text-left px-3 py-2 text-[13px] font-bold text-[#613cbc] bg-[#f4effc] rounded-lg border border-purple-100 shadow-sm flex items-center">
            <span className="w-4 h-4 rounded-full border-2 border-[#b3a1f8] mr-2"></span> All you need to get started
          </button>
          
          <button className="w-full text-left px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 rounded-lg flex items-center">
            <span className="w-4 h-4 rounded-full border-2 border-gray-200 mr-2"></span> Calling & Messaging
          </button>
          
          <button className="w-full text-left px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 rounded-lg flex items-center">
            <span className="w-4 h-4 rounded-full border-2 border-gray-200 mr-2"></span> WhatsApp
          </button>
          
          <button className="w-full text-left px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 rounded-lg flex items-center">
            <span className="w-4 h-4 rounded-full border-2 border-gray-200 mr-2"></span> IVR / Cloud Telephony
          </button>
          
          <button className="w-full text-left px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 rounded-lg flex items-center">
            <span className="w-4 h-4 rounded-full border-2 border-gray-200 mr-2"></span> Integrations & Lead Sources
          </button>
          
          <button className="w-full text-left px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 rounded-lg flex items-center">
            <span className="w-4 h-4 rounded-full border-2 border-gray-200 mr-2"></span> Automation & Workflows
          </button>

          <button className="w-full text-left px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 rounded-lg flex items-center">
            <span className="w-4 h-4 rounded-full border-2 border-gray-200 mr-2"></span> Reports & Analytics
          </button>

          <button className="w-full text-left px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 rounded-lg flex items-center">
            <span className="w-4 h-4 rounded-full border-2 border-gray-200 mr-2"></span> Move your Data Around
          </button>

          <button className="w-full text-left px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 rounded-lg flex items-center">
            <span className="w-4 h-4 rounded-full border-2 border-gray-200 mr-2"></span> AI Assistants & Connectors
          </button>
          
          <button className="w-full text-left px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 rounded-lg flex items-center">
            <span className="w-4 h-4 rounded-full border-2 border-gray-200 mr-2"></span> Developer & Advanced
          </button>
        </div>

        <div className="p-4 pt-8 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          RESOURCES
        </div>

        <div className="space-y-1 px-4">
          <button className="w-full text-left px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 rounded-lg flex items-center">
            <Download className="w-4 h-4 text-[#613cbc] mr-3" /> Download App
          </button>
          <button className="w-full text-left px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 rounded-lg flex items-center">
            <MessageSquare className="w-4 h-4 text-[#613cbc] mr-3" /> Contact our team
          </button>
          <button className="w-full text-left px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 rounded-lg flex items-center">
            <PlayCircle className="w-4 h-4 text-[#613cbc] mr-3" /> Help Video <ExternalLink className="w-3.5 h-3.5 ml-auto text-gray-400" />
          </button>
          <button className="w-full text-left px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 rounded-lg flex items-center">
            <HelpCircle className="w-4 h-4 text-[#613cbc] mr-3" /> Product updates
          </button>
        </div>

      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white p-10 overflow-y-auto">
        <div className="max-w-4xl">
          
          <h1 className="text-2xl font-bold text-gray-800 flex items-center mb-2">
            Hi Stelar, <span className="text-[#613cbc] ml-2">Happy Thursday!</span>
          </h1>
          <p className="text-gray-500 text-sm mb-10 max-w-lg leading-relaxed">
            Here's where you'll set up telecrm. Walk through it at your own pace — every step you finish gets ticked off.
          </p>

          <div className="flex items-center mb-6">
            <Rocket className="w-6 h-6 text-red-400 mr-2 transform -rotate-12" />
            <div>
              <h2 className="text-lg font-bold text-gray-800">All you need to get started</h2>
              <p className="text-gray-500 text-xs">The essentials — set up your team, your leads, and customise telecrm to fit how you sell.</p>
            </div>
          </div>

          <div className="space-y-4">
            
            {/* Box 1: Set up your leads */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="flex">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center mr-4"></div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-[15px]">Set up your leads</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Shape your lead data, pipeline, and how new leads land.</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 font-medium flex items-center">
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full mr-3 overflow-hidden"></div>
                  0/5
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 cursor-pointer bg-gray-50/50">
                  <div className="flex items-center text-[13px] text-[#613cbc]">
                    <div className="w-4 h-4 rounded-full border-2 border-purple-200 mr-3"></div>
                    Configure lead fields
                  </div>
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Basic</span>
                </div>
                
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 cursor-pointer bg-gray-50/50">
                  <div className="flex items-center text-[13px] text-[#613cbc]">
                    <div className="w-4 h-4 rounded-full border-2 border-purple-200 mr-3"></div>
                    Configure lead stages
                  </div>
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Basic</span>
                </div>
                
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 cursor-pointer bg-gray-50/50">
                  <div className="flex items-center text-[13px] text-[#613cbc]">
                    <div className="w-4 h-4 rounded-full border-2 border-purple-200 mr-3"></div>
                    Add your first leads manually
                  </div>
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Basic</span>
                </div>
                
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 cursor-pointer bg-gray-50/50">
                  <div className="flex items-center text-[13px] text-[#613cbc]">
                    <div className="w-4 h-4 rounded-full border-2 border-purple-200 mr-3"></div>
                    Import leads from another CRM (Excel)
                  </div>
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Basic</span>
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 cursor-pointer bg-gray-50/50">
                  <div className="flex items-center text-[13px] text-[#613cbc]">
                    <div className="w-4 h-4 rounded-full border-2 border-purple-200 mr-3"></div>
                    Import historical actions from another CRM
                  </div>
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Advanced</span>
                </div>
              </div>
            </div>

            {/* Box 2: Set up your team */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm flex justify-between items-center opacity-70">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-blue-100 mr-4"></div>
                <div>
                  <h3 className="font-bold text-gray-800 text-[15px]">Set up your team</h3>
                  <p className="text-gray-500 text-xs mt-0.5">Add your people and decide who can do what.</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 font-medium flex items-center">
                <div className="w-24 h-1.5 bg-gray-100 rounded-full mr-3"></div>
                0/4
              </div>
            </div>

            {/* Box 3: Customize for your business */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm flex justify-between items-center opacity-70">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-red-100 mr-4"></div>
                <div>
                  <h3 className="font-bold text-gray-800 text-[15px]">Customize for your business</h3>
                  <p className="text-gray-500 text-xs mt-0.5">Make telecrm sound and behave like your team already does.</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 font-medium flex items-center">
                <div className="w-24 h-1.5 bg-gray-100 rounded-full mr-3"></div>
                0/4
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
