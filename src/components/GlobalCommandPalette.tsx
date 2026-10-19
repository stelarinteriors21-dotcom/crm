"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, X, User, Phone, MapPin, Briefcase, 
  LayoutDashboard, Users, PhoneCall, BarChart3, 
  Settings, ArrowRight, CornerDownLeft, 
  Loader2, Sparkles, Shield
} from "lucide-react";

interface SearchLead {
  id: string;
  name: string;
  phone?: string | null;
  status?: string | null;
  city?: string | null;
}

interface SearchTeam {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface NavItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  group: "Workspace" | "Operations" | "Config";
  icon: React.ElementType;
  adminOnly?: boolean;
  callerOnly?: boolean;
  visitorOnly?: boolean;
}

const STATIC_NAV_ITEMS: NavItem[] = [
  // Workspace
  { id: "nav-leads", title: "Leads", subtitle: "All CRM leads, pipelines & views", href: "/leads", group: "Workspace", icon: Users },
  { id: "nav-dashboard", title: "Daily Workdesk", subtitle: "Daily dashboard & call targets", href: "/dashboard", group: "Workspace", icon: LayoutDashboard },
  { id: "nav-calls", title: "Calls", subtitle: "Call logs and recent telephony history", href: "/calls", group: "Workspace", icon: PhoneCall, callerOnly: true },
  // Operations
  { id: "nav-site-visits", title: "Site Visits", subtitle: "Scheduled visits & field appointments", href: "/site-visits", group: "Operations", icon: MapPin },
  { id: "nav-team", title: "Team", subtitle: "Manage users, callers & permissions", href: "/team", group: "Operations", icon: Briefcase, adminOnly: true },
  { id: "nav-analytics", title: "Analytics", subtitle: "Call performance & agent leaderboards", href: "/analytics", group: "Operations", icon: BarChart3, adminOnly: true },
  // Config
  { id: "nav-settings", title: "Settings", subtitle: "Tags, custom fields & organization", href: "/settings", group: "Config", icon: Settings, adminOnly: true },
];

interface GlobalCommandPaletteProps {
  isAdmin?: boolean;
  userRole?: string;
}

