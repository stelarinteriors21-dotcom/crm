"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Users, PhoneCall, Briefcase, Bot } from "lucide-react";

export default function MobileBottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: BarChart2 },
    { label: "Leads", href: "/leads", icon: Users },
    { label: "Calls", href: "/calls", icon: PhoneCall },
    ...(isAdmin ? [
      { label: "Team", href: "/team", icon: Briefcase },
      { label: "Automations", href: "/flowcharts/workflows", icon: Bot },
    ] : []),
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around h-14 z-50 shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center p-1.5 transition-colors ${
              isActive ? "text-[#613cbc] font-bold" : "text-gray-500 hover:text-[#613cbc]"
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-[#613cbc]" : "text-gray-500"}`} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
