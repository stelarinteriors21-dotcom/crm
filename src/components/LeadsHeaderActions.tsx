"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Edit2, Tag, Trash2, RefreshCw, Plus, Search, LayoutGrid, List } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LeadsHeaderActions() {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [currentView, setCurrentView] = useState("All Leads");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isKanban = searchParams.get('view') === 'kanban';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsViewOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const views = [
    { id: "all", name: "All Leads", filter: "" },
    { id: "active", name: "Active Leads", filter: "?active=true" },
    { id: "new", name: "New Leads", filter: "?status=NEW" },
    { id: "whatsapp", name: "Whatsapp Leads", filter: "?source=WHATSAPP" },
    { id: "mine", name: "My Leads", filter: "?assigned=me" },
  ];

  const handleSelectView = (view: any) => {
    setCurrentView(view.name);
    setIsViewOpen(false);
    router.push(`/leads${view.filter}`);
  };

  return (
    <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 border-b border-gray-100 flex items-center justify-between shrink-0 relative z-[60] w-full max-w-full">
      <div className="relative min-w-0" ref={dropdownRef}>
        <button 
          onClick={() => setIsViewOpen(!isViewOpen)}
          className="text-sm sm:text-[15px] font-bold text-gray-800 flex items-center cursor-pointer hover:bg-gray-50 px-2 py-1 rounded max-w-[170px] sm:max-w-none"
        >
          <span className="truncate">{currentView}</span> <ChevronDown className="w-4 h-4 ml-1 text-gray-400 shrink-0" />
        </button>

        {isViewOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
            <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">System Views</div>
            {views.map(view => (
              <button
                key={view.id}
                onClick={() => handleSelectView(view)}
                className={`w-full text-left px-4 py-2 text-[13px] hover:bg-purple-50 hover:text-[#4f46e5] ${currentView === view.name ? "bg-purple-50 text-[#4f46e5] font-medium" : "text-gray-700"}`}
              >
                {view.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg shrink-0">
        <button 
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('view');
            router.push(url.pathname + url.search);
          }}
          className={`flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-md transition-all ${!isKanban ? 'bg-white text-[#4f46e5] shadow-xs' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}`}
        >
          <List className="w-3.5 h-3.5 mr-1 sm:mr-1.5" /> Table
        </button>
        <button 
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('view', 'kanban');
            router.push(url.pathname + url.search);
          }}
          className={`flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-md transition-all ${isKanban ? 'bg-white text-[#4f46e5] shadow-xs' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}`}
        >
          <LayoutGrid className="w-3.5 h-3.5 mr-1 sm:mr-1.5" /> Board
        </button>
      </div>
    </div>
  );
}
