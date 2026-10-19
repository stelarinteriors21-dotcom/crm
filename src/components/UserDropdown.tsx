"use client";

import { useState } from "react";
import { LogOut, User, Settings, Calendar } from "lucide-react";
import { logout } from "@/app/actions/authActions";
import Link from "next/link";
import ManageLeavesModal from "./ManageLeavesModal";

export default function UserDropdown({ initials, name, email, isAdmin = false }: { initials: string, name: string, email: string, isAdmin?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLeavesModal, setShowLeavesModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <>
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded-full bg-purple-100 text-[#4f46e5] flex items-center justify-center text-sm font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:ring-offset-2"
        >
          {initials}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
                <p className="text-xs text-gray-500 truncate">{email}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => { setIsOpen(false); setShowLeavesModal(true); }}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium mb-1"
                >
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" /> My Leaves
                </button>
                {isAdmin && (
                  <Link
                    href="/settings"
                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium mb-1"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings className="w-4 h-4 mr-2 text-gray-500" /> Settings
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {showLeavesModal && <ManageLeavesModal onClose={() => setShowLeavesModal(false)} />}
    </>
  );
}
