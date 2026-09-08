import { Cloud, Plus } from "lucide-react";
import Link from "next/link";

export default function APITemplatesPage() {
  return (
    <div className="h-full bg-white p-6 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="relative w-6 h-6 mr-3">
                <Cloud className="w-6 h-6 text-gray-700 absolute" />
                <span className="absolute bottom-0 right-0 text-[8px] font-bold bg-white text-gray-900 px-0.5 rounded">API</span>
              </span>
              API Templates <span className="ml-2 text-[#613cbc] text-sm cursor-pointer">↺</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">Create an API template once and use it everywhere</p>
          </div>
          <Link href="/all-custom-api-templates/create" className="bg-[#4d3691] hover:bg-purple-900 text-white px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm">
            Create New +
          </Link>
        </div>

        {/* Table / Empty State */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-[13px] font-bold text-gray-800 w-1/6">Template Name</th>
                <th className="px-6 py-3 text-left text-[13px] font-bold text-gray-800 w-1/4">Endpoint URL</th>
                <th className="px-6 py-3 text-center text-[13px] font-bold text-gray-800 w-1/6">Variables Used</th>
                <th className="px-6 py-3 text-center text-[13px] font-bold text-gray-800 w-1/6">Workflow</th>
                <th className="px-6 py-3 text-center text-[13px] font-bold text-gray-800 bg-gray-100 flex items-center justify-center">Last Modified <span className="ml-1 text-gray-400">=</span></th>
                <th className="px-6 py-3 text-center text-[13px] font-bold text-gray-800">Last Modified By</th>
                <th className="px-6 py-3 text-center text-[13px] font-bold text-gray-800">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center bg-[#F8F9FA]">
                  <div className="flex items-center justify-center text-[17px] text-gray-400 italic">
                    No API templates found, 
                    <Link href="/all-custom-api-templates/create" className="text-[#613cbc] font-medium ml-1 flex items-center hover:underline">
                      + Create new
                    </Link>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
