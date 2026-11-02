"use client";

import React from "react";
import { LayoutGrid, List } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LeadsHeaderActions() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isKanban = searchParams.get('view') === 'kanban';

  return (
    <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 border-b border-gray-100 flex items-center justify-between shrink-0 relative z-30 w-full max-w-full">
      <h1 className="text-sm sm:text-base font-bold text-gray-800">
        All Leads
      </h1>

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
