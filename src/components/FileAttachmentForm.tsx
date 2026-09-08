"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { addFileAttachment } from "@/app/actions/fileActions";

export default function FileAttachmentForm({ leadId }: { leadId: string }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("leadId", leadId);
    formData.append("name", name);
    formData.append("url", url);

    await addFileAttachment(formData);

    setName("");
    setUrl("");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2">
      <input 
        type="text"
        placeholder="Document Name (e.g. Quote v1)"
        value={name}
        onChange={e => setName(e.target.value)}
        className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-purple-300"
        required
      />
      <input 
        type="url"
        placeholder="https://..."
        value={url}
        onChange={e => setUrl(e.target.value)}
        className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-purple-300"
        required
      />
      <button
        type="submit"
        disabled={loading || !name || !url}
        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-semibold text-[12px] flex items-center disabled:opacity-50 transition-colors"
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> Add
      </button>
    </form>
  );
}
