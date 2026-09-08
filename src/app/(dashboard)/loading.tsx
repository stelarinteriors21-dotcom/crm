export default function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50/50 min-h-screen">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-[#613cbc] rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-gray-500 animate-pulse">Loading data...</p>
      </div>
    </div>
  );
}
