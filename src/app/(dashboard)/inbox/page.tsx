import { Inbox as InboxIcon, Search, Check, MoreVertical } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="h-full flex max-w-[1400px] mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      
      {/* Left Pane - Chat List */}
      <div className="w-80 border-r border-gray-200 flex flex-col h-full bg-gray-50/50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-800 flex items-center mb-4">
            <InboxIcon className="w-5 h-5 mr-2 text-[#613cbc]" /> Unified Inbox
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input type="text" placeholder="Search messages..." className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#613cbc]" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${item === 1 ? 'bg-purple-50/50 border-l-4 border-l-[#613cbc]' : ''}`}>
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold text-gray-900 text-sm">Lead Name #{item}</h4>
                <span className="text-xs text-gray-500">10:4{item} AM</span>
              </div>
              <p className="text-sm text-gray-500 truncate">Yes, I am interested in the pricing plan you sent yesterday...</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane - Chat Window */}
      <div className="flex-1 flex flex-col h-full bg-white">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold mr-3">L</div>
            <div>
              <h3 className="font-bold text-gray-900">Lead Name #1</h3>
              <p className="text-xs text-green-500 font-medium">WhatsApp - Online</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 p-2"><MoreVertical className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30">
          <div className="flex flex-col space-y-4">
            <div className="self-end bg-purple-100 text-purple-900 p-3 rounded-xl max-w-md rounded-br-none border border-purple-200">
              <p className="text-sm">Hi! Are you still looking for CRM software?</p>
              <span className="text-[10px] text-purple-400 mt-1 block text-right flex items-center justify-end">09:30 AM <Check className="w-3 h-3 ml-1" /></span>
            </div>
            <div className="self-start bg-white border border-gray-200 text-gray-800 p-3 rounded-xl max-w-md rounded-bl-none shadow-sm">
              <p className="text-sm">Yes, I am interested in the pricing plan you sent yesterday. Can we jump on a call?</p>
              <span className="text-[10px] text-gray-400 mt-1 block">10:41 AM</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex space-x-2">
            <input type="text" placeholder="Type a message..." className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#613cbc]" />
            <button className="bg-[#613cbc] text-white px-4 md:px-6 py-2 rounded-lg font-medium hover:bg-purple-700">Send</button>
          </div>
        </div>
      </div>

    </div>
  );
}
