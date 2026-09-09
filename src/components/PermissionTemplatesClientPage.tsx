"use client"

import { useState } from "react";
import { ShieldAlert, Search, Edit2, Trash2, Eye, Lock } from "lucide-react";
import Link from "next/link";

export default function PermissionTemplatesClientPage({ templates }: { templates: any[] }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="h-full flex flex-col items-center bg-[#F8F9FA] p-8 overflow-y-auto">
      <div className="w-full max-w-4xl relative">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-[22px] font-bold text-gray-800 flex items-center">
            <ShieldAlert className="w-5 h-5 mr-2 text-gray-700" />
            Permission Templates <span className="text-[#613cbc] ml-2 text-sm">↺</span>
          </h1>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-[#4d3691] text-white rounded text-sm font-medium hover:bg-purple-900 transition-colors shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 mr-2" />
            + Add new
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-6 border-b border-gray-200 mb-6">
          <button className="py-2 text-sm font-bold border-b-2 border-[#613cbc] text-[#613cbc]">
            All
          </button>
          <button className="py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">
            Defaults
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-[#613cbc]"
          />
        </div>
        <div className="text-xs text-gray-400 mb-4">{templates.length} templates found</div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500">Name</th>
                <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-500">Assigned to</th>
                <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-500">Last modified on ≡</th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map(template => (
                <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-800 flex items-center">
                    <ShieldAlert className="w-4 h-4 mr-2 text-gray-400" />
                    <Link href={`/team/permissions/${template.id}`} className="hover:text-[#613cbc]">
                      {template.name}
                    </Link>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-700">
                    {template._count?.users || 0}
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    3M ago
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end space-x-3">
                      {template.name === 'Default Root Permissions' ? (
                         <button className="text-gray-400 hover:text-gray-600"><Eye className="w-4 h-4" /></button>
                      ) : (
                         <button className="text-gray-400 hover:text-[#613cbc]"><Edit2 className="w-4 h-4" /></button>
                      )}
                      <button className="text-red-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Overlay */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 relative">
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
              
              <h2 className="text-xl font-bold text-gray-900 mb-4">Enable permission template</h2>
              
              <div className="text-[13px] text-gray-700 leading-relaxed mb-6">
                <p className="mb-1">Permission template will help you manage your teams permission granularly.</p>
                <p>To enable permission template feature for your workspace, contact your respective account manager.</p>
              </div>

              <div className="mb-6">
                <label className="block text-[13px] text-gray-700 mb-2">Enter the <strong>key</strong> given by your account manager</label>
                <input 
                  type="text" 
                  placeholder="Enter your key here" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#613cbc]"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  className="px-4 md:px-6 py-2 bg-[#b8a6eb] text-white text-sm font-medium rounded-lg hover:bg-[#613cbc] transition-colors"
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
