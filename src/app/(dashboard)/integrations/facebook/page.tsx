import { ChevronLeft, ChevronRight, Search, ExternalLink, MoreVertical, Calendar, Users, Clock } from "lucide-react";
import Link from "next/link";

export default function IntegrationDetailsPage() {
  return (
    <div className="h-full bg-white flex flex-col overflow-y-auto">
      
      {/* Top Header */}
      <div className="h-[60px] border-b border-gray-100 flex items-center px-4 md:px-6 shrink-0">
        <Link href="/integrations" className="text-sm font-semibold text-gray-500 hover:text-gray-800 flex items-center">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Integrations
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Linked Accounts */}
        <div className="w-[300px] bg-white border-r border-gray-100 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[13px] font-bold text-gray-400 border-b-2 border-[#4f46e5] pb-1">Linked Account</h3>
            <button className="bg-[#4d3691] text-white px-3 py-1 rounded text-xs font-medium hover:bg-purple-900 transition-colors">
              + Add New
            </button>
          </div>

          <button className="w-full bg-[#4d3691] text-white py-2.5 rounded-md text-sm font-medium mb-4 hover:bg-purple-900 transition-colors">
            Download Marketing Report
          </button>

          <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-between cursor-pointer border border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 mr-3 shrink-0">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#4f46e5]">Arunraj RA</h4>
                <p className="text-[11px] text-gray-500">Integrated with:</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white p-6 overflow-y-auto">
          
          <div className="max-w-4xl">
            {/* Meta Webhook Setup Guide */}
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-5 mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center">
                <svg className="w-5 h-5 text-[#1877F2] mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Connect Meta (Facebook / Instagram) Lead Ads
              </h2>
              <p className="text-xs text-gray-600 mb-4">
                Follow these steps in your <strong className="text-gray-800">Meta App Dashboard</strong> to automatically sync instant leads into your Stelar CRM:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono mb-4">
                <div className="bg-white p-3 rounded-lg border border-purple-200">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Callback URL</span>
                  <span className="font-bold text-[#4f46e5] select-all">https://telecrm-clone.vercel.app/api/webhooks/meta</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-purple-200">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Verify Token</span>
                  <span className="font-bold text-gray-800 select-all">telecrm_meta_secure_token_2026</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-gray-700 font-medium">
                <div>1. Go to <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-[#4f46e5] font-bold underline">developers.facebook.com</a> &gt; Select your App &gt; <strong>Webhooks</strong>.</div>
                <div>2. Select <strong>Page</strong> object and click <strong>Subscribe to this object</strong>.</div>
                <div>3. Paste the <strong>Callback URL</strong> and <strong>Verify Token</strong> above.</div>
                <div>4. Subscribe to the <strong>leadgen</strong> event field.</div>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex justify-end mb-4">
              <div className="bg-gray-50 p-1 rounded-full border border-gray-200 flex text-xs font-bold">
                <button className="px-4 py-1 bg-white rounded-full text-gray-800 shadow-sm border border-gray-100">Card</button>
                <button className="px-4 py-1 text-gray-400 hover:text-gray-600">Stats</button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search with page and form name" 
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4f46e5] bg-gray-50"
              />
            </div>
            
            <p className="text-xs text-gray-400 mb-4 font-medium">2 Forms found</p>

            {/* Forms List */}
            <div className="space-y-4">
              
              {/* Form 1 */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-[#4d3691]">STELAR FORM 2K26</h3>
                  <p className="text-sm text-gray-500 mb-3">Stelar Interiors</p>
                  
                  <div className="flex space-x-4 text-[11px] text-gray-500 font-medium">
                    <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> 17d</span>
                    <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1" /> 14</span>
                    <span className="flex items-center text-gray-400">Last lead: <Clock className="w-3.5 h-3.5 mx-1" /> <span className="bg-gray-100 px-1 py-0.5 rounded text-gray-600">5d</span></span>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <button className="text-gray-400 hover:text-gray-700 mb-1 absolute right-6">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-[#4d3691] text-white flex items-center justify-center hover:bg-purple-900 shadow-md">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-bold text-[#4d3691] mt-1">View Leads</span>
                </div>
              </div>

              {/* Form 2 */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-[#4d3691]">STELAR NEW UPGRADE-copy</h3>
                  <p className="text-sm text-gray-500 mb-3">Stelar Interiors</p>
                  
                  <div className="flex space-x-4 text-[11px] text-gray-500 font-medium">
                    <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> 3M</span>
                    <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1" /> 152</span>
                    <span className="flex items-center text-gray-400">Last lead: <Clock className="w-3.5 h-3.5 mx-1" /> <span className="bg-gray-100 px-1 py-0.5 rounded text-gray-600">9d</span></span>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <button className="text-gray-400 hover:text-gray-700 mb-1 absolute right-6">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-[#4d3691] text-white flex items-center justify-center hover:bg-purple-900 shadow-md">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-bold text-[#4d3691] mt-1">View Leads</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
