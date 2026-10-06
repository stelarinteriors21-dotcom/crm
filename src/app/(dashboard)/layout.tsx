import Link from "next/link";
import OrganizationDropdown from "@/components/OrganizationDropdown";
import { 
  BarChart2, Search, UserPlus, PhoneCall, AtSign, Filter, 
  Tag, TrendingUp, Bot, Link as LinkIcon, LayoutGrid, Users, Briefcase,
  Settings, Clock, Bell, ChevronDown, Headset, Plus, Sparkles, Code2, Calendar, Cloud, Download
, Activity} from "lucide-react";

import { getCurrentUser } from "@/app/actions/authActions";
import UserDropdown from "@/components/UserDropdown";
import PendingLeadWatcher from "@/components/PendingLeadWatcher";
import LeadScorePromptWatcher from "@/components/LeadScorePromptWatcher";
import NotificationBell from "@/components/NotificationBell";
import DailySiteVisitsModal from "@/components/DailySiteVisitsModal";
import OmniSearch from "@/components/OmniSearch";
import MobileBottomNav from "@/components/MobileBottomNav";
import prisma from "@/lib/prisma";

import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  
  const isAdmin = user.role === "ADMIN" || user.role === "ROOT";
  
  // Fetch pending tasks for the user
  let upcomingTasks: any[] = [];
  if (user) {
    upcomingTasks = await prisma.task.findMany({
      where: { 
        ...(isAdmin ? (user.role === 'ROOT' ? {} : { lead: { organizationId: user.organizationId } }) : { userId: user.id }),
        isCompleted: false 
      },
      include: { lead: { select: { name: true } } },
      orderBy: { id: "desc" },
      take: 50
    });
  }

  return (
    <>
      <PendingLeadWatcher userId={user?.id} />
      <LeadScorePromptWatcher />
      <DailySiteVisitsModal tasks={upcomingTasks} />
      <div className="flex h-screen bg-[#f8fafc] text-[#333333] font-sans flex-col md:flex-row overflow-hidden">

      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:flex flex-col w-[60px] bg-white border-r border-gray-200 z-10 shadow-sm shrink-0 overflow-hidden">
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
          <div className="w-8 h-8 bg-[#4f46e5] rounded flex items-center justify-center">
            <span className="text-white font-bold text-lg leading-none">S</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 flex flex-col items-center space-y-4 scrollbar-hide">
          <Link href="/dashboard" className="p-2 text-gray-400 hover:text-[#4f46e5] hover:bg-purple-50 rounded-lg transition-colors">
            <BarChart2 className="w-[22px] h-[22px]" strokeWidth={1.5} />
          </Link>
          <Link href="/leads" className="p-2 text-gray-400 hover:text-[#4f46e5] hover:bg-purple-50 rounded-lg transition-colors">
            <Users className="w-[22px] h-[22px]" strokeWidth={1.5} />
          </Link>
          
          {!isAdmin && (
            <Link href="/calls" className="p-2 text-gray-400 hover:text-[#4f46e5] hover:bg-purple-50 rounded-lg transition-colors">
              <PhoneCall className="w-[22px] h-[22px]" strokeWidth={1.5} />
            </Link>
          )}


          {isAdmin && (
            <div className="relative group">
              <Link href="/flowcharts/workflows" className="p-2 text-gray-400 hover:text-[#4f46e5] hover:bg-purple-50 rounded-lg transition-colors block">
                <Bot className="w-[22px] h-[22px]" strokeWidth={1.5} />
              </Link>
              <div className="absolute left-[60px] top-0 ml-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-2">
                <div className="px-4 py-2 text-[10px] font-bold text-gray-400">Automations</div>
                <Link href="/flowcharts/workflows" className="block px-4 py-2 text-sm text-[#4f46e5] bg-purple-50 font-medium">
                  <Bot className="w-4 h-4 inline-block mr-2 text-[#4f46e5]" /> Workflows
                </Link>
                <Link href="/schedules" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  <Calendar className="w-4 h-4 inline-block mr-2 text-gray-400" /> Schedules
                </Link>
                <Link href="/salesflow" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  <LayoutGrid className="w-4 h-4 inline-block mr-2 text-gray-400" /> Salesflow
                </Link>
                <Link href="/api-templates" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  <Cloud className="w-4 h-4 inline-block mr-2 text-gray-400" /> API Templates
                </Link>
                <Link href="/webhooks" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  <Settings className="w-4 h-4 inline-block mr-2 text-gray-400" /> Webhooks
                </Link>
              </div>
            </div>
          )}
          
          {isAdmin && (
            <Link href="/team" className="p-2 text-gray-400 hover:text-[#4f46e5] hover:bg-purple-50 rounded-lg transition-colors">
              <Briefcase className="w-[22px] h-[22px]" strokeWidth={1.5} />
            </Link>
          )}
        </div>


      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 z-[60] relative shadow-sm shrink-0">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="w-8 h-8 bg-[#4f46e5] rounded flex items-center justify-center md:hidden mr-2 shrink-0">
              <span className="text-white font-bold text-lg leading-none">S</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-[#4f46e5] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-semibold text-[15px] truncate max-w-[120px] md:max-w-none">
              {user?.organization?.name || "Stelar Interiors Pvt Ltd"}
            </span>
          </div>

          <div className="flex-1 flex justify-center px-4 hidden md:flex">
            <OmniSearch />
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
            <NotificationBell tasks={upcomingTasks} />
            <Link href="/add/single" className="bg-[#4f46e5] hover:bg-blue-700 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm font-medium flex items-center shadow-sm transition-all h-9 md:h-10">
              <Plus className="w-4 h-4 mr-1 md:mr-1.5" /> <span className="hidden md:inline">Add Lead</span><span className="md:hidden">Lead</span>
            </Link>
            <UserDropdown 
              initials={user?.name?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "SI"}  
              name={user?.name || "Unknown"} 
              email={user?.email || ""} 
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[#f8fafc] p-3 md:p-6 mb-14 md:mb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav isAdmin={isAdmin} />
    </div>
    </>
  );
}

export const dynamic = 'force-dynamic';

