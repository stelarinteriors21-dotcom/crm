"use client"
import { Search, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function LeadsFilterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentQuery = searchParams.get('q') || '';
  const currentSearchField = searchParams.get('searchField') || 'all';
  const currentStatus = searchParams.get('status') || '';
  const currentAssignee = searchParams.get('assignee') || '';

  const currentDate = searchParams.get('date') || '';

  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  
  const [showSearchFieldMenu, setShowSearchFieldMenu] = useState(false);
  const searchFieldRef = useRef<HTMLDivElement>(null);

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);

  const [showDateMenu, setShowDateMenu] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchFieldRef.current && !searchFieldRef.current.contains(event.target as Node)) {
        setShowSearchFieldMenu(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
      if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) {
        setShowAssigneeMenu(false);
      }
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setShowDateMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (val: string) => {
    if (searchTimer) clearTimeout(searchTimer);
    const newTimer = setTimeout(() => {
      updateUrl('q', val);
    }, 500);
    setSearchTimer(newTimer);
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/leads?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 bg-gray-50/30">
      <div className="flex items-center flex-1 max-w-2xl bg-white border border-gray-200 rounded-md shadow-sm relative">
        <div 
          ref={searchFieldRef}
          onClick={() => setShowSearchFieldMenu(!showSearchFieldMenu)}
          className="flex items-center px-3 py-1.5 border-r border-gray-200 cursor-pointer relative"
        >
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-600 w-12 truncate">{currentSearchField === 'all' ? 'All' : currentSearchField === 'name' ? 'Name' : currentSearchField === 'phone' ? 'Phone' : 'Email'}</span>
          <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
          
          {showSearchFieldMenu && (
            <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
              <div 
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                onClick={() => updateUrl('searchField', 'all')}
              >All</div>
              <div 
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                onClick={() => updateUrl('searchField', 'name')}
              >Name</div>
              <div 
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                onClick={() => updateUrl('searchField', 'phone')}
              >Phone</div>
              <div 
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                onClick={() => updateUrl('searchField', 'email')}
              >Email</div>
            </div>
          )}
        </div>
        <input 
          type="text" 
          placeholder={currentSearchField === 'phone' ? "Search lead by phone" : currentSearchField === 'name' ? "Search lead by name" : "Search lead by name, phone, or email"} 
          defaultValue={currentQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 px-3 py-1.5 outline-none text-sm" 
        />
      </div>

      <div className="flex space-x-3 text-sm text-gray-600">
        <div className="relative" ref={assigneeRef}>
          <button 
            onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
            className={`flex items-center px-3 py-1.5 border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 ${currentAssignee ? 'bg-purple-50 text-[#4f46e5] border-purple-200' : 'bg-white'}`}
          >
            <span className="mr-2">👤</span> {currentAssignee ? `Assignee: ${currentAssignee}` : 'Assignee'} <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
          </button>
          
          {showAssigneeMenu && (
            <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-gray-200 shadow-lg rounded-md z-50 overflow-hidden">
              <button onClick={() => { updateUrl('assignee', ''); setShowAssigneeMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Any Assignee</button>
              <button onClick={() => { updateUrl('assignee', 'Zulvath'); setShowAssigneeMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Zulvath</button>
              <button onClick={() => { updateUrl('assignee', 'Unassigned'); setShowAssigneeMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Unassigned</button>
            </div>
          )}
        </div>
        
        <div className="relative" ref={statusRef}>
          <button 
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className={`flex items-center px-3 py-1.5 border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 ${currentStatus ? 'bg-purple-50 text-[#4f46e5] border-purple-200' : 'bg-white'}`}
          >
            {currentStatus ? `Status: ${currentStatus}` : 'Status'} <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
          </button>
          
          {showStatusMenu && (
            <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-gray-200 shadow-lg rounded-md z-50 overflow-hidden">
              <button onClick={() => { updateUrl('status', ''); setShowStatusMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">All Statuses</button>
              <button onClick={() => { updateUrl('status', 'NEW'); setShowStatusMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Interested / New</button>
              <button onClick={() => { updateUrl('status', 'CONTACTED'); setShowStatusMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Job Enquiries</button>
              <button onClick={() => { updateUrl('status', 'WARM'); setShowStatusMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">RNR / Warm</button>
              <button onClick={() => { updateUrl('status', 'CONVERTED'); setShowStatusMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Converted</button>
              <button onClick={() => { updateUrl('status', 'DEAD'); setShowStatusMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-red-600">Lost / Dead</button>
            </div>
          )}
        </div>

        <div className="relative" ref={dateRef}>
          <button 
            onClick={() => setShowDateMenu(!showDateMenu)}
            className={`flex items-center px-3 py-1.5 border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 ${currentDate ? 'bg-purple-50 text-[#4f46e5] border-purple-200' : 'bg-white'}`}
          >
            📅 {currentDate ? `Date: ${currentDate}` : 'Creation Date'} <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
          </button>
          
          {showDateMenu && (
            <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-gray-200 shadow-lg rounded-md z-50 overflow-hidden">
              <button onClick={() => { updateUrl('date', ''); setShowDateMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Any Date</button>
              <button onClick={() => { updateUrl('date', 'Today'); setShowDateMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Today</button>
              <button onClick={() => { updateUrl('date', 'Yesterday'); setShowDateMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Yesterday</button>
              <button onClick={() => { updateUrl('date', 'Last 7 Days'); setShowDateMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Last 7 Days</button>
              <button onClick={() => { updateUrl('date', 'This Month'); setShowDateMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">This Month</button>
            </div>
          )}
        </div>

        {/* Advanced Filters Button */}
        <button 
          onClick={() => setShowAdvancedFilters(true)}
          className="flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 text-[#4f46e5] font-medium"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
          Filters
        </button>
      </div>

      {/* Slide-out Custom Filter Sidebar */}
      {showAdvancedFilters && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setShowAdvancedFilters(false)}></div>
          
          {/* Drawer */}
          <div className="absolute right-0 top-0 bottom-0 w-[400px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">Custom filter</h2>
              <div className="flex items-center space-x-4">
                <button onClick={() => updateUrl('status', '')} className="text-sm font-medium text-gray-500 hover:text-gray-800">Clear All</button>
                <button onClick={() => setShowAdvancedFilters(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-2">
              
              <details className="group border-b border-gray-100" open>
                <summary className="flex items-center justify-between cursor-pointer px-4 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                  Creation Date
                  <ChevronDown className="w-4 h-4 text-gray-400 group-open:-rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 space-y-2">
                  <button onClick={() => updateUrl('date', 'Today')} className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-purple-50 hover:text-[#4f46e5] rounded">Today</button>
                  <button onClick={() => updateUrl('date', 'Yesterday')} className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-purple-50 hover:text-[#4f46e5] rounded">Yesterday</button>
                  <button onClick={() => updateUrl('date', 'This Month')} className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-purple-50 hover:text-[#4f46e5] rounded">This Month</button>
                  <div className="flex space-x-2 mt-2">
                    <input type="date" className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" />
                    <span className="text-gray-400 self-center">-</span>
                    <input type="date" className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" />
                  </div>
                </div>
              </details>

              <details className="group border-b border-gray-100">
                <summary className="flex items-center justify-between cursor-pointer px-4 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                  Status (Label)
                  <ChevronDown className="w-4 h-4 text-gray-400 group-open:-rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" onChange={() => updateUrl('status', 'NEW')} checked={currentStatus === 'NEW'} className="rounded text-[#4f46e5] border-gray-300" />
                    <span className="text-sm text-gray-600">Interested / New</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" onChange={() => updateUrl('status', 'CONTACTED')} checked={currentStatus === 'CONTACTED'} className="rounded text-[#4f46e5] border-gray-300" />
                    <span className="text-sm text-gray-600">Job Enquiries</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" onChange={() => updateUrl('status', 'DEAD')} checked={currentStatus === 'DEAD'} className="rounded text-[#4f46e5] border-gray-300" />
                    <span className="text-sm text-gray-600">Lost / Dead</span>
                  </label>
                </div>
              </details>

              <details className="group border-b border-gray-100">
                <summary className="flex items-center justify-between cursor-pointer px-4 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                  Last Update Date
                  <ChevronDown className="w-4 h-4 text-gray-400 group-open:-rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-500">Select last update date range...</div>
              </details>

              <details className="group border-b border-gray-100">
                <summary className="flex items-center justify-between cursor-pointer px-4 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                  Campaign
                  <ChevronDown className="w-4 h-4 text-gray-400 group-open:-rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-500">Select campaign / source...</div>
              </details>

              <details className="group border-b border-gray-100">
                <summary className="flex items-center justify-between cursor-pointer px-4 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                  Call Date
                  <ChevronDown className="w-4 h-4 text-gray-400 group-open:-rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-500">Select call date...</div>
              </details>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <button 
                onClick={() => setShowAdvancedFilters(false)}
                className="w-full bg-[#4f46e5] text-white py-2 rounded font-medium shadow hover:bg-purple-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
