import { Sparkles, PlayCircle, RefreshCw, Clock } from "lucide-react";

export default function CallIQPage() {
  return (
    <div className="h-full bg-white p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Sparkles className="w-6 h-6 mr-3 text-[#4d3691] fill-current" />
              Call-IQ <span className="ml-2 text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">BETA</span> <RefreshCw className="w-4 h-4 ml-2 text-gray-400 cursor-pointer hover:text-gray-600" />
            </h1>
            <p className="text-sm text-gray-500 mt-1 pl-9">
              Your intelligent assistants <span className="text-[#613cbc] border-b border-purple-200 cursor-pointer ml-1">Learn More</span>
            </p>
          </div>
          <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            + Create New
          </button>
        </div>

        {/* Video Thumbnail */}
        <div className="max-w-[800px] mx-auto rounded-3xl overflow-hidden shadow-2xl relative cursor-pointer group border border-gray-200 bg-gradient-to-br from-indigo-900 to-purple-900">
          {/* Simulated Youtube Thumbnail Background */}
          <div className="aspect-video relative">
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="text-white text-center z-10 w-full px-12 flex items-center justify-between">
                  <div className="text-left max-w-sm">
                     <h2 className="text-7xl font-bold text-yellow-400 leading-none tracking-tighter">AI</h2>
                     <h3 className="text-4xl font-bold text-white mb-2">Is Now in</h3>
                     <div className="bg-white text-indigo-900 px-4 py-1 rounded inline-flex items-center text-3xl font-bold tracking-tight">
                        <span className="w-6 h-6 bg-indigo-900 text-white rounded-sm flex items-center justify-center text-xs mr-2">T</span>
                        telecrm
                     </div>
                  </div>
                  
                  <div className="w-64 h-80 bg-cover bg-center bg-no-repeat relative">
                    {/* Simulated person image placeholder */}
                    <div className="absolute bottom-0 w-64 h-64 bg-indigo-950 rounded-t-full border-4 border-indigo-800 flex items-center justify-center overflow-hidden">
                       <div className="w-40 h-40 bg-indigo-800 rounded-full mb-10"></div>
                    </div>
                  </div>
               </div>
            </div>
            
            {/* YouTube Play Button */}
            <div className="absolute inset-0 flex items-center justify-center z-20">
               <div className="w-16 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:bg-red-700 transition-colors">
                  <div className="w-0 h-0 border-t-8 border-b-8 border-l-[14px] border-t-transparent border-b-transparent border-l-white ml-1"></div>
               </div>
            </div>

            {/* Thumbnail Header Text Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-20 flex items-start">
               <div className="w-8 h-8 rounded-full bg-purple-900 flex items-center justify-center mr-3 text-white font-bold text-xs">T</div>
               <div>
                 <div className="text-white font-bold text-sm">telecrm is Now AI Enabled - Introducing AI Agent for Call Audits | telecrm Feature Update</div>
                 <div className="text-gray-300 text-xs">telecrm</div>
               </div>
            </div>

            {/* Thumbnail Footer Text Overlay */}
            <div className="absolute bottom-4 left-4 flex space-x-3 z-20">
               <div className="w-8 h-8 rounded bg-black/50 flex items-center justify-center text-white"><span className="text-xl">⤤</span></div>
               <div className="w-8 h-8 rounded bg-black/50 flex items-center justify-center text-white"><Clock className="w-5 h-5" /></div>
            </div>

            <div className="absolute bottom-4 right-4 z-20">
               <div className="bg-black/60 text-white px-3 py-1.5 rounded flex items-center text-sm font-semibold backdrop-blur-sm">
                  Watch on <span className="font-bold ml-1 flex items-center"><PlayCircle className="w-4 h-4 text-red-500 mx-1" /> YouTube</span>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}


