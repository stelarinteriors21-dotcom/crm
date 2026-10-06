import { Search } from "lucide-react";
import Link from "next/link";

export default function IntegrationsPage() {
  return (
    <div className="h-full bg-[#f8fafc] p-8 overflow-y-auto flex flex-col items-center">
      <div className="w-full max-w-4xl">
        
        {/* Top Navbar Simulation */}
        <div className="flex border border-gray-200 rounded-t-lg bg-white overflow-hidden mb-8 shadow-sm">
          <div className="px-4 md:px-6 py-3 font-semibold text-gray-800 text-sm border-r border-gray-200">
            Integrations
          </div>
          <div className="flex-1 px-4 flex items-center relative">
            <input 
              type="text" 
              placeholder="Search Integration by name" 
              className="w-full h-full text-sm outline-none text-gray-600"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-4" />
          </div>
        </div>

        {/* Active Integrations */}
        <div className="mb-10">
          <h2 className="text-[15px] font-bold text-gray-800 mb-4">Active Integration (2)</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-[11px] font-bold text-gray-400 tracking-wider">INTEGRATIONS</th>
                  <th className="px-4 md:px-6 py-3 text-left text-[11px] font-bold text-gray-400 tracking-wider">STATUS</th>
                  <th className="px-4 md:px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 md:px-6 py-4 flex items-center text-sm font-medium text-gray-700">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mr-3 text-xs">f</div>
                    Facebook
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-50 text-green-600 text-xs font-bold border border-green-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span> Active
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-right">
                    <Link href="/integrations/facebook" className="inline-block px-4 py-1.5 border border-[#4f46e5] text-[#4f46e5] rounded-full text-sm font-medium hover:bg-purple-50 transition-colors">
                      Manage
                    </Link>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 md:px-6 py-4 flex items-center text-sm font-medium text-gray-700">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center mr-3 text-xs">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                    </div>
                    Whatsapp
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-50 text-green-600 text-xs font-bold border border-green-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span> Active
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-right">
                    <button className="px-4 py-1.5 border border-[#4f46e5] text-[#4f46e5] rounded-full text-sm font-medium hover:bg-purple-50 transition-colors">
                      Manage
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Available Integrations */}
        <div>
          <h2 className="text-[15px] font-bold text-gray-800 mb-4">Available Integration (23)</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-[11px] font-bold text-gray-400 tracking-wider">INTEGRATIONS</th>
                  <th className="px-4 md:px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { name: "99acres", desc: "Capture 99acres Leads in your Telecrm account", icon: "🏢", color: "text-blue-500" },
                  { name: "CallerDesk", desc: "Integrate CallerDesk in your Telecrm account", icon: "📞", color: "text-red-500" },
                  { name: "Google Meet", desc: "Integrate google meet in your Telecrm Account", icon: "📹", color: "text-green-500" },
                  { name: "Google Sheets", desc: "Integrate Google Sheets with Telecrm", icon: "📊", color: "text-green-600" },
                  { name: "Sulekha", desc: "Capture Sulekha Leads in your Telecrm account", icon: "🟡", color: "text-yellow-500" },
                  { name: "Tata Tele", desc: "Integrate Tata Tele in your Telecrm Account", icon: "〰", color: "text-blue-600" },
                  { name: "TeleCMI", desc: "Integrate TeleCMI in your Telecrm Account", icon: "🔴", color: "text-red-600" },
                  { name: "Trade India", desc: "Integrate Trade India in your Telecrm Account", icon: "ti", color: "text-orange-600 font-bold" },
                  { name: "Website/API", desc: "Receive new leads from Website/API in your Telecrm account", icon: "🌐", color: "text-gray-600" },
                  { name: "Whatsapp Chat Widget", desc: "Receive new leads from WhatsApp chat widget into Telecrm account", icon: "💬", color: "text-green-500" },
                  { name: "Whatsapp Cloud API", desc: "Receive new leads from your Whatsapp Cloud API in your Telecrm account", icon: "☁", color: "text-green-500" },
                  { name: "WooCommerce", desc: "Integrate WooCommerce in your Telecrm account", icon: "W", color: "text-purple-600 font-serif font-bold" },
                  { name: "WordPress", desc: "Integrate WordPress in your Telecrm account", icon: "W", color: "text-gray-700 font-serif font-bold" },
                ].map(integration => (
                  <tr key={integration.name} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-3 flex items-center">
                      <div className={`w-8 h-8 flex items-center justify-center mr-3 text-lg ${integration.color}`}>
                        {integration.icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">{integration.name}</div>
                        <div className="text-[11px] text-gray-400">{integration.desc}</div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-right">
                      <button className="px-4 py-1.5 border border-[#4f46e5] text-[#4f46e5] rounded-full text-sm font-medium hover:bg-purple-50 transition-colors">
                        Activate now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
