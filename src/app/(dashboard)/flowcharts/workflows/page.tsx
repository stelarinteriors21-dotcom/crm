import { Search, MoreVertical, Plus, Circle, PlayCircle, Filter } from "lucide-react";
import Link from "next/link";

export default function AutomationsDashboard() {
  return (
    <div className="h-full bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              Automations
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Automate repetitive CRM actions with simple trigger → condition → action
            </p>
          </div>
          <Link href="/flowcharts/workflows/create" className="bg-[#613cbc] hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Create Automation
          </Link>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search automations..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#613cbc] transition-colors" />
          </div>
          <div className="flex space-x-3">
            <button className="flex items-center space-x-2 text-sm font-medium text-gray-600 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <span>All</span>
              <Filter className="w-3.5 h-3.5" />
            </button>
            <button className="flex items-center space-x-2 text-sm font-medium text-gray-600 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <span>Published</span>
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Automations</h3>
            <div className="text-3xl font-black text-gray-900">12</div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Published</h3>
            <div className="text-3xl font-black text-[#613cbc]">8</div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Drafts</h3>
            <div className="text-3xl font-black text-gray-600">3</div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Executions</h3>
            <div className="text-3xl font-black text-green-600">1,284</div>
          </div>
        </div>

        {/* Automations List */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Your Automations</h2>
          </div>
          <table className="min-w-full">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trigger</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 md:px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Runs</th>
                <th className="px-4 md:px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AutomationRow name="New WhatsApp Lead" trigger="WhatsApp" status="Published" runs="284" />
              <AutomationRow name="Facebook Lead Follow-up" trigger="Facebook Lead" status="Published" runs="421" />
              <AutomationRow name="Website Lead Assignment" trigger="Website Lead" status="Published" runs="189" />
              <AutomationRow name="Payment Confirmation" trigger="WooCommerce" status="Published" runs="156" />
              <AutomationRow name="New Call Lead Notification" trigger="Call Log Lead" status="Draft" runs="—" />
              <AutomationRow name="High Priority Lead Alert" trigger="Lead Rating Change" status="Published" runs="94" />
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

function AutomationRow({ name, trigger, status, runs }: any) {
  const isPublished = status === 'Published';
  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className="px-4 md:px-6 py-4">
        <div className="text-sm font-bold text-gray-900">{name}</div>
      </td>
      <td className="px-4 md:px-6 py-4">
        <div className="text-sm text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md inline-block">{trigger}</div>
      </td>
      <td className="px-4 md:px-6 py-4">
        <div className={`flex items-center text-sm font-medium ${isPublished ? 'text-green-600' : 'text-gray-500'}`}>
          {isPublished ? <PlayCircle className="w-4 h-4 mr-1.5" /> : <Circle className="w-4 h-4 mr-1.5" />}
          {status}
        </div>
      </td>
      <td className="px-4 md:px-6 py-4 text-center">
        <div className="text-sm font-bold text-gray-700">{runs}</div>
      </td>
      <td className="px-4 md:px-6 py-4 text-right">
        <button className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all">
          <MoreVertical className="w-5 h-5" />
        </button>
      </td>
    </tr>
  );
}
