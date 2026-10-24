"use client";

import { useState } from "react";
import { Tag, ChevronDown, Check, Plus } from "lucide-react";
import { updateLeadTag } from "@/app/actions/leadActions";
import { addCustomTag } from "@/app/actions/settingsActions";

interface LeadTagSelectorProps {
  leadId: string;
  initialTag: string | null;
  customTags?: { name: string; color: string }[];
  isAdmin?: boolean;
  className?: string;
}

const DEFAULT_TAGS = [
  { name: "Potential lead", color: "#3b82f6" },
  { name: "Future potential lead", color: "#8b5cf6" },
];

export default function LeadTagSelector({
  leadId,
  initialTag,
  customTags = DEFAULT_TAGS,
  isAdmin = false,
  className = "",
}: LeadTagSelectorProps) {
  const [currentTag, setCurrentTag] = useState<string | null>(initialTag || null);
  const [tagsList, setTagsList] = useState<{ name: string; color: string }[]>(
    customTags && customTags.length > 0 ? customTags : DEFAULT_TAGS
  );
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeTagObj = tagsList.find((t) => t.name === currentTag);

  const handleSelectTag = async (tag: string | null) => {
    setIsOpen(false);
    if (tag === currentTag) return;

    setCurrentTag(tag);
    setLoading(true);
    try {
      await updateLeadTag(leadId, tag);
    } catch (e) {
      console.error("Failed to update tag:", e);
      setCurrentTag(initialTag);
      alert("Failed to update tag");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewTag = async () => {
    setIsOpen(false);
    const tagName = window.prompt("Enter new tag name:");
    if (!tagName || !tagName.trim()) return;

    setLoading(true);
    try {
      const res = await addCustomTag(tagName.trim());
      if (res.success) {
        const newObj = { name: tagName.trim(), color: res.color || "#3b82f6" };
        setTagsList((prev) => [...prev, newObj]);
        setCurrentTag(newObj.name);
        await updateLeadTag(leadId, newObj.name);
      } else {
        alert(res.error || "Failed to create tag");
      }
    } catch (e) {
      console.error("Failed to add custom tag:", e);
      alert("Failed to add custom tag");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        title="Change Lead Tag"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all border cursor-pointer shadow-2xs select-none ${
          currentTag && activeTagObj
            ? "border-transparent text-white"
            : "bg-white hover:bg-gray-50 text-gray-600 border-gray-200"
        }`}
        style={
          currentTag && activeTagObj
            ? { backgroundColor: activeTagObj.color }
            : {}
        }
      >
        <Tag className="w-3 h-3 shrink-0" />
        <span className="truncate max-w-[140px]">
          {currentTag || "+ Add Tag"}
        </span>
        <ChevronDown className="w-3 h-3 opacity-70 shrink-0 ml-0.5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100 mb-1">
              Select Tag
            </div>

            {/* Clear Tag Option */}
            <button
              type="button"
              onClick={() => handleSelectTag(null)}
              className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-50 flex items-center justify-between transition-colors text-gray-600"
            >
              <span>-- No Tag --</span>
              {!currentTag && <Check className="w-3.5 h-3.5 text-gray-500" />}
            </button>

            {/* Tag List */}
            {tagsList.map((t) => {
              const isSelected = currentTag === t.name;
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => handleSelectTag(t.name)}
                  className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${
                    isSelected ? "bg-indigo-50/60 font-bold" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="truncate text-gray-800">{t.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  )}
                </button>
              );
            })}

            {/* Admin Add New Tag */}
            {isAdmin && (
              <div className="pt-1 mt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleAddNewTag}
                  className="w-full px-3 py-1.5 text-xs text-left font-bold text-indigo-600 hover:bg-indigo-50/60 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Tag
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
