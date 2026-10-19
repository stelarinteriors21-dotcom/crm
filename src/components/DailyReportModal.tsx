"use client";

import { useEffect, useState } from "react";
import { X, Download, FileText, CheckCircle2, PhoneCall, MapPin } from "lucide-react";
import { getTeamTasksData } from "@/app/actions/reportActions";

export default function DailyReportModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeamTasksData().then(res => {
      setData(res);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const downloadCSV = () => {
    let csv = "User,Role,Pending Tasks\n";
    
    data.forEach(userReport => {
      csv += `"${userReport.user.name}","${userReport.user.role}","${userReport.pendingCount}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pending_Tasks_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
          <div className="flex items-center min-w-0 pr-2">
            <FileText className="w-5 h-5 text-indigo-600 mr-2 shrink-0" />
            <h2 className="text-sm sm:text-lg font-bold text-gray-800 truncate">Team Pending Tasks Report</h2>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button 
              type="button"
              onClick={downloadCSV}
              disabled={loading || data.length === 0}
              className="flex items-center px-2.5 sm:px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 bg-gray-50/50">
          {loading ? (
            <div className="flex justify-center items-center py-20 text-gray-400">Loading pending tasks...</div>
          ) : data.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-bold">No team members found.</div>
          ) : (
            <div className="space-y-4">
              {data.map((userReport, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col md:flex-row items-stretch">
                  <div className="bg-indigo-50/50 px-6 py-4 border-b md:border-b-0 md:border-r border-gray-100 flex md:flex-col justify-between md:justify-center items-center md:w-48 shrink-0">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm mb-2">
                        {userReport.user.name.substring(0,2).toUpperCase()}
                      </div>
                      <div className="font-bold text-gray-800 text-sm text-center">{userReport.user.name}</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{userReport.user.role}</div>
                    </div>
                    <div className="md:mt-4 text-center">
                      <div className="text-3xl font-black text-[#4f46e5]">{userReport.pendingCount}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Pending Tasks</div>
                    </div>
                  </div>

                  <div className="p-4 flex-1">
                    {userReport.pendingCount === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-4 text-gray-400">
                        <CheckCircle2 className="w-6 h-6 mb-2 text-green-400" />
                        <span className="text-sm font-bold text-gray-500">All caught up!</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto pr-2">
                        {userReport.tasks.map((task: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between bg-gray-50 p-2.5 rounded border border-gray-100">
                            <div className="flex items-center">
                              {task.type === "Site Visit" ? (
                                <MapPin className="w-4 h-4 text-orange-500 mr-2 shrink-0" />
                              ) : (
                                <PhoneCall className="w-4 h-4 text-indigo-500 mr-2 shrink-0" />
                              )}
                              <span className="font-bold text-gray-700 text-sm">{task.name}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-600">
                              {task.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
