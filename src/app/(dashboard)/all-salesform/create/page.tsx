"use client"

import { useState } from "react";
import { Search, ChevronRight, X } from "lucide-react";

export default function SalesformCreatePage() {
  const [showEventModal, setShowEventModal] = useState(true);

  return (
    <div className="h-full bg-gray-50 relative overflow-hidden flex">
      
      {/* Background (Blurred out Salesform Dashboard) */}
      <div className="flex-1 p-6 opacity-40 blur-sm pointer-events-none">
        <div className="max-w-6xl w-full mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <span className="w-6 h-6 mr-3 text-gray-700">⚯</span>
                Salesforms
              </h1>
              <p className="text-sm text-gray-500 mt-1">To automatically fill lead form data</p>
            </div>
          </div>
          <div className="flex space-x-6 border-b border-gray-200 mb-4 px-2">
            <button className="py-2 text-sm font-bold border-b-2 border-[#613cbc] text-[#613cbc]">Published</button>
            <button className="py-2 text-sm font-medium border-b-2 border-transparent text-gray-500">Draft</button>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-[400px]"></div>
        </div>
      </div>

      {/* Slide-out Event Selection Panel */}
      {showEventModal && (
        <div className="absolute top-0 right-0 h-full w-full md:w-[500px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right">
          
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Select event</h2>
              <p className="text-sm text-gray-500 mt-1">Select the event that will trigger the salesform</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 px-6 relative">
            <input 
              type="text" 
              placeholder="Search for event e.g. b" 
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#613cbc]"
            />
            <Search className="w-4 h-4 text-gray-300 absolute right-10 top-1/2 transform -translate-y-1/2" />
          </div>

          {/* Event List */}
          <div className="flex-1 overflow-y-auto px-6 py-2">
            <ul className="space-y-1">
              <li>
                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                  On adding single lead
                </button>
              </li>
              <li>
                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center">
                  <ChevronRight className="w-4 h-4 mr-2 text-gray-400" /> On custom activity
                </button>
              </li>
              <li>
                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center">
                  <ChevronRight className="w-4 h-4 mr-2 text-gray-400" /> On lead field update
                </button>
              </li>
              <li>
                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center">
                   On button click
                </button>
              </li>
              <li>
                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center">
                   On SIM call initiated
                </button>
              </li>
              <li>
                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center">
                  <ChevronRight className="w-4 h-4 mr-2 text-gray-400" /> On System activity
                </button>
              </li>
              <li>
                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center">
                  <ChevronRight className="w-4 h-4 mr-2 text-gray-400" /> On task creation activity
                </button>
              </li>
            </ul>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 flex justify-end">
            <button className="bg-[#b8a6eb] text-white px-6 py-2 rounded text-sm font-medium opacity-70 cursor-not-allowed">
              Next
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
