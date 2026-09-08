"use client";

import { Search, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function SearchBar({ placeholder = "Search lead" }: { placeholder?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialQuery = searchParams.get("query") || "";
  const [query, setQuery] = useState(initialQuery);

  // Debounce logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("query", query);
      } else {
        params.delete("query");
      }
      
      router.push("?" + params.toString());
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query, router, searchParams]);

  // Sync state if URL changes externally
  useEffect(() => {
    setQuery(searchParams.get("query") || "");
  }, [searchParams]);

  return (
    <div className="flex-1 max-w-2xl relative flex items-center">
      <div className="absolute left-3 text-gray-400 flex items-center text-xs font-medium border-r border-gray-200 pr-2">
        <Search className="w-3.5 h-3.5 mr-1" /> Name <ChevronDown className="w-3 h-3 ml-1" />
      </div>
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder} 
        className="w-full pl-28 pr-4 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#613cbc] bg-gray-50/50"
      />
    </div>
  );
}
