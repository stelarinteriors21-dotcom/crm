"use client";

import { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";
import Link from "next/link";

export default function DailySiteVisitsModal({ tasks }: { tasks: any[] }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if we should show it today
    const todayStr = new Date().toDateString();
    const hasShown = localStorage.getItem("daily_visits_shown_" + todayStr);
    
    // Find today's visits
    const today = new Date();
    const todayVisits = tasks.filter(t => {
      const title = t.title.toLowerCase();
      const isVisit = title.includes('visit') || title.includes('vist') || title.includes('site');
      if (!isVisit) return false;
      
      const taskDate = new Date(t.dueDate);
      return taskDate.getDate() === today.getDate() &&
             taskDate.getMonth() === today.getMonth() &&
             taskDate.getFullYear() === today.getFullYear();
    });

    if (!hasShown && todayVisits.length > 0) {
      setIsOpen(true);
    }
  }, [tasks]);

  if (!isOpen) return null;

  const handleClose = () => {
    const todayStr = new Date().toDateString();
    localStorage.setItem("daily_visits_shown_" + todayStr, "true");
    setIsOpen(false);
  };

  const todayVisits = tasks.filter(t => {
    const title = t.title.toLowerCase();
    const isVisit = title.includes('visit') || title.includes('vist') || title.includes('site');
    if (!isVisit) return false;
    
    const today = new Date();
    const taskDate = new Date(t.dueDate);
    return taskDate.getDate() === today.getDate() &&
           taskDate.getMonth() === today.getMonth() &&
           taskDate.getFullYear() === today.getFullYear();
  });

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 bg-gradient-to-r from-purple-600 to-[#4f46e5] text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-purple-200" />
            <h2 className="font-bold text-lg">Today's Site Visits</h2>
          </div>
          <button onClick={handleClose} className="text-white hover:text-gray-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto bg-gray-50 space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            You have {todayVisits.length} site {todayVisits.length === 1 ? 'visit' : 'visits'} scheduled for today.
          </p>
          {todayVisits.map(task => (
            <div key={task.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{task.lead?.name || "Unknown Lead"}</h3>
                  <p className="text-xs text-gray-500 mt-1">{task.title}</p>
                </div>
                <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-full whitespace-nowrap">
                  {new Date(task.dueDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-end pt-2">
                <Link 
                  href={`/leads/${task.leadId}`}
                  onClick={handleClose}
                  className="text-xs bg-[#4f46e5] hover:bg-purple-700 text-white px-3 py-1.5 rounded transition-colors"
                >
                  View Lead
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
          <button 
            onClick={handleClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
