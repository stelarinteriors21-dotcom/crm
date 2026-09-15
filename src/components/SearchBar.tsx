"use client";

import { Search, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";

export default function SearchBar({ placeholder = "Search lead" }: { placeholder?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialQuery = searchParams.get("query") || "";
  const initialSearchField = searchParams.get("searchField") || "all";
  const [query, setQuery] = useState(initialQuery);
  const [searchField, setSearchField] = useState(initialSearchField);
  
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("query", query);
      } else {
        params.delete("query");
      }
      
      if (searchField && searchField !== "all") {
        params.set("searchField", searchField);
      } else {
        params.delete("searchField");
      }
      
      router.push("?" + params.toString());
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query, searchField, router, searchParams]);

  // Sync state if URL changes externally
  useEffect(() => {
    setQuery(searchParams.get("query") || "");
    setSearchField(searchParams.get("searchField") || "all");
  }, [searchParams]);

  const handleFieldSelect = (field: string) => {
    setSearchField(field);
    setShowMenu(false);
  };

  return (
    <div className="flex-1 max-w-2xl relative flex items-center">
      <div 
        ref={menuRef}
        className="absolute left-1 flex items-center h-[90%] z-10"
      >
        <div 
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 h-full rounded cursor-pointer border-r border-gray-200 transition-colors"
        >
          <Search className="w-3.5 h-3.5 mr-1 text-gray-400" /> 
          <span className="text-xs font-medium w-10 truncate text-center leading-none mt-0.5">{searchField === 'all' ? 'All' : searchField === 'name' ? 'Name' : searchField === 'phone' ? 'Phone' : 'Email'}</span> 
          <ChevronDown className="w-3 h-3 ml-1 text-gray-400" />
        </div>
        
        {showMenu && (
          <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
            <div onClick={() => handleFieldSelect('all')} className="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer font-medium">All fields</div>
            <div onClick={() => handleFieldSelect('name')} className="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer font-medium">Name</div>
            <div onClick={() => handleFieldSelect('phone')} className="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer font-medium">Phone</div>
            <div onClick={() => handleFieldSelect('email')} className="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer font-medium">Email</div>
          </div>
        )}
      </div>
      
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchField === 'phone' ? "Search lead by phone" : searchField === 'name' ? "Search lead by name" : searchField === 'email' ? "Search lead by email" : placeholder} 
        className="w-full pl-[88px] pr-4 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#613cbc] focus:ring-1 focus:ring-[#613cbc] bg-gray-50/50 hover:bg-white transition-colors"
      />
    </div>
  );
}
