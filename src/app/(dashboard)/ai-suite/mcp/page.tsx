import { Cpu, Copy, Plus, Trash2, Edit2, Link as LinkIcon, Info } from "lucide-react";

export default function MCPPage() {
  return (
    <div className="h-full bg-[#f8fafc] flex flex-col p-8 overflow-y-auto">
      <div className="w-full max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-start mb-8">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-4 shadow-sm">
            <Cpu className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center">
              Model Context Protocol <span className="ml-2 text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">BETA</span>
            </h1>
            <p className="text-[13px] text-gray-500 mt-1 max-w-xl leading-relaxed">
              Connect Claude, ChatGPT, or Gemini directly to your workspace. Query leads, run summaries, and build AI workflows in plain language.
            </p>
          </div>
        </div>

        {/* Server URL Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
          <h2 className="text-sm font-bold text-gray-800 flex items-center mb-4">
            <LinkIcon className="w-4 h-4 mr-2 text-purple-600" />
            Server URL
          </h2>
          <div className="flex items-center mb-4">
            <input 
              type="text" 
              readOnly 
              value="https://mcp.stelar.in/6a1e96a0155d5239a59e6bcf/mcp" 
              className="flex-1 bg-gray-50 border border-gray-200 rounded-l-md px-4 py-2.5 text-sm text-gray-600 font-mono outline-none"
            />
            <button className="bg-[#4d3691] hover:bg-purple-900 text-white px-5 py-2.5 rounded-r-md text-sm font-medium flex items-center transition-colors">
              <Copy className="w-4 h-4 mr-2" /> Copy
            </button>
          </div>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-700 flex items-center">
            <span className="mr-2">&gt;</span> How to connect this URL in your AI client
          </a>
        </div>

        {/* Access Tokens Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold text-gray-800 flex items-center">
              <span className="mr-2 text-purple-600 font-serif">⚷</span>
              Access tokens
            </h2>
            <button className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center">
              <Plus className="w-4 h-4 mr-1" /> Create new
            </button>
          </div>
          
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 tracking-wider">NAME</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 tracking-wider">CREATED BY</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 tracking-wider">CREATED ON</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm text-gray-700 font-medium flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></div>
                    Stelar_Interiors_Pvt_Ltd__claude_stelarinteriors21_read_05-06-26-20-43-11
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">Stelar Interiors</td>
                  <td className="px-4 py-4 text-sm text-gray-500">05 Jun 2026, 20:43</td>
                  <td className="px-4 py-4 text-right">
                    <button className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Workspace Context Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold text-gray-800 flex items-center">
              <span className="mr-2 text-purple-600">📄</span>
              Workspace context 
              <span className="ml-2 flex items-center text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                <Info className="w-3 h-3 mr-1" /> Auto-injected
              </span>
            </h2>
            <button className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center">
              <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
            </button>
          </div>
          <p className="text-sm text-gray-500">
            No context saved. Click <strong>Edit</strong> to add it.
          </p>
        </div>

      </div>
    </div>
  );
}
