import { Search as SearchIcon } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string };
}) {
  const query = searchParams.q || "";
  const type = searchParams.type || "Auto";

  let results: any[] = [];

  if (query.length > 2) {
    results = await prisma.lead.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 20
    });
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Search leads</h1>
        
        <form className="max-w-3xl">
          <div className="relative flex items-center w-full mb-3">
            <input 
              type="text" 
              name="q"
              defaultValue={query}
              placeholder="Search for a lead's name, phone or other details" 
              className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-lg outline-none focus:border-[#613cbc] focus:ring-1 focus:ring-[#613cbc] text-sm"
              autoFocus
            />
            <button type="submit" className="absolute right-3 text-gray-400 hover:text-[#613cbc]">
              <SearchIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex space-x-2">
            {['Auto', 'Phone', 'Text', 'Email'].map((filter) => (
              <label key={filter} className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border ${
                type === filter ? 'bg-[#613cbc] text-white border-[#613cbc]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
                <input type="radio" name="type" value={filter} className="hidden" defaultChecked={type === filter} onChange={(e) => e.target.form?.submit()} />
                {filter}
              </label>
            ))}
          </div>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {query.length === 0 ? (
          <div className="text-sm text-gray-500">Enter search value to see results here</div>
        ) : results.length === 0 ? (
          <div className="text-sm text-gray-500">No leads found matching "{query}"</div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {results.map(lead => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="block bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:border-[#613cbc] transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{lead.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{lead.phone} • {lead.email || 'No email'}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800">
                    {lead.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
