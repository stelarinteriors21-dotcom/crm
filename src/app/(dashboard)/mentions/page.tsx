import { AtSign, MessageCircle } from "lucide-react";

export default function MentionsPage() {
  return (
    <div className="h-full flex flex-col max-w-[800px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <AtSign className="w-6 h-6 mr-3 text-[#613cbc]" /> Team Mentions
          </h1>
          <p className="text-gray-500 mt-1">Track when teammates tag you in lead notes.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center text-center h-[400px]">
        <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6">
          <MessageCircle className="w-10 h-10 text-purple-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">You're all caught up!</h3>
        <p className="text-gray-500 text-sm max-w-sm">No one has mentioned you in any lead comments recently. When they do, it will appear right here.</p>
      </div>
    </div>
  );
}
