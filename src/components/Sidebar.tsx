"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, LayoutDashboard, PhoneCall, MapPin, 
  Briefcase, BarChart3, Settings, 
  Search, ChevronLeft, ChevronRight, 
  PanelLeftClose, PanelLeftOpen, Sparkles, UploadCloud
} from "lucide-react";

interface SidebarProps {
  isAdmin?: boolean;
  userRole?: string;
  orgName?: string;
}

interface NavGroup {
  title: string;
  items: {
    label: string;
    href: string;
    icon: React.ElementType;
    adminOnly?: boolean;
    callerOnly?: boolean;
    visitorOnly?: boolean;
    hideForVisitor?: boolean;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Workspace",
    items: [
      { label: "Leads", href: "/leads", icon: Users, hideForVisitor: true },
      { label: "Daily Workdesk", href: "/dashboard", icon: LayoutDashboard },
      { label: "Site Visits", href: "/site-visits", icon: MapPin, adminOnly: true },
      { label: "Site Visits", href: "/site-visits", icon: MapPin, visitorOnly: true },
      { label: "Calls", href: "/calls", icon: PhoneCall, callerOnly: true },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Team", href: "/team", icon: Briefcase, adminOnly: true },
      { label: "Analytics", href: "/analytics", icon: BarChart3, adminOnly: true },
    ],
  },
  {
    title: "Config",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, adminOnly: true },
    ],
  },
];

export default function Sidebar({ isAdmin = false, userRole = "", orgName = "Stelar CRM" }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const pathname = usePathname();

  // Load persistence from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("crm_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("crm_sidebar_collapsed", String(next));
      } catch (e) {}
      return next;
    });
  };

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <aside 
      className={`hidden md:flex flex-col bg-white border-r border-gray-200 z-20 shrink-0 transition-all duration-200 ease-in-out select-none ${
        isCollapsed ? "w-[68px]" : "w-60"
      }`}
    >
      {/* Brand Header */}
      <div className={`h-16 flex items-center border-b border-gray-100 px-4 ${
        isCollapsed ? "justify-center" : "justify-between"
      }`}>
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-white border border-gray-100 shadow-xs">
            <img src="/logo.png" alt="Stelar Interiors" width={32} height={32} style={{ width: 32, height: 32 }} className="w-full h-full object-contain p-0.5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-bold text-sm text-gray-900 truncate block leading-tight">
                {orgName}
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded uppercase tracking-wider">
                CRM
              </span>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Global Command Bar Trigger */}
      <div className="p-3 border-b border-gray-100">
        {isCollapsed ? (
          <button
            type="button"
            onClick={handleOpenSearch}
            title="Search Leads & Team (Cmd + K)"
            className="w-full flex items-center justify-center p-2 rounded-xl text-gray-500 hover:text-[#4f46e5] hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100 transition-all"
          >
            <Search className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenSearch}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 hover:bg-indigo-50/60 border border-gray-200/80 hover:border-indigo-200 text-gray-500 hover:text-[#4f46e5] transition-all group cursor-pointer shadow-2xs"
          >
            <span className="flex items-center space-x-2 text-xs font-medium">
              <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#4f46e5]" />
              <span>Search...</span>
            </span>
            <kbd className="text-[10px] font-bold text-gray-400 group-hover:text-indigo-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-2xs font-mono">
              ⌘K
            </kbd>
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-5 scrollbar-hide">
        {NAV_GROUPS.map((group, groupIdx) => {
          const isSiteVisitor = userRole === "SITE_VISITOR";
          const visibleItems = group.items.filter((item) => {
            if (item.adminOnly && !isAdmin) return false;
            if (item.callerOnly && (isAdmin || isSiteVisitor)) return false;
            if (item.visitorOnly && !isSiteVisitor) return false;
            if (item.hideForVisitor && isSiteVisitor) return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              {/* Group Label */}
              {!isCollapsed ? (
                <div className="px-2.5 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {group.title}
                </div>
              ) : (
                groupIdx > 0 && <div className="border-t border-gray-100 my-2 mx-1" />
              )}

              {/* Group Links */}
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === "/dashboard" 
                    ? pathname === "/dashboard" 
                    : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center rounded-xl transition-all ${
                        isCollapsed 
                          ? "justify-center p-2.5" 
                          : "px-3 py-2 space-x-3 text-xs"
                      } ${
                        isActive
                          ? "bg-indigo-50 text-[#4f46e5] font-bold shadow-2xs"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 font-medium"
                      }`}
                    >
                      <Icon 
                        className={`shrink-0 transition-transform ${
                          isCollapsed ? "w-5 h-5" : "w-4 h-4"
                        } ${isActive ? "text-[#4f46e5]" : "text-gray-400 group-hover:text-gray-600"}`} 
                      />
                      {!isCollapsed && (
                        <span className="truncate flex-1">{item.label}</span>
                      )}
                      {!isCollapsed && isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sidebar Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50">
        {isCollapsed ? (
          <button
            type="button"
            onClick={toggleCollapse}
            title="Expand Sidebar"
            className="w-full flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-200/50 transition-colors"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
            <span>Collapse Sidebar</span>
          </button>
        )}
      </div>
    </aside>
  );
}
