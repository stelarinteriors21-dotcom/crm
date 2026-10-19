"use client";

import { useState, useEffect } from "react";
import { X, Calendar, CheckCircle, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { completeSiteVisit } from "@/app/actions/leadActions";
import { AlertNotificationManager } from "@/lib/alertNotifier";

export default function DailySiteVisitsModal({ tasks }: { tasks: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTasks, setCurrentTasks] = useState<any[]>(tasks || []);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setCurrentTasks(tasks || []);
  }, [tasks]);

  const activeVisits = currentTasks.filter(t => {
    if (t.isCompleted) return false;
    const title = (t.title || "").toLowerCase();
    const isVisit = title.includes('visit') || title.includes('vist') || title.includes('site');
    if (!isVisit) return false;
    
    const today = new Date();
    const taskDate = new Date(t.dueDate);
    return taskDate.getDate() === today.getDate() &&
           taskDate.getMonth() === today.getMonth() &&
           taskDate.getFullYear() === today.getFullYear();
  });

  useEffect(() => {
    const todayStr = new Date().toDateString();
    const hasShown = localStorage.getItem("daily_visits_shown_" + todayStr);
    
    if (!hasShown && activeVisits.length > 0) {
      setIsOpen(true);
      AlertNotificationManager.dispatchEqualAlert({
        title: "📅 TODAY'S SITE VISITS!",
        body: `You have ${activeVisits.length} site visit(s) scheduled for today.`,
        tag: "daily_site_visits",
        titleFlashText: "SITE VISITS TODAY!"
      });
    }
  }, [activeVisits.length]);

  if (!isOpen || activeVisits.length === 0) return null;

  const handleClose = () => {
    const todayStr = new Date().toDateString();
    localStorage.setItem("daily_visits_shown_" + todayStr, "true");
    setIsOpen(false);
    AlertNotificationManager.dismissEqualAlert();
  };

  const handleCompleteVisit = async (task: any) => {
    const progress = window.prompt("Enter site visit notes/outcome:", "Site visit completed successfully.");
    if (progress === null) return;

    setCompletingId(task.id);
    setCurrentTasks(prev => prev.filter(t => t.id !== task.id));

    try {
      await completeSiteVisit(task.id, task.leadId, progress || "Completed");
      router.refresh();
      if (activeVisits.length <= 1) {
        handleClose();
      }
    } catch (err) {
      alert("Failed to record site visit completion.");
      setCurrentTasks(tasks || []);
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-purple-600 to-[#4f46e5] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-purple-200" />
            <h2 className="font-bold text-base sm:text-lg">Today's Site Visits</h2>
          </div>
          <button 
            type="button"
            onClick={handleClose} 
            className="text-white hover:text-gray-200 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3.5 sm:p-5 max-h-[60vh] flex-1 overflow-y-auto bg-gray-50 space-y-3">
          <p className="text-xs sm:text-sm text-gray-600 mb-2">
            You have {activeVisits.length} site {activeVisits.length === 1 ? 'visit' : 'visits'} scheduled for today.
          </p>
          {activeVisits.map(task => (
            <div key={task.id} className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">{task.lead?.name || "Unknown Lead"}</h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 line-clamp-2">{task.title}</p>
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap shrink-0">
                  {new Date(task.dueDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100/60">
                <button
                  type="button"
                  onClick={() => handleCompleteVisit(task)}
                  disabled={completingId === task.id}
                  className="inline-flex items-center text-[11px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                  title="Mark visit as completed and clear notification"
                >
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  {completingId === task.id ? "Saving..." : "Mark Completed"}
                </button>
                <Link 
                  href={`/leads/${task.leadId}`}
                  onClick={handleClose}
                  className="text-[11px] sm:text-xs bg-[#4f46e5] hover:bg-purple-700 text-white px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors"
                >
                  View Lead
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 sm:p-4 border-t border-gray-100 bg-white flex justify-end shrink-0">
          <button 
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-lg transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
