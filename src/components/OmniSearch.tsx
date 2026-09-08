"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OmniSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/search?q=" + encodeURIComponent(query));
        const data = await res.json();
        setResults(data.leads || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(true)}
        className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg px-3 py-1.5 cursor-text w-48 md:w-64 transition-colors"
      >
        <Search className="w-4 h-4 mr-2" />
        <span className="text-xs flex-1 text-left">Search...</span>
        <span className="text-[10px] border border-gray-300 rounded px-1.5 py-0.5">Ctrl K</span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full md:w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input 
              autoFocus
              type="text" 
              className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
              placeholder="Search leads by name, phone..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <X 
                className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" 
                onClick={() => { setQuery(''); setResults([]); }}
              />
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {loading && <div className="p-4 text-center text-xs text-gray-400">Searching...</div>}
            
            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-400">No results found for &quot;{query}&quot;</div>
            )}

            {!loading && results.length > 0 && (
              <div className="p-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">Leads</div>
                {results.map(lead => (
                  <button 
                    key={lead.id}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                      router.push('/leads/' + lead.id);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-purple-50 rounded-lg flex flex-col transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-800">{lead.name}</span>
                    <span className="text-[11px] text-gray-500">{lead.phone || 'No phone'} | {lead.status || 'Fresh'}</span>
                  </button>
                ))}
              </div>
            )}

            {!query && (
              <div className="p-4 text-center text-xs text-gray-400">Start typing to search...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
