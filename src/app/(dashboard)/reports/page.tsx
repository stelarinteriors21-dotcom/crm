import { Save, Plus, ArrowLeft, X, Calendar as CalendarIcon, Clock, Phone, FileText, Activity, LogIn, User, CheckCircle, Edit, PhoneCall, List } from "lucide-react";
import Link from "next/link";
import { getTeamActivities } from "@/app/actions/activityActions";
import { getCurrentUser } from "@/app/actions/authActions";
import { notFound } from "next/navigation";
import ReportHeaderDownloads from "@/components/ReportHeaderDownloads";

export default async function ReportsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  
  const tab = searchParams.tab || "overview";

  let activities: any[] = [];
  if (tab === "activity") {
    activities = await getTeamActivities(1, 100);
  }

  const getIconForAction = (action: string) => {
    switch (action) {
      case "LOGIN": return <LogIn className="w-4 h-4 text-blue-500" />;
      case "LEAD_CREATED": return <User className="w-4 h-4 text-green-500" />;
      case "STATUS_UPDATED": return <CheckCircle className="w-4 h-4 text-purple-500" />;
      case "SCORE_UPDATED": return <Edit className="w-4 h-4 text-orange-500" />;
      case "CALL_MADE": return <PhoneCall className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="h-full bg-white flex flex-col -m-3 md:-m-6 relative overflow-hidden">
      
      {/* Top Header */}
      <div className="h-16 border-b border-gray-100 flex items-center px-4 md:px-6 shrink-0 justify-between gap-4">
        <h1 className="text-[17px] font-bold text-gray-800 flex items-center">
          Reports <span className="ml-2 bg-purple-100 text-[#4f46e5] text-xs px-2 py-0.5 rounded-full font-bold">ZUSH+1</span>
        </h1>
        <div className="flex items-center gap-3">
          <ReportHeaderDownloads />
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Link href="/reports?tab=overview" className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${tab === "overview" ? "bg-white shadow text-[#4f46e5]" : "text-gray-500 hover:text-gray-900"}`}>
              Overview
            </Link>
            <Link href="/reports?tab=activity" className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${tab === "activity" ? "bg-white shadow text-[#4f46e5]" : "text-gray-500 hover:text-gray-900"}`}>
              User Activity Logs
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Graph & Metrics (Full Width) */}
        <div className="w-full border-r border-gray-100 p-6 flex flex-col overflow-y-auto bg-[#FDFDFD]">
          
          {tab === "overview" ? (
            <>
              <div className="flex border-b border-gray-200 mb-6">
                <button className="flex-1 py-3 text-[13px] font-bold text-[#4f46e5] border-b-[3px] border-[#4f46e5]">DAY</button>
                <button className="flex-1 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">WEEK</button>
                <button className="flex-1 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">MONTH</button>
                <button className="flex-1 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">YEAR</button>
              </div>

              <div className="flex justify-end mb-6">
                <button className="border border-[#4f46e5] text-[#4f46e5] px-3 py-1 rounded-full text-xs font-bold flex items-center shadow-sm">
                  Today <span className="ml-1 text-[10px]">▼</span>
                </button>
              </div>

              <div className="flex justify-center space-x-4 mb-12">
                <div className="bg-[#4d3691] text-white rounded-xl p-4 w-24 h-24 flex flex-col items-center justify-center shadow-md">
                  <span className="text-[11px] font-bold tracking-wider mb-1">CALLS</span>
                  <span className="text-3xl font-bold">0</span>
                </div>
                <div className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl p-4 w-24 h-24 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[11px] font-bold tracking-wider mb-1">TIME</span>
                  <span className="text-2xl font-bold">0s</span>
                </div>
                <div className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl p-4 w-24 h-24 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[11px] font-bold tracking-wider mb-1">SALES</span>
                  <span className="text-2xl font-bold">₹0</span>
                </div>
              </div>

              <div className="relative h-64 w-full pl-8 pb-8">
                {/* Graph Y Axis */}
                <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-gray-400 font-medium">
                  <span>1</span><span>0.9</span><span>0.8</span><span>0.7</span><span>0.6</span>
                  <span>0.5</span><span>0.4</span><span>0.3</span><span>0.2</span><span>0.1</span><span>0</span>
                </div>
                {/* Graph Grid */}
                <div className="w-full h-full border-l border-b border-gray-300 flex flex-col justify-between pt-2">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="w-full border-t border-gray-100 h-0"></div>
                  ))}
                </div>
                {/* Graph X Axis */}
                <div className="absolute bottom-0 left-8 right-0 flex justify-between text-[9px] text-gray-400 font-medium transform -rotate-45 origin-top-left pt-2">
                  <span>12 AM</span><span>02 AM</span><span>04 AM</span><span>06 AM</span><span>08 AM</span>
                  <span>10 AM</span><span>12 PM</span><span>02 PM</span><span>04 PM</span><span>06 PM</span>
                  <span>08 PM</span><span>10 PM</span>
                </div>
              </div>

              <div className="text-center mt-10 text-[13px] font-bold text-gray-600">
                Calls Reports
              </div>
            </>
          ) : (
            <div className="max-w-4xl mx-auto w-full">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center mb-4">
                <List className="w-4 h-4 mr-2" />
                Detailed User Activity Logs
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {activities.length > 0 ? (
                    activities.map((log) => (
                      <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4">
                        <div className="mt-1 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          {getIconForAction(log.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            <span className="font-bold text-[#4f46e5]">{log.user.name}</span>
                            {" "}performed <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{log.action}</span>
                          </p>
                          {log.details && (
                            <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1.5 font-medium flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      No activity logs found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