export default function GlobalCommandPalette({ isAdmin = false, userRole = "" }: GlobalCommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState<SearchLead[]>([]);
  const [team, setTeam] = useState<SearchTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isSiteVisitor = userRole === "SITE_VISITOR";

  // Filter allowed navigation items strictly according to user permissions
  const allowedNavItems = React.useMemo(() => {
    return STATIC_NAV_ITEMS.filter((item) => {
      // 1. Admin/Root only pages: Team, Analytics, Settings
      if (item.adminOnly && !isAdmin) return false;

      // 2. Site Visits: Only visible to Admins or Site Visitors (not callers)
      if (item.id === "nav-site-visits" && !isAdmin && !isSiteVisitor) return false;

      // 3. Calls: Not for Site Visitors (callers and admins can access)
      if (item.id === "nav-calls" && isSiteVisitor) return false;

      // 4. Leads: Not for Site Visitors
      if (item.id === "nav-leads" && isSiteVisitor) return false;

      return true;
    });
  }, [isAdmin, isSiteVisitor]);

  // Listen for Cmd+K / Ctrl+K and custom trigger events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, [isOpen]);

  // Focus input on open & reset state
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setLeads([]);
      setTeam([]);
      setLoading(false);
    }
  }, [isOpen]);

  // Search API fetch with 150ms debounce for lightning 0.2s search
  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) {
      setLeads([]);
      setTeam([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json();
          setLeads(data.leads || []);
          setTeam(data.team || []);
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Matching quick navigation routes for fuzzy search
  const filteredNavItems = React.useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return allowedNavItems;
    return allowedNavItems.filter(
      (item) =>
        item.title.toLowerCase().includes(clean) ||
        item.subtitle.toLowerCase().includes(clean) ||
        item.group.toLowerCase().includes(clean)
    );
  }, [query, allowedNavItems]);

  // Total selectable items flattened for keyboard navigation
  const selectableItems = React.useMemo(() => {
    const list: Array<{ type: "nav" | "lead" | "team"; data: any }> = [];

    // Prioritize Leads if query is present
    leads.forEach((l) => list.push({ type: "lead", data: l }));
    if (isAdmin) {
      team.forEach((t) => list.push({ type: "team", data: t }));
    }
    filteredNavItems.forEach((n) => list.push({ type: "nav", data: n }));

    return list;
  }, [leads, team, filteredNavItems, isAdmin]);

  // Ensure selectedIndex stays in range
  useEffect(() => {
    if (selectedIndex >= selectableItems.length) {
      setSelectedIndex(Math.max(0, selectableItems.length - 1));
    }
  }, [selectableItems.length, selectedIndex]);

  const handleSelect = useCallback(
    (item: { type: "nav" | "lead" | "team"; data: any }) => {
      setIsOpen(false);
      if (item.type === "nav") {
        router.push(item.data.href);
      } else if (item.type === "lead") {
        router.push(`/leads/${item.data.id}`);
      } else if (item.type === "team") {
        router.push(`/team`);
      }
    },
    [router]
  );

  // Arrow key navigation inside modal
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, selectableItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + selectableItems.length) % Math.max(1, selectableItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectableItems[selectedIndex]) {
        handleSelect(selectableItems[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] overflow-y-auto">
      {/* Backdrop */}
      <div 
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150" 
      />

      <div className="min-h-full flex items-start justify-center pt-[10vh] md:pt-[14vh] px-4 pb-8">
        {/* Spotlight Modal Box */}
        <div 
          className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input Bar */}
          <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
            <Search className="w-5 h-5 text-gray-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={isAdmin ? "Search leads, phone numbers, team, or jump to page..." : "Search leads, phone numbers, or jump to page..."}
              className="flex-1 bg-transparent text-sm md:text-base text-gray-900 placeholder-gray-400 outline-none font-medium"
            />
            {loading && <Loader2 className="w-4 h-4 text-[#4f46e5] animate-spin shrink-0" />}
            {query && !loading && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setLeads([]);
                  setTeam([]);
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-gray-400 bg-white border border-gray-200 rounded-md shadow-2xs font-mono">
              ESC
            </kbd>
          </div>

          {/* Results Area */}
          <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-gray-50">
            {/* Leads Section */}
            {leads.length > 0 && (
              <div className="py-2">
                <div className="px-3 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Leads ({leads.length})</span>
                  <span className="text-[10px] font-normal lowercase text-gray-400">press enter to open</span>
                </div>
                <div className="space-y-0.5">
                  {leads.map((lead) => {
                    const idx = selectableItems.findIndex((it) => it.type === "lead" && it.data.id === lead.id);
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={`lead-${lead.id}`}
                        onClick={() => handleSelect({ type: "lead", data: lead })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`px-3 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? "bg-indigo-50 text-[#4f46e5]" : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                          }`}>
                            <Users className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {lead.name}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              {lead.phone && (
                                <span className="flex items-center font-mono">
                                  <Phone className="w-3 h-3 mr-1 text-emerald-600" />
                                  {lead.phone}
                                </span>
                              )}
                              {lead.city && (
                                <span className="flex items-center">
                                  <MapPin className="w-3 h-3 mr-0.5 text-gray-400" />
                                  {lead.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {lead.status && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                              {lead.status}
                            </span>
                          )}
                          <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? "text-[#4f46e5] translate-x-0.5" : "text-gray-300"}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Team Members Section (Admins only) */}
            {isAdmin && team.length > 0 && (
              <div className="py-2">
                <div className="px-3 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Team Members ({team.length})
                </div>
                <div className="space-y-0.5">
                  {team.map((member) => {
                    const idx = selectableItems.findIndex((it) => it.type === "team" && it.data.id === member.id);
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={`team-${member.id}`}
                        onClick={() => handleSelect({ type: "team", data: member })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`px-3 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? "bg-indigo-50 text-[#4f46e5]" : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-indigo-600 text-white" : "bg-purple-100 text-purple-700 font-bold text-xs"
                          }`}>
                            {member.name?.slice(0, 2).toUpperCase() || "TM"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {member.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {member.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            {member.role}
                          </span>
                          <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? "text-[#4f46e5] translate-x-0.5" : "text-gray-300"}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation / Quick Shortcuts Section */}
            {filteredNavItems.length > 0 && (
              <div className="py-2">
                <div className="px-3 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {query ? "Jump to Page" : "Quick Navigation"}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {filteredNavItems.map((nav) => {
                    const idx = selectableItems.findIndex((it) => it.type === "nav" && it.data.id === nav.id);
                    const isSelected = idx === selectedIndex;
                    const Icon = nav.icon;
                    return (
                      <div
                        key={nav.id}
                        onClick={() => handleSelect({ type: "nav", data: nav })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`p-2.5 rounded-xl flex items-center space-x-3 cursor-pointer transition-colors ${
                          isSelected ? "bg-indigo-50 text-[#4f46e5]" : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[#4f46e5] text-white" : "bg-gray-100 text-gray-600"
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {nav.title}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {nav.subtitle}
                          </p>
                        </div>
                        <span className="text-[10px] font-medium text-gray-400 uppercase shrink-0">
                          {nav.group}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {query.length >= 2 && !loading && leads.length === 0 && team.length === 0 && filteredNavItems.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-xs">
                <p className="font-semibold text-gray-600 text-sm">No results found for &quot;{query}&quot;</p>
                <p className="mt-1">Try searching by lead name, 10-digit phone, or team member email.</p>
              </div>
            )}
          </div>

          {/* Footer Navigation Hints */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center space-x-3">
              <span className="flex items-center">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono mr-1 text-[10px]">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono mr-1 text-[10px]">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono mr-1 text-[10px]">↵</kbd>
                to open
              </span>
            </div>
            <span className="text-gray-400 text-[10px]">
              Instant search (0.2s)
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
