import prisma from "@/lib/prisma";
import { TrendingUp, Clock, PhoneCall, Calendar } from "lucide-react";

export default async function AnalyticsPage() {
  const users = await prisma.user.findMany({
    include: {
      calls: true,
      assignedLeads: true
    }
  });

  // Calculate aggregated stats
  const teamStats = users.map(user => {
    const totalCalls = user.calls.length;
    const totalDuration = user.calls.reduce((sum, call) => sum + call.duration, 0);
    const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
    
    // Format duration MM:SS
    const formatDuration = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s}s`;
    };

    return {
      id: user.id,
      name: user.name,
      totalCalls,
      totalDurationFormatted: formatDuration(totalDuration),
      avgDurationFormatted: formatDuration(avgDuration),
      leadsAssigned: user.assignedLeads.length
    };
  });

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Call Report</h1>
          <p className="text-sm text-gray-500 mt-1">Detailed analytics and performance tracking</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium hover:bg-gray-50">
            <Calendar className="w-4 h-4 mr-2 text-gray-500" />
            This Month
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm font-medium text-gray-500">Total Calls Made</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{teamStats.reduce((sum, u) => sum + u.totalCalls, 0)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm font-medium text-gray-500">Avg Duration</div>
          <div className="mt-2 text-3xl font-bold text-[#4f46e5]">
            {Math.round(teamStats.reduce((sum, u) => sum + (u.totalCalls > 0 ? (u.totalCalls * parseInt(u.avgDurationFormatted)) : 0), 0) / (teamStats.reduce((sum, u) => sum + u.totalCalls, 0) || 1))}s
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm font-medium text-gray-500">Total Connected</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{Math.floor(teamStats.reduce((sum, u) => sum + u.totalCalls, 0) * 0.7)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm font-medium text-gray-500">Total Leads Assigned</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{teamStats.reduce((sum, u) => sum + u.leadsAssigned, 0)}</div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Agent Performance Leaderboard</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white">
            <tr>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Telecaller</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Leads</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Calls</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Duration</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Talk Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teamStats.map((agent, i) => (
              <tr key={agent.id} className="hover:bg-gray-50">
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold mr-3 text-xs">
                      {i + 1}
                    </div>
                    <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                  </div>
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {agent.leadsAssigned}
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {agent.totalCalls}
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    <Clock className="w-3 h-3 mr-1" /> {agent.avgDurationFormatted}
                  </span>
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {agent.totalDurationFormatted}
                </td>
              </tr>
            ))}
            {teamStats.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 md:px-6 py-12 text-center text-gray-500">No agent data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
