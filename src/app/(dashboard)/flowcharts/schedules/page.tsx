import { Calendar, Search, Info } from "lucide-react";
import Link from "next/link";

export default function SchedulesPage() {
  return (
    <div className="h-full bg-white p-6 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="w-6 h-6 mr-3 text-gray-700" />
              Schedules <span className="ml-2 text-[#4f46e5] text-sm cursor-pointer">↺</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              To automatically keep in touch with your leads <span className="text-[#4f46e5] border-b border-purple-200 cursor-pointer ml-1">Learn More</span>
            </p>
          </div>
          <Link href="/flowcharts/schedules/create" className="bg-[#4d3691] hover:bg-purple-900 text-white px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm">
            Create New Schedule +
          </Link>
        </div>

        {/* Date Toggle */}
        <div className="flex justify-end mb-6">
          <div className="bg-gray-50 rounded border border-gray-200 flex text-[13px] font-medium p-0.5">
            <button className="px-4 py-1 text-gray-500 hover:text-gray-700">All</button>
            <button className="px-4 py-1 bg-white border border-gray-200 rounded shadow-sm text-gray-800">24h</button>
            <button className="px-4 py-1 text-gray-500 hover:text-gray-700">7d</button>
            <button className="px-4 py-1 text-gray-500 hover:text-gray-700">30d</button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-sm font-medium text-gray-500">Total Runs</h3>
              <Info className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-[28px] font-bold text-gray-800">0</div>
            <div className="text-xs text-gray-400 mt-1">last 24h</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-sm font-medium text-gray-500">Success</h3>
              <Info className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-[28px] font-bold text-green-600">0%</div>
            <div className="text-xs text-gray-400 mt-1">last 24h</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-sm font-medium text-gray-500">Failed</h3>
              <Info className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-[28px] font-bold text-red-500">0</div>
            <div className="text-xs text-gray-400 mt-1">last 24h</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-6 border-b border-gray-200 mb-6 px-2">
          <button className="py-2 text-[15px] font-bold border-b-2 border-[#4f46e5] text-gray-900">
            Published
          </button>
          <button className="py-2 text-[15px] font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">
            Draft
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-[2]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search flowchart by Name" 
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#4f46e5]"
            />
          </div>
          <div className="flex-1 bg-purple-50 border border-purple-200 rounded-md px-3 py-2 text-sm text-[#4d3691] flex justify-between items-center font-medium">
            On <span className="text-[10px]">▼</span>
          </div>
          <div className="flex-[1.5] border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-500 flex justify-between items-center">
            Select Event Types <span className="text-[10px]">▼</span>
          </div>
        </div>

        {/* Table / Empty State */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 w-1/4">Name</th>
                <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-500 w-1/5">Events</th>
                <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-500 bg-gray-100 flex items-center justify-center">Status <span className="ml-1 text-gray-400">=</span></th>
                <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-500">Last run</th>
                <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-500">Last run status</th>
                <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="px-4 md:px-6 py-12 text-center bg-[#f8fafc]">
                  <div className="text-[15px] font-bold text-gray-400">No Flowcharts Found</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
