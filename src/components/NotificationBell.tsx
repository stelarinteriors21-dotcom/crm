"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Calendar } from "lucide-react";
import Link from "next/link";

export default function NotificationBell({ tasks }: { tasks: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-[#613cbc] hover:bg-purple-50 rounded-full transition-colors relative" 
        title="Site Visit Notifications"
      >
        <Bell className="w-5 h-5" />
        {tasks.length > 0 && (
          <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-[70] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-[#613cbc]" />
              Follow-ups & Site Visits
            </h3>
            <span className="bg-[#613cbc] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
            {tasks.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No upcoming follow-ups.</div>
            ) : (
              tasks.map(task => (
                <Link 
                  key={task.id} 
                  href={`/leads/${task.leadId}`}
                  onClick={() => setIsOpen(false)}
                  className="block p-3 rounded-lg hover:bg-purple-50 transition-colors border border-transparent hover:border-purple-100"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-gray-800 text-sm truncate pr-2">{task.lead?.name || "Lead"}</span>
                    <span className="text-[10px] font-bold text-[#613cbc] whitespace-nowrap bg-purple-100 px-1.5 py-0.5 rounded">
                      {new Date(task.dueDate).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{task.title}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
