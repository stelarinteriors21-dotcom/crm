import { Search, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";

export default function SalesformsPage() {
  return (
    <div className="h-full bg-white p-6 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="w-6 h-6 mr-3 text-gray-700 font-serif text-lg">⚯</span>
              Salesforms <span className="ml-2 text-[#4f46e5] text-sm cursor-pointer">↺</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">To automatically fill lead form data</p>
          </div>
          <Link href="/all-salesform/create" className="bg-[#4d3691] hover:bg-purple-900 text-white px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm">
            Create Salesform +
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex space-x-6 border-b border-gray-200 mb-6">
          <button className="py-2 text-[15px] font-bold border-b-2 border-[#4f46e5] text-gray-900">
            Published
          </button>
          <button className="py-2 text-[15px] font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">
            Draft
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search salesform by Name" 
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#4f46e5]"
            />
          </div>
          <div className="relative flex-1">
            <select className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-md text-sm text-gray-500 appearance-none bg-white focus:outline-none focus:border-[#4f46e5]">
              <option value="">Status</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Table / Empty State */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 w-1/4">Name</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 w-1/5">Events</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 w-1/6">Status</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 flex items-center">Status Updated On <span className="ml-1 text-[10px]">▼</span></th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500">Status Updated by</th>
                <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="px-4 md:px-6 py-12 text-center bg-[#f8fafc]">
                  <div className="text-[17px] font-semibold text-gray-800 mb-1">No Salesform found!</div>
                  <Link href="/all-salesform/create" className="text-sm font-medium text-[#4f46e5] hover:underline flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Create New Salesform
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
