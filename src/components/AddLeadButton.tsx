"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, ChevronDown, UserPlus, UploadCloud, Sparkles } from "lucide-react";

interface AddLeadButtonProps {
  isAdmin?: boolean;
}

export default function AddLeadButton({ isAdmin = false }: AddLeadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // For callers: clean, direct button to Add Lead form (no bulk upload)
  if (!isAdmin) {
    return (
      <Link 
        href="/add/single" 
        className="bg-[#4f46e5] hover:bg-indigo-700 text-white p-2 sm:px-3.5 md:px-4 sm:py-1.5 md:py-2 rounded-lg text-sm font-medium flex items-center shadow-xs transition-all h-8 sm:h-9 md:h-10 cursor-pointer"
        title="Add New Lead"
      >
        <Plus className="w-4 h-4 sm:mr-1.5" /> 
        <span className="hidden sm:inline">Add Lead</span>
      </Link>
    );
  }

  // For admins: dropdown button containing both Single Lead and Bulk Upload
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#4f46e5] hover:bg-indigo-700 active:bg-indigo-800 text-white p-2 sm:px-3.5 md:px-4 sm:py-1.5 md:py-2 rounded-lg text-sm font-medium flex items-center shadow-xs transition-all h-8 sm:h-9 md:h-10 cursor-pointer select-none"
        title="Add Leads (Single or Bulk)"
        aria-expanded={isOpen}
      >
        <Plus className="w-4 h-4 sm:mr-1.5" /> 
        <span className="hidden sm:inline">Add Lead</span>
        <ChevronDown 
          className={`w-3.5 h-3.5 ml-1 transition-transform duration-200 hidden sm:inline ${
            isOpen ? "rotate-180" : ""
          }`} 
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-[150] p-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100 mb-1">
            Create & Ingest Leads
          </div>

          <Link
            href="/add/single"
            onClick={() => setIsOpen(false)}
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-indigo-50/70 transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-gray-900 group-hover:text-indigo-950 flex items-center justify-between">
                <span>Single Lead</span>
                <span className="text-[10px] font-semibold text-gray-400">Manual</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                Add an individual lead with details & stage
              </p>
            </div>
          </Link>

          <Link
            href="/add/bulk"
            onClick={() => setIsOpen(false)}
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-emerald-50/70 transition-colors group mt-1"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-gray-900 group-hover:text-emerald-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  Bulk Upload
                </span>
                <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                  Excel / PDF
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                Import contacts from Excel, CSV, or PDF
              </p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
