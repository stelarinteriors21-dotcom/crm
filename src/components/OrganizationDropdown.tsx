"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Settings, LogOut, User } from "lucide-react";

export default function OrganizationDropdown() {
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-gray-700 text-[15px] font-medium hover:text-gray-900"
      >
        Stelar Interiors Pvt Ltd <ChevronDown className="w-4 h-4 ml-1 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-[13px] font-bold text-gray-800">Stelar Interiors Pvt Ltd</p>
            <p className="text-[11px] text-gray-500">stelarinteriors21@gmail.com</p>
          </div>
          <button className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center">
            <User className="w-4 h-4 mr-2 text-gray-400" /> Profile
          </button>
          <button className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center">
            <Settings className="w-4 h-4 mr-2 text-gray-400" /> Settings
          </button>
          <div className="border-t border-gray-100 my-1"></div>
          <button className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 flex items-center">
            <LogOut className="w-4 h-4 mr-2 text-red-400" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
