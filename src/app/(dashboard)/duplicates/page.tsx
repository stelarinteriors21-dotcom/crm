import { Phone, Mail, ChevronRight } from "lucide-react";

export default function DuplicatesPage() {
  const duplicates = [
    { phone: "917905030534", count: 2 },
    { phone: "918099474789", count: 2 },
    { phone: "919846833056", count: 2 },
    { phone: "919136383880", count: 2 },
    { phone: "917736326600", count: 2 },
    { phone: "918928814237", count: 2 },
    { phone: "918156869303", count: 2 },
    { phone: "917411567513", count: 2 },
  ];

  return (
    <div className="h-full bg-[#F8F9FA] flex flex-col -m-3 md:-m-6 relative overflow-hidden">
      
      {/* Top Header */}
      <div className="h-16 bg-white border-b border-gray-100 flex items-center px-4 md:px-6 shrink-0 z-10">
        <h1 className="text-[17px] font-medium text-gray-600 flex items-center">
          All Duplicates
        </h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Duplicate List */}
        <div className="w-[380px] bg-white border-r border-gray-100 flex flex-col overflow-hidden shadow-sm z-10">
          
          {/* Tabs */}
          <div className="flex px-4 pt-4 border-b border-gray-100 shrink-0">
            <button className="flex-1 pb-3 text-sm font-bold text-[#4d3691] border-b-2 border-[#4d3691] flex items-center justify-center">
              <Phone className="w-4 h-4 mr-2" /> Phone
            </button>
            <button className="flex-1 pb-3 text-sm font-medium text-gray-500 flex items-center justify-center hover:text-gray-700 transition-colors">
              <Mail className="w-4 h-4 mr-2" /> Email
            </button>
          </div>

          {/* Merge Header */}
          <div className="flex justify-between items-center p-4 bg-purple-50/50 border-b border-gray-100 shrink-0">
            <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 mr-3 border-gray-300 rounded text-[#4d3691] focus:ring-[#4d3691]" />
              <div>
                <div>Select all</div>
                <div className="text-[10px] text-gray-400 font-normal -mt-0.5">(0 / 9) Selected</div>
              </div>
            </label>
            <button className="bg-[#b8a6eb] text-white px-4 py-1.5 rounded text-sm font-medium opacity-80 cursor-not-allowed shadow-sm">
              Merge (0)
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto bg-white p-2 space-y-1">
            {duplicates.map((dup, i) => (
              <label key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors">
                <div className="flex items-center">
                  <input type="checkbox" className="w-4 h-4 mr-4 border-gray-300 rounded text-[#4d3691] focus:ring-[#4d3691]" />
                  <div>
                    <div className="text-[15px] font-bold text-[#4d3691]">{dup.phone}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{dup.count} Leads</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500" />
              </label>
            ))}
          </div>

        </div>

        {/* Right Panel: Detail View (Empty in screenshot) */}
        <div className="flex-1 bg-[#FDFDFD] flex items-center justify-center text-gray-400">
          {/* Main area empty */}
        </div>

      </div>
    </div>
  );
}
