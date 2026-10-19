"use client";

import { PhoneCall } from "lucide-react";
import { triggerSmartCall } from "./SmartCallManager";

interface SmartCallButtonProps {
  leadId: string;
  leadName: string;
  phone: string;
  className?: string;
  label?: string;
  showIcon?: boolean;
}

export default function SmartCallButton({
  leadId,
  leadName,
  phone,
  className = "flex items-center px-3 py-1.5 text-[12px] font-bold text-white bg-[#4f46e5] rounded-lg hover:bg-purple-800 transition-colors shadow-sm",
  label = "Call Now",
  showIcon = true,
}: SmartCallButtonProps) {
  if (!phone) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        triggerSmartCall(leadId, leadName, phone);
      }}
      className={className}
      title={`Call ${leadName} (${phone})`}
    >
      {showIcon && <PhoneCall className="w-3.5 h-3.5 mr-1.5" />}
      {label}
    </button>
  );
}
