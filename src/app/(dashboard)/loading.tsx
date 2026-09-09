export default function Loading() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#F8F9FA]">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-[#613cbc]/20 border-t-[#613cbc] rounded-full animate-spin"></div>
        <div className="text-gray-400 font-medium mt-4 text-sm">Loading...</div>
      </div>
    </div>
  );
}
