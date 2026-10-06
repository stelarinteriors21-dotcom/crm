"use client";

import React, { useState } from "react";
import { Search, ChevronDown } from "lucide-react";

export default function CampaignsToolbar() {
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [createdByOpen, setCreatedByOpen] = useState(false);

  return (
    <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center space-x-4 shrink-0 bg-[#FDFDFD]">
      <div className="relative flex-1 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search campaign" 
          className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded text-[13px] focus:outline-none focus:border-[#4f46e5] bg-white"
        />
      </div>
      
      {/* Priority Dropdown */}
      <div className="relative w-48">
        <button 
          onClick={() => setPriorityOpen(!priorityOpen)}
          onBlur={() => setTimeout(() => setPriorityOpen(false), 200)}
          className="w-full flex items-center justify-between border border-gray-200 bg-white rounded px-3 py-1.5 text-[13px] text-gray-700 hover:border-[#4f46e5] transition-colors"
        >
          Priority <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        {priorityOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-10 py-1">
            <div className="px-3 py-1.5 text-[13px] hover:bg-purple-50 cursor-pointer">High Priority</div>
            <div className="px-3 py-1.5 text-[13px] hover:bg-purple-50 cursor-pointer">Normal</div>
            <div className="px-3 py-1.5 text-[13px] hover:bg-purple-50 cursor-pointer">Low Priority</div>
          </div>
        )}
      </div>
      
      {/* Date Dropdown */}
      <div className="relative w-48">
        <button 
          onClick={() => setDateOpen(!dateOpen)}
          onBlur={() => setTimeout(() => setDateOpen(false), 200)}
          className="w-full flex items-center justify-between border border-gray-200 bg-white rounded px-3 py-1.5 text-[13px] text-gray-700 hover:border-[#4f46e5] transition-colors"
        >
          Date <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        {dateOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-10 py-1">
            <div className="px-3 py-1.5 text-[13px] hover:bg-purple-50 cursor-pointer">Today</div>
            <div className="px-3 py-1.5 text-[13px] hover:bg-purple-50 cursor-pointer">Last 7 Days</div>
            <div className="px-3 py-1.5 text-[13px] hover:bg-purple-50 cursor-pointer">Last 30 Days</div>
          </div>
        )}
      </div>
      
      {/* Assignee Dropdown */}
      <div className="relative w-48">
        <button 
          onClick={() => setAssigneeOpen(!assigneeOpen)}
          onBlur={() => setTimeout(() => setAssigneeOpen(false), 200)}
          className="w-full flex items-center justify-between border border-gray-200 bg-white rounded px-3 py-1.5 text-[13px] text-gray-700 hover:border-[#4f46e5] transition-colors"
        >
          Select Assignee <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        {assigneeOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-10 py-1">
            <div className="px-3 py-1.5 text-[13px] hover:bg-purple-50 cursor-pointer">Me (Assigned)</div>
            <div className="px-3 py-1.5 text-[13px] hover:bg-purple-50 cursor-pointer">Stelar Admin</div>
            <div className="px-3 py-1.5 text-[13px] hover:bg-purple-50 cursor-pointer">Unassigned</div>
          </div>
        )}
      </div>
      
      {/* Created By Dropdown */}
      <div className="relative w-48">
        <button 
          onClick={() => setCreatedByOpen(!createdByOpen)}
          onBlur={() => setTimeout(() => setCreatedByOpen(false), 200)}
          className="w-full flex items-center justify-between border border-gray-200 bg-white rounded px-3 py-1.5 text-[13px] text-gray-700 hover:border-[#4f46e5] transition-colors"
        >
          Select Created by <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        {createdByOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-10 py-1">
            <div className="px-3 py-1.5 text-[13px] hover:bg-purple-50 cursor-pointer">Me (Created)</div>
            <div className="px-3 py-1.5 text-[13px] hover:bg-purple-50 cursor-pointer">Stelar Admin</div>
          </div>
        )}
      </div>
    </div>
  );
}
