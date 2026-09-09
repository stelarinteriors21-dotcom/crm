"use client";

import React, { useState } from "react";
import { Flag, BarChart2, RefreshCw, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

export default function CampaignsTable() {
  const [campaigns, setCampaigns] = useState([
    { id: 1, name: "@stelar-form-2k26", leads: 14, time: "17d ago" },
    { id: 2, name: "@stelar-new-upgrade-copy", leads: 152, time: "3M ago" }
  ]);

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      setCampaigns(campaigns.filter(c => c.id !== id));
    }
  };

  const handleRefresh = () => {
    // Just a visual cue that it's working
    alert("Campaign data refreshed successfully!");
  };

  const handleAnalytics = () => {
    alert("Loading analytics for this campaign...");
  };

  return (
    <>
      <div className="flex-1 overflow-auto bg-white p-6">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-[#F4F5F7] border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-[13px] font-bold text-gray-700 w-[30%]">Name</th>
                <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700 bg-gray-200/50">Priority <span className="text-[10px]">-</span></th>
                <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">Assignee</th>
                <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">Total Leads</th>
                <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">Progress</th>
                <th className="px-4 py-3 text-left text-[13px] font-bold text-gray-700">Created on</th>
                <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">No campaigns found.</td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-[13px] text-gray-600 font-medium">{campaign.name}</td>
                    <td className="px-4 py-4 text-center text-gray-400">
                      <Flag className="w-4 h-4 mx-auto cursor-pointer hover:text-red-400" title="Set Priority" />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center -space-x-2">
                        <div className="w-6 h-6 rounded-full bg-[#E8E2F7] text-[#613cbc] flex items-center justify-center text-[9px] font-bold border border-white z-10" title="Assignee 1">ZU</div>
                        <div className="w-6 h-6 rounded-full bg-[#E8E2F7] text-[#613cbc] flex items-center justify-center text-[9px] font-bold border border-white z-0" title="Assignee 2">SH</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-[13px] font-bold text-gray-700">{campaign.leads}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="w-10 h-10 rounded-full border-4 border-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-600 mx-auto cursor-pointer hover:border-[#613cbc] transition-colors" title="View Progress Details">
                        0%
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[13px] text-gray-600">{campaign.time}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center space-x-2">
                        <button onClick={handleAnalytics} className="p-1.5 bg-gray-50 border border-gray-200 rounded hover:bg-[#613cbc] hover:text-white transition-colors text-gray-500" title="View Analytics"><BarChart2 className="w-3.5 h-3.5" /></button>
                        <button onClick={handleRefresh} className="p-1.5 bg-gray-50 border border-gray-200 rounded hover:bg-[#613cbc] hover:text-white transition-colors text-gray-500" title="Sync Campaign"><RefreshCw className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(campaign.id)} className="p-1.5 bg-gray-50 border border-gray-200 rounded hover:bg-red-500 hover:border-red-500 hover:text-white transition-colors text-gray-500" title="Delete Campaign"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer */}
      <div className="h-12 border-t border-gray-100 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 absolute bottom-0 w-full">
        <div className="text-[11px] text-gray-500">1-{campaigns.length} of {campaigns.length}</div>
        <div className="flex items-center space-x-1">
          <button className="text-gray-400 hover:text-gray-600 p-1 font-bold disabled:opacity-50" disabled><ChevronLeft className="w-4 h-4" /></button>
          <button className="w-6 h-6 rounded bg-[#4d3691] text-white text-xs font-bold flex items-center justify-center">1</button>
          <button className="text-gray-400 hover:text-gray-600 p-1 font-bold disabled:opacity-50" disabled><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    </>
  );
}
