"use client";
import { useState } from "react";
import { updateEscalationEmails } from "@/app/actions/settingsActions";
import { Loader2, Save, Mail } from "lucide-react";

export default function SettingsClient({ initialEmails }: { initialEmails: string }) {
  const [emails, setEmails] = useState(initialEmails);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    await updateEscalationEmails(emails);
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Escalation Email Alerts</h2>
          <p className="text-sm text-gray-500">Emails to notify when a lead is ignored for 20 minutes.</p>
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Recipient Email Addresses
        </label>
        <p className="text-xs text-gray-400 mb-3">Separate multiple emails with commas.</p>
        <input 
          type="text" 
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="admin1@example.com, admin2@example.com"
          className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[#613cbc] focus:border-[#613cbc] block p-3 mb-4"
        />

        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center bg-[#613cbc] hover:bg-purple-800 text-white font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
