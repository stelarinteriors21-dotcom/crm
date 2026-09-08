import { Save, Plus, ArrowLeft, X, Calendar as CalendarIcon, Clock, Phone, FileText } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="h-full bg-white flex flex-col -m-6 relative overflow-hidden">
      
      {/* Top Header */}
      <div className="h-16 border-b border-gray-100 flex items-center px-6 shrink-0">
        <h1 className="text-[17px] font-bold text-gray-800 flex items-center">
          Reports <span className="ml-2 bg-purple-100 text-[#613cbc] text-xs px-2 py-0.5 rounded-full font-bold">ZUSH+1</span>
        </h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Graph & Metrics (Full Width) */}
        <div className="w-full border-r border-gray-100 p-6 flex flex-col overflow-y-auto bg-[#FDFDFD]">
          
          <div className="flex border-b border-gray-200 mb-6">
            <button className="flex-1 py-3 text-[13px] font-bold text-[#613cbc] border-b-[3px] border-[#613cbc]">DAY</button>
            <button className="flex-1 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">WEEK</button>
            <button className="flex-1 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">MONTH</button>
            <button className="flex-1 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">YEAR</button>
          </div>

          <div className="flex justify-end mb-6">
            <button className="border border-[#613cbc] text-[#613cbc] px-3 py-1 rounded-full text-xs font-bold flex items-center shadow-sm">
              Today <span className="ml-1 text-[10px]">▼</span>
            </button>
          </div>

          <div className="flex justify-center space-x-4 mb-12">
            <div className="bg-[#4d3691] text-white rounded-xl p-4 w-24 h-24 flex flex-col items-center justify-center shadow-md">
              <span className="text-[11px] font-bold tracking-wider mb-1">CALLS</span>
              <span className="text-3xl font-bold">0</span>
            </div>
            <div className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl p-4 w-24 h-24 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[11px] font-bold tracking-wider mb-1">TIME</span>
              <span className="text-2xl font-bold">0s</span>
            </div>
            <div className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl p-4 w-24 h-24 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[11px] font-bold tracking-wider mb-1">SALES</span>
              <span className="text-2xl font-bold">₹0</span>
            </div>
          </div>

          <div className="relative h-64 w-full pl-8 pb-8">
            {/* Graph Y Axis */}
            <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-gray-400 font-medium">
              <span>1</span><span>0.9</span><span>0.8</span><span>0.7</span><span>0.6</span>
              <span>0.5</span><span>0.4</span><span>0.3</span><span>0.2</span><span>0.1</span><span>0</span>
            </div>
            {/* Graph Grid */}
            <div className="w-full h-full border-l border-b border-gray-300 flex flex-col justify-between pt-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="w-full border-t border-gray-100 h-0"></div>
              ))}
            </div>
            {/* Graph X Axis */}
            <div className="absolute bottom-0 left-8 right-0 flex justify-between text-[9px] text-gray-400 font-medium transform -rotate-45 origin-top-left pt-2">
              <span>12 AM</span><span>02 AM</span><span>04 AM</span><span>06 AM</span><span>08 AM</span>
              <span>10 AM</span><span>12 PM</span><span>02 PM</span><span>04 PM</span><span>06 PM</span>
              <span>08 PM</span><span>10 PM</span>
            </div>
          </div>

          <div className="text-center mt-10 text-[13px] font-bold text-gray-600">
            03 Sep Calls Reports ( 0 Leads)
          </div>

        </div>

      </div>
    </div>
  );
}
