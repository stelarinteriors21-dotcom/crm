import prisma from "@/lib/prisma";
import { Edit2, ChevronRight, Search } from "lucide-react";
import { notFound } from "next/navigation";

export default async function PermissionTemplateDetailsPage({ params }: { params: { id: string } }) {
  const template = await prisma.permissionTemplate.findUnique({
    where: { id: params.id },
    include: {
      users: true
    }
  });

  if (!template) {
    notFound();
  }

  return (
    <div className="h-full flex -mx-6 -mt-6">
      
      {/* Left Sidebar */}
      <div className="w-[300px] bg-white border-r border-gray-200 p-6 flex flex-col">
        <div className="flex justify-between items-start mb-8">
          <h1 className="text-[22px] font-bold text-gray-800 leading-tight">
            {template.name} Permissions
          </h1>
          <button className="text-[#4f46e5] hover:bg-purple-50 p-1.5 rounded-full transition-colors shrink-0 ml-2">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <button className="w-full flex justify-between items-center px-4 py-3 bg-[#f8f6fd] text-gray-900 font-semibold rounded-lg text-[15px]">
            Assignee
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button className="w-full flex justify-between items-center px-4 py-3 text-gray-900 font-semibold hover:bg-gray-50 rounded-lg text-[15px] transition-colors">
            Access
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button className="w-full flex justify-between items-center px-4 py-3 text-gray-900 font-semibold hover:bg-gray-50 rounded-lg text-[15px] transition-colors">
            View
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button className="w-full flex justify-between items-center px-4 py-3 text-gray-900 font-semibold hover:bg-gray-50 rounded-lg text-[15px] transition-colors">
            Templates
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button className="w-full flex justify-between items-center px-4 py-3 text-gray-900 font-semibold hover:bg-gray-50 rounded-lg text-[15px] transition-colors">
            Embedded Apps
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#f8fafc] p-8 overflow-y-auto">
        
        {/* Header Metadata */}
        <div className="flex justify-between items-start mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Assignees</h2>
          
          <div className="text-[10px] text-gray-500 text-right leading-relaxed flex flex-col items-end">
            <div className="flex items-center">
              <span>Created On: <span className="font-semibold text-gray-700">{""}</span> | Created by:</span>
              <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600 ml-1 border border-gray-300">SI</div>
            </div>
            <div className="flex items-center mt-1">
              <span>Last Modified On: <span className="font-semibold text-gray-700">{""}</span> | Last Modified by:</span>
              <div className="w-4 h-4 rounded-full bg-[#E8E2F7] flex items-center justify-center text-[8px] font-bold text-[#4f46e5] ml-1 border border-[#d6cbf0]">SI</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search" 
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-[#4f46e5] bg-white shadow-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="px-4 md:px-6 py-4 text-left text-sm font-bold text-gray-700 w-1/3">Name</th>
                <th className="px-4 md:px-6 py-4 text-left text-sm font-bold text-gray-700 w-1/3">Email</th>
                <th className="px-4 md:px-6 py-4 text-left text-sm font-bold text-gray-700 w-1/3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {template.users && template.users.length > 0 ? (
                template.users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 text-sm text-gray-800">{user.name}</td>
                    <td className="px-4 md:px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 md:px-6 py-4 text-sm text-gray-600">{template.name.replace('Default ', '').replace(' Permissions', '')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 md:px-6 py-16 text-center text-[15px] text-gray-500">
                    Not assigned to user
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {template.users && template.users.length > 0 && (
            <div className="px-4 md:px-6 py-3 border-t border-gray-100 flex justify-end text-xs text-gray-400 font-medium">
              &lt; 1 - {template.users.length} of {template.users.length} &gt;
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
