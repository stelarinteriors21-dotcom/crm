"use client"
import { GitBranch, Info, Search, Copy, Trash2 } from "lucide-react";

export default function AutomationPage() {
  const stats = [
    { label: "Total Runs", value: "0", sub: "last 24h", color: "text-gray-900" },
    { label: "Success", value: "0%", sub: "last 24h", color: "text-green-600" },
    { label: "Failed", value: "0", sub: "last 24h", color: "text-red-600" },
    { label: "Sleeping", value: "0", sub: "last 24h", color: "text-gray-900" },
    { label: "Waiting for Reply", value: "0", sub: "last 24h", color: "text-gray-900" },
  ];

  const workflows = [
    { name: "On Facebook lead", event: "Facebook action", eventColor: "bg-blue-50 text-blue-600", status: true, time: "4d ago by Stelar", runs: 2, failures: "0 / 0" },
    { name: "On System Note", event: "System Note", eventColor: "bg-purple-50 text-purple-600", status: true, time: "2M ago by Stelar", runs: 129, failures: "0 / 0", isDraft: true },
  ];

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <GitBranch className="w-5 h-5 mr-2" /> Workflows <span className="text-blue-500 ml-2 cursor-pointer text-xl">↻</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            To execute complex automations with ease <span className="text-[#4f46e5] border-b border-[#4f46e5] border-dashed cursor-pointer">Learn More</span>
          </p>
        </div>
        <button onClick={() => alert('Opening Visual Workflow Builder...')} className="bg-[#4f46e5] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors">
          Create Workflow +
        </button>
      </div>

      {/* Date Toggle */}
      <div className="flex justify-end">
        <div className="flex bg-gray-50 rounded-md border border-gray-200 p-1">
          <button className="px-4 py-1 text-xs text-gray-500 hover:text-gray-900">All</button>
          <button className="px-4 py-1 text-xs font-medium bg-white shadow-sm rounded">24h</button>
          <button className="px-4 py-1 text-xs text-gray-500 hover:text-gray-900">7d</button>
          <button className="px-4 py-1 text-xs text-gray-500 hover:text-gray-900">30d</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">{stat.label}</span>
              <Info className="w-3 h-3 text-gray-300" />
            </div>
            <div className={`text-3xl font-semibold mb-1 ${stat.color}`}>{stat.value}</div>
            <span className="text-[10px] text-gray-400">{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex space-x-8 px-2">
        <button className="py-3 text-sm font-semibold text-gray-900 border-b-2 border-[#4f46e5]">Published</button>
        <button className="py-3 text-sm font-medium text-gray-500 hover:text-gray-700">Draft</button>
      </div>

      {/* Table Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input type="text" placeholder="Search flowchart by Name" className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-[#4f46e5]" />
        </div>
        <select className="w-48 px-3 py-2 border border-purple-200 bg-purple-50 text-purple-700 rounded-md text-sm outline-none">
          <option>On</option>
          <option>Off</option>
        </select>
        <select className="w-64 px-3 py-2 border border-gray-200 bg-gray-50 text-gray-400 rounded-md text-sm outline-none">
          <option>Select Event Types</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm">
        <div className="flex bg-gray-50/50 text-xs text-gray-500 py-3 border-b border-gray-200 px-4 md:px-6">
          <div className="w-1/3">Name</div>
          <div className="w-1/6">Events</div>
          <div className="w-1/6 text-center font-medium text-gray-700 bg-gray-100 py-1 -my-1 rounded px-2 flex items-center justify-center">Status ≡</div>
          <div className="w-1/6 text-center">Total runs</div>
          <div className="w-1/6 text-center">Last 24h runs/failures</div>
          <div className="w-[10%] text-center">Actions</div>
        </div>
        
        <div className="divide-y divide-gray-100">
          <div className="text-xs text-gray-400 bg-gray-50/50 px-4 md:px-6 py-2 flex justify-between items-center border-b border-gray-100">
            <div className="flex space-x-2 items-center">
              <button className="w-5 h-5 flex items-center justify-center border border-gray-200 rounded text-gray-300">‹</button>
              <span>1 - 2 of 2</span>
              <button className="w-5 h-5 flex items-center justify-center border border-gray-200 rounded text-gray-300">›</button>
            </div>
          </div>

          {workflows.map((wf, i) => (
            <div key={i} className="flex items-center px-4 md:px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="w-1/3">
                <p className="text-sm font-medium text-gray-800">{wf.name}</p>
                {wf.isDraft && <span className="text-[10px] text-[#4f46e5] border-b border-[#4f46e5] border-dashed cursor-pointer">View Draft</span>}
              </div>
              <div className="w-1/6">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${wf.eventColor}`}>
                  <span className="mr-1">□</span> {wf.event}
                </span>
              </div>
              <div className="w-1/6 text-center flex flex-col items-center justify-center">
                <div onClick={() => alert('Workflow toggled')} className={`w-10 h-5 rounded-full relative cursor-pointer ${wf.status ? 'bg-[#4f46e5]' : 'bg-gray-200'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${wf.status ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
                <span className="text-[10px] text-gray-400 mt-1">{wf.time}</span>
              </div>
              <div className="w-1/6 text-center text-sm text-gray-700">{wf.runs}</div>
              <div className="w-1/6 text-center text-sm text-red-600 font-medium">
                <span className="text-gray-700">{wf.failures.split('/')[0]}</span> / {wf.failures.split('/')[1]}
              </div>
              <div className="w-[10%] text-center flex justify-center space-x-3 text-gray-400">
                <button onClick={() => alert('Workflow copied!')} className="hover:text-gray-600 border border-gray-200 p-1.5 rounded"><Copy className="w-3.5 h-3.5" /></button>
                <button onClick={() => alert('Workflow deleted!')} className="hover:text-red-500 border border-gray-200 p-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
