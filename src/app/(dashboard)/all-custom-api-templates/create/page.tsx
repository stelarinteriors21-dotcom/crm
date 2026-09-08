"use client"

import { useState } from "react";
import { ArrowRight, Copy, Plus, X } from "lucide-react";

export default function APITemplateManagerPage() {
  return (
    <div className="h-full bg-gray-50 relative overflow-hidden flex">
      
      {/* Background Dashboard */}
      <div className="flex-1 p-6 opacity-40 blur-sm pointer-events-none">
        <div className="max-w-6xl w-full mx-auto">
          <h1 className="text-2xl font-bold">API Templates</h1>
        </div>
      </div>

      {/* API Template Manager Overlay */}
      <div className="absolute inset-x-0 inset-y-0 mx-auto w-[90%] max-w-5xl my-8 bg-[#F8F9FA] shadow-2xl rounded-xl flex flex-col z-50 overflow-hidden">
        
        {/* Top Navbar */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shrink-0 justify-between">
          <h2 className="text-lg font-bold text-gray-800">API Template Manager</h2>
        </div>

        <div className="flex flex-1 overflow-hidden p-6 gap-6">
          
          {/* Left Column - Steps & Help */}
          <div className="w-[300px] flex flex-col space-y-6">
            
            {/* Steps */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-[15px] font-bold text-gray-800 mb-6">Create Template</h3>
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-[#4d3691] text-white flex items-center justify-center font-bold text-sm shrink-0 mr-4">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#4d3691]">Request Information</h4>
                  <p className="text-xs text-gray-500 mt-1">Define API Endpoint and Test</p>
                </div>
              </div>
            </div>

            {/* Need Help Card */}
            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="text-[15px] font-bold text-gray-800 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Check our documentation for detailed guides on creating templates.
              </p>
              <a href="#" className="text-[#613cbc] text-sm font-semibold flex items-center hover:underline">
                View Documentation <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>

          </div>

          {/* Right Column - Form */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
               <h3 className="text-lg font-bold text-gray-800">Create API Template</h3>
               <button className="px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
                 Cancel
               </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <h4 className="text-[15px] font-bold text-gray-800 mb-6">Request Information</h4>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Template Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="My Awesome API" className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#613cbc]" />
                </div>

                <div className="flex gap-4">
                  <div className="w-1/4">
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">HTTP Method <span className="text-red-500">*</span></label>
                    <select className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:border-[#613cbc]">
                      <option>POST</option>
                      <option>GET</option>
                      <option>PUT</option>
                      <option>PATCH</option>
                    </select>
                  </div>
                  <div className="flex-1 relative">
                    <div className="flex justify-between">
                      <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">API Endpoint URL <span className="text-red-500">*</span></label>
                      <button className="text-[11px] font-bold text-[#613cbc] border border-purple-200 bg-purple-50 px-2 py-0.5 rounded-sm">Add Variable</button>
                    </div>
                    <div className="flex items-center">
                      <input type="text" placeholder="https://awesome-api.com/customers/{{lead.id}}" className="flex-1 px-3 py-2 border border-gray-200 rounded-l-md text-sm focus:outline-none focus:border-[#613cbc]" />
                      <button className="px-3 py-2 border border-l-0 border-gray-200 bg-gray-50 rounded-r-md text-gray-400">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">API Timeout (s) <span className="text-red-500">*</span></label>
                  <input type="text" defaultValue="3" className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#613cbc]" />
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mt-8 mb-4">
                  <div className="flex space-x-6">
                    <button className="py-2 text-sm font-bold text-[#613cbc] border-b-2 border-[#613cbc]">Headers</button>
                    <button className="py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Body</button>
                    <button className="py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Query Params</button>
                    <button className="py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Auth</button>
                  </div>
                </div>

                {/* Headers Grid */}
                <div className="flex text-xs font-bold text-gray-800 mb-2">
                  <div className="flex-1">Key</div>
                  <div className="flex-1 ml-4">Value</div>
                  <div className="w-16 ml-4 text-center">Actions</div>
                </div>
                
                <div className="flex items-center mb-10">
                  <input type="text" readOnly value="Content-type" className="flex-1 px-3 py-2 border border-gray-100 bg-gray-50 rounded-md text-sm text-gray-500 outline-none" />
                  <input type="text" readOnly value="application/json" className="flex-1 ml-4 px-3 py-2 border border-gray-100 bg-gray-50 rounded-md text-sm text-gray-500 outline-none" />
                  <div className="w-16 ml-4 flex justify-center">
                    <button className="p-1.5 border border-gray-200 rounded-md text-gray-400 hover:bg-gray-50">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button className="bg-[#b8a6eb] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#613cbc] transition-colors">
                    Test Template
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
