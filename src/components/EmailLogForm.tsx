"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { logEmail } from "@/app/actions/emailActions";

export default function EmailLogForm({ leadId, email }: { leadId: string; email?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !body) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("leadId", leadId);
    formData.append("subject", subject);
    formData.append("body", body);
    if (email) formData.append("email", email);

    await logEmail(formData);

    // Open mailto link
    if (email) {
      window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } else {
      alert("Lead has no email address. Log saved anyway.");
    }

    setSubject("");
    setBody("");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input 
        type="text"
        placeholder="Subject"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-purple-300"
        required
      />
      <div className="flex items-start space-x-2">
        <textarea
          placeholder="Draft your email..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-purple-300 resize-none h-20"
          required
        />
        <button
          type="submit"
          disabled={loading || !subject || !body}
          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
          title="Log & Open Mail Client"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
