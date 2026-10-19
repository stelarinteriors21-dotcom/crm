"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Calendar, CheckCircle, Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { completeSiteVisit, markTaskCompleted } from "@/app/actions/leadActions";
import { AlertNotificationManager } from "@/lib/alertNotifier";

export default function NotificationBell({ tasks = [] }: { tasks: any[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [taskList, setTaskList] = useState<any[]>(tasks || []);
  const [loadingTasks, setLoadingTasks] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTaskList(tasks || []);
  }, [tasks]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCompleteTask = async (e: React.MouseEvent, task: any) => {
    e.preventDefault();
    e.stopPropagation();

    const titleLower = (task.title || "").toLowerCase();
    const isSiteVisit = titleLower.includes("visit") || titleLower.includes("site");

    if (isSiteVisit) {
      const progress = window.prompt("Please enter the site visit progress/notes:", "Site visit verified & completed.");
      if (progress === null) return;

      setLoadingTasks(prev => [...prev, task.id]);
      setTaskList(prev => prev.filter(t => t.id !== task.id));
      try {
        await completeSiteVisit(task.id, task.leadId, progress || "Completed");
        if (taskList.length <= 1) {
          AlertNotificationManager.dismissEqualAlert();
        }
        router.refresh();
      } catch (err) {
        alert("Failed to complete site visit.");
        setTaskList(tasks || []);
      } finally {
        setLoadingTasks(prev => prev.filter(id => id !== task.id));
      }
    } else {
      // General follow-up task
      setLoadingTasks(prev => [...prev, task.id]);
      setTaskList(prev => prev.filter(t => t.id !== task.id));
      try {
        await markTaskCompleted(task.id);
        if (taskList.length <= 1) {
          AlertNotificationManager.dismissEqualAlert();
        }
        router.refresh();
      } catch (err) {
        alert("Failed to complete task.");
        setTaskList(tasks || []);
      } finally {
        setLoadingTasks(prev => prev.filter(id => id !== task.id));
      }
    }
  };

  const hasTodaySiteVisit = taskList.some(t => {
    const title = (t.title || "").toLowerCase();
    if (!(title.includes('visit') || title.includes('vist') || title.includes('site'))) return false;
    const today = new Date();
    const taskDate = new Date(t.dueDate);
    return taskDate.getDate() === today.getDate() && 
           taskDate.getMonth() === today.getMonth() && 
           taskDate.getFullYear() === today.getFullYear();
  });

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 text-gray-500 hover:text-[#4f46e5] hover:bg-purple-50 rounded-full transition-colors relative ${hasTodaySiteVisit ? 'animate-bounce text-[#4f46e5]' : ''}`} 
        title="Follow-up & Site Visit Notifications"
      >
        <Bell className="w-5 h-5" />
        {taskList.length > 0 && (
          <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="origin-top-right absolute -right-16 sm:right-0 mt-2 w-[320px] sm:w-96 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-[70] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-[#4f46e5]" />
              Follow-ups & Site Visits
            </h3>
            <span className="bg-[#4f46e5] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {taskList.length}
            </span>
          </div>
          
          <div className="max-h-[350px] overflow-y-auto p-2 space-y-1">
            {taskList.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs font-medium">
                No active follow-ups or site visit notifications.
              </div>
            ) : (
              taskList.map(task => {
                const titleLower = (task.title || "").toLowerCase();
                const isSiteVisit = titleLower.includes("visit") || titleLower.includes("site");

                return (
                  <Link 
                    key={task.id} 
                    href={`/leads/${task.leadId}`}
                    onClick={() => setIsOpen(false)}
                    className="block p-3 rounded-lg hover:bg-purple-50 transition-colors border border-transparent hover:border-purple-100 relative group text-left"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-gray-800 text-sm truncate pr-2">{task.lead?.name || "Lead"}</span>
                      <span className="text-[10px] font-bold text-[#4f46e5] whitespace-nowrap bg-purple-100 px-1.5 py-0.5 rounded">
                        {new Date(task.dueDate).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{task.title}</p>
                    
                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-gray-100/60">
                      <span className="text-[10px] font-semibold text-gray-400">
                        {isSiteVisit ? "📍 Field Visit" : "📞 Call Task"}
                      </span>
                      <button
                        onClick={(e) => handleCompleteTask(e, task)}
                        disabled={loadingTasks.includes(task.id)}
                        className="inline-flex items-center text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                        title="Mark Task Complete & Clear Notification"
                      >
                        <Check className="w-3 h-3 mr-1 text-emerald-600" />
                        {loadingTasks.includes(task.id) ? "Clearing..." : (isSiteVisit ? "Complete Visit" : "Mark Done")}
                      </button>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
