"use client";

import { Menu } from "lucide-react";

export default function MobileMenuButton() {
  const handleClick = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("crm_open_mobile_menu"));
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="md:hidden p-1.5 -ml-1 mr-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none cursor-pointer"
      aria-label="Open Navigation Menu"
      title="Navigation Menu"
    >
      <Menu className="w-5 h-5 text-gray-700" />
    </button>
  );
}
