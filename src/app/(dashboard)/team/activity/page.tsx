import { getTeamActivities, getUserInvolvementStats } from "@/app/actions/activityActions";
import { getCurrentUser } from "@/app/actions/authActions";
import { notFound } from "next/navigation";
import { Activity, Clock, User, LogIn, Edit, PhoneCall, List, CheckCircle } from "lucide-react";

export default async function ActivityLogPage() {
  const user = await getCurrentUser();
  if (!user) return notFound();

  // Optionally restrict to Admins only
  // if (user.role !== "ADMIN") return <div className="p-8 text-center">Unauthorized</div>;

  const activities = await getTeamActivities(1, 100);
  const stats = await getUserInvolvementStats();

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
    <div className="p-8 max-w-6xl mx-auto space-y-8 pb-32">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center">
          <Activity className="w-6 h-6 mr-3 text-[#613cbc]" />
          Team Activity & Involvement
        </h1>
        <p className="text-gray-500 mt-1">Monitor real-time activity and track daily involvement time for all users.</p>
      </div>

      {/* Involvement Stats Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Today's Involvement Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-[#613cbc] font-bold text-lg">
                  {stat.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{stat.name}</h3>
                  <p className="text-xs text-gray-500">{stat.totalActions} actions logged today</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="font-semibold text-gray-900">{stat.activeMinutes} min</span>
                  <span className="text-xs text-gray-400 ml-1"> active</span>
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  Last seen: {stat.lastActivity.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {stats.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-400 border border-dashed rounded-xl">
              No activity recorded today yet.
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center">
          <List className="w-4 h-4 mr-2" />
          Recent Activity Log
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
                      <span className="font-bold text-[#613cbc]">{log.user.name}</span>
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
    </div>
  );
}
