"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCallers } from "@/app/actions/leadActions";

export default function LeadsFilterDropdowns({ customTags = [], uniqueCities = [] }: { customTags?: any[], uniqueCities?: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initialStatus = searchParams.get("status");
  const initialCity = searchParams.get("city");
  
  const [selectedCity, setSelectedCity] = useState<string[]>(
    initialCity ? initialCity.split(",") : []
  );

  const [selectedStatus, setSelectedStatus] = useState<string[]>(
    initialStatus ? initialStatus.split(",") : []
  );
  
  const initialStartDate = searchParams.get("startDate") || "";
  const initialEndDate = searchParams.get("endDate") || "";
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);

  const initialAssignee = searchParams.get("assigned") || "";
  const [selectedAssignee, setSelectedAssignee] = useState<string>(initialAssignee);

  const initialTag = searchParams.get("tag") || "All";
  const [selectedTag, setSelectedTag] = useState<string>(initialTag);
  
  const [callers, setCallers] = useState<any[]>([]);

  const STATUS_OPTIONS = [
    "Fresh", "RNR", "Job enquiry", "Contacted", "interested",
    "just curious", "follow up", "Junk", "Whatsapp Chat", "Hot",
    "Hold", "Site visit Schedules", "Site visit Recheduled", "Site visit done",
    "Quotation shared", "Estimated Quotation", "final Quotation",
    "Advance recieved", "Pay Pending", "Won", "Lost"
  ];

  const TAG_OPTIONS = ["All", ...customTags.map((t: any) => t.name)];

  useEffect(() => {
    async function fetchCallers() {
      const data = await getCallers();
      setCallers(data);
    }
    fetchCallers();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAssigneeOpen(false); setCityMenuOpen(false);
        setTagMenuOpen(false); setCityMenuOpen(false);
        setStatusMenuOpen(false); setCityMenuOpen(false);
        setDateMenuOpen(false); setCityMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateURL = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "All Time" && value !== "all" && value !== "All") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?` + params.toString());
  };

  const applyDateRange = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (startDate) params.set("startDate", startDate);
    else params.delete("startDate");

    if (endDate) params.set("endDate", endDate);
    else params.delete("endDate");
    
    router.push(`?` + params.toString());
    setDateMenuOpen(false); setCityMenuOpen(false);
  };

  const clearDateRange = () => {
    setStartDate("");
    setEndDate("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("startDate");
    params.delete("endDate");
    router.push(`?` + params.toString());
    setDateMenuOpen(false); setCityMenuOpen(false);
  };

  const toggleStatus = (s: string) => {
    setSelectedStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const applyStatus = () => {
    updateURL("status", selectedStatus.length > 0 ? selectedStatus.join(",") : "");
    setStatusMenuOpen(false); setCityMenuOpen(false);
  };

  const clearStatus = () => {
    setSelectedStatus([]);
    updateURL("status", "");
    setStatusMenuOpen(false); setCityMenuOpen(false);
  };

  const toggleCity = (c: string) => {
    setSelectedCity(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const applyCity = () => {
    updateURL("city", selectedCity.length > 0 ? selectedCity.join(",") : "");
    setCityMenuOpen(false);
  };

  const clearCity = () => {
    setSelectedCity([]);
    updateURL("city", "");
    setCityMenuOpen(false);
  };

  const handleAssigneeChange = (id: string) => {
    setSelectedAssignee(id);
    updateURL("assigned", id);
    setAssigneeOpen(false); setCityMenuOpen(false);
  };

  const handleTagChange = (tag: string) => {
    setSelectedTag(tag);
    updateURL("tag", tag);
    setTagMenuOpen(false); setCityMenuOpen(false);
  };

  return (
    <div className="flex space-x-2" ref={dropdownRef}>
      {/* Assignee Filter */}
      <div className="relative">
        <button 
          onClick={() => {
            setAssigneeOpen(!assigneeOpen);
            setTagMenuOpen(false); setCityMenuOpen(false);
            setStatusMenuOpen(false); setCityMenuOpen(false);
            setDateMenuOpen(false); setCityMenuOpen(false);
          }}
          className={`flex items-center text-xs font-medium border rounded px-3 py-1.5 transition-colors ${
            selectedAssignee ? 'bg-purple-50 text-[#4f46e5] border-purple-200' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Assignee {selectedAssignee && selectedAssignee !== "all" && "(1)"} <ChevronDown className="w-3 h-3 ml-2" />
        </button>
        
        {assigneeOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <span className="text-sm font-semibold text-gray-700">Assignees</span>
              <span className="text-xs text-[#4f46e5] cursor-pointer" onClick={() => handleAssigneeChange("all")}>Clear All</span>
            </div>
            <div className="p-2 overflow-y-auto max-h-72">
              <label className="flex items-center text-[13px] text-gray-700 cursor-pointer hover:bg-gray-50 px-2 py-2 rounded mb-1">
                <input 
                  type="radio" 
                  name="assignee"
                  checked={!selectedAssignee || selectedAssignee === "all"}
                  onChange={() => handleAssigneeChange("all")}
                  className="w-3.5 h-3.5 mr-3 border-gray-300 rounded text-[#4f46e5] focus:ring-[#4f46e5]" 
                /> 
                <span className="font-medium">Anyone</span>
              </label>
              {callers.map(caller => (
                <label key={caller.id} className="flex items-center text-[13px] text-gray-700 cursor-pointer hover:bg-gray-50 px-2 py-2 rounded mb-1">
                  <input 
                    type="radio" 
                    name="assignee"
                    checked={selectedAssignee === caller.id}
                    onChange={() => handleAssigneeChange(caller.id)}
                    className="w-3.5 h-3.5 mr-3 border-gray-300 rounded text-[#4f46e5] focus:ring-[#4f46e5]" 
                  /> 
                  <span className="font-medium">{caller.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tag Filter */}
      <div className="relative">
        <button 
          onClick={() => {
            setTagMenuOpen(!tagMenuOpen);
            setAssigneeOpen(false); setCityMenuOpen(false);
            setStatusMenuOpen(false); setCityMenuOpen(false);
            setDateMenuOpen(false); setCityMenuOpen(false);
          }}
          className={`flex items-center text-xs font-medium border rounded px-3 py-1.5 transition-colors ${
            selectedTag && selectedTag !== "All" ? 'bg-purple-50 text-[#4f46e5] border-purple-200' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Tag {selectedTag && selectedTag !== "All" && "(1)"} <ChevronDown className="w-3 h-3 ml-2" />
        </button>
        
        {tagMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <span className="text-sm font-semibold text-gray-700">Tags</span>
              <span className="text-xs text-[#4f46e5] cursor-pointer" onClick={() => handleTagChange("All")}>Clear All</span>
            </div>
            <div className="p-2 overflow-y-auto max-h-72">
              {TAG_OPTIONS.map(tagOption => {
                const tagColor = customTags.find((t: any) => t.name === tagOption)?.color;
                return (
                  <label key={tagOption} className="flex items-center text-[13px] text-gray-700 cursor-pointer hover:bg-gray-50 px-2 py-2 rounded mb-1">
                    <input 
                      type="radio" 
                      name="tag"
                      value={tagOption}
                      checked={selectedTag === tagOption}
                      onChange={() => handleTagChange(tagOption)}
                      className="w-3.5 h-3.5 mr-3 border-gray-300 text-[#4f46e5] focus:ring-[#4f46e5]" 
                    /> 
                    {tagColor && <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: tagColor }} />}
                    <span className="font-medium">{tagOption === "All" ? "All Tags" : tagOption}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Status Filter */}
      <div className="relative">
        <button 
          onClick={() => {
            setStatusMenuOpen(!statusMenuOpen);
            setAssigneeOpen(false); setCityMenuOpen(false);
            setTagMenuOpen(false); setCityMenuOpen(false);
            setDateMenuOpen(false); setCityMenuOpen(false);
          }}
          className={`flex items-center text-xs font-medium border rounded px-3 py-1.5 transition-colors ${
            selectedStatus.length > 0 
              ? 'bg-purple-50 text-[#4f46e5] border-purple-200' 
              : 'text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Status {selectedStatus.length > 0 && `(${selectedStatus.length})`} <ChevronDown className="w-3 h-3 ml-2" />
        </button>
        {statusMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <span className="text-sm font-semibold text-gray-700">Select Status</span>
              <span className="text-xs text-[#4f46e5] cursor-pointer" onClick={clearStatus}>Clear</span>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto space-y-1">
              {STATUS_OPTIONS.map(s => (
                <label key={s} className="flex items-center text-[13px] text-gray-700 cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded">
                  <input 
                    type="checkbox" 
                    checked={selectedStatus.includes(s)}
                    onChange={() => toggleStatus(s)}
                    className="w-3.5 h-3.5 mr-3 border-gray-300 rounded text-[#4f46e5] focus:ring-[#4f46e5]" 
                  /> 
                  {s}
                </label>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100">
              <button onClick={applyStatus} className="w-full bg-[#4f46e5] hover:bg-purple-800 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* City Filter */}
      <div className="relative">
        <button 
          onClick={() => {
            setCityMenuOpen(!cityMenuOpen);
            setAssigneeOpen(false);
            setTagMenuOpen(false);
            setStatusMenuOpen(false);
            setDateMenuOpen(false);
          }}
          className={`flex items-center text-xs font-medium border rounded px-3 py-1.5 transition-colors ${
            selectedCity.length > 0 
              ? 'bg-purple-50 text-[#4f46e5] border-purple-200' 
              : 'text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          City {selectedCity.length > 0 && `(${selectedCity.length})`} <ChevronDown className="w-3 h-3 ml-2" />
        </button>
        {cityMenuOpen && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <span className="text-sm font-semibold text-gray-700">Select City</span>
              <span className="text-xs text-[#4f46e5] cursor-pointer" onClick={clearCity}>Clear</span>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto space-y-1">
              {uniqueCities.length === 0 && (
                <div className="text-xs text-gray-500 p-2 text-center">No cities found</div>
              )}
              {uniqueCities.map(c => (
                <label key={c} className="flex items-center text-[13px] text-gray-700 cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded">
                  <input 
                    type="checkbox" 
                    checked={selectedCity.includes(c)}
                    onChange={() => toggleCity(c)}
                    className="w-3.5 h-3.5 mr-3 border-gray-300 rounded text-[#4f46e5] focus:ring-[#4f46e5]" 
                  /> 
                  {c}
                </label>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100">
              <button onClick={applyCity} className="w-full bg-[#4f46e5] hover:bg-purple-800 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Creation Date Filter */}
      <div className="relative">
        <button 
          onClick={() => {
            setDateMenuOpen(!dateMenuOpen);
            setAssigneeOpen(false); setCityMenuOpen(false);
            setTagMenuOpen(false); setCityMenuOpen(false);
            setStatusMenuOpen(false); setCityMenuOpen(false);
          }}
          className={`flex items-center text-xs font-medium border rounded px-3 py-1.5 transition-colors ${
            (startDate || endDate)
              ? 'bg-purple-50 text-[#4f46e5] border-purple-200' 
              : 'text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Creation Date <ChevronDown className="w-3 h-3 ml-2" />
        </button>
        {dateMenuOpen && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <span className="text-sm font-semibold text-gray-700">Date Range</span>
              <span className="text-xs text-[#4f46e5] cursor-pointer" onClick={clearDateRange}>Clear</span>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Start Date</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-[#4f46e5] text-gray-700"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">End Date</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-[#4f46e5] text-gray-700"
                />
              </div>
            </div>
            <div className="p-3 border-t border-gray-100">
              <button onClick={applyDateRange} className="w-full bg-[#4f46e5] hover:bg-purple-800 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                Apply Date Filter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
