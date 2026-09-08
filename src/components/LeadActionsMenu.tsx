"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Edit, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LeadActionsMenu({ leadId }: { leadId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
      try {
        const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
        if (res.ok) {
          router.refresh();
        } else {
          alert("Failed to delete lead");
        }
      } catch (err) {
        alert("Failed to delete lead");
      }
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <Link 
              href={`/leads/${leadId}`}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => setIsOpen(false)}
            >
              <ExternalLink className="mr-3 h-4 w-4 text-gray-400" />
              View Details
            </Link>
            
            <Link
              href={`/leads/${leadId}/edit`}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => setIsOpen(false)}
            >
              <Edit className="mr-3 h-4 w-4 text-gray-400" />
              Edit Lead
            </Link>

            <button
              onClick={handleDelete}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 border-t border-gray-100"
            >
              <Trash2 className="mr-3 h-4 w-4 text-red-400" />
              Delete Lead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
