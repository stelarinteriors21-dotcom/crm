import { ShoppingCart } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="h-full bg-white flex flex-col p-8 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your billing information</p>
          </div>
          <button className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Buy Licenses
          </button>
        </div>

        {/* Tab */}
        <div className="border-b border-gray-200 mb-6">
          <div className="inline-flex items-center px-2 py-3 border-b-2 border-[#613cbc] text-sm font-bold text-[#613cbc]">
            <span className="mr-2">🧾</span> Transaction History
          </div>
        </div>

        {/* Filters */}
        <div className="flex justify-end space-x-3 mb-4">
          <select className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm outline-none shadow-sm">
            <option>Status</option>
          </select>
          <select className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm outline-none shadow-sm">
            <option>Billing Cycle</option>
          </select>
          <div className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm flex items-center shadow-sm">
            Select Purchase Date <span className="ml-2">📅</span>
          </div>
        </div>

        {/* Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <table className="min-w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-700">Order ID</th>
                <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-[#613cbc] bg-[#f8f6fd]">Date ⬇</th>
                <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-700">Amount ⇅</th>
                <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-700">Billing Cycle</th>
                <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-700">Status</th>
                <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="py-24 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    {/* Simplified ASCII/Emoji representation of the receipt graphic */}
                    <div className="text-6xl mb-4 relative">
                      🧾
                      <div className="absolute -bottom-2 -right-2 text-2xl">⚠️</div>
                    </div>
                    <p className="text-sm font-medium mt-2">No transactions found!</p>
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
