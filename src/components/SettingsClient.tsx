"use client";
import { useState } from "react";
import { updateEscalationEmails, updateCustomFieldLabels } from "@/app/actions/settingsActions";
import { Loader2, Save, Mail, FileText, Plus, Trash2 } from "lucide-react";

export default function SettingsClient({ initialEmails, initialLabels }: { initialEmails: string, initialLabels: Record<string, string> }) {
  const [emails, setEmails] = useState(initialEmails);
  const [labels, setLabels] = useState(initialLabels);
  
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [savedEmails, setSavedEmails] = useState(false);

  const [loadingLabels, setLoadingLabels] = useState(false);
  const [savedLabels, setSavedLabels] = useState(false);

  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const handleSaveEmails = async () => {
    setLoadingEmails(true);
    setSavedEmails(false);
    await updateEscalationEmails(emails);
    setLoadingEmails(false);
    setSavedEmails(true);
    setTimeout(() => setSavedEmails(false), 3000);
  };

  const handleSaveLabels = async () => {
    setLoadingLabels(true);
    setSavedLabels(false);
    await updateCustomFieldLabels(labels);
    setLoadingLabels(false);
    setSavedLabels(true);
    setTimeout(() => setSavedLabels(false), 3000);
  };

  const addLabel = () => {
    if (!newKey.trim()) return;
    setLabels(prev => ({ ...prev, [newKey.trim()]: newVal.trim() }));
    setNewKey("");
    setNewVal("");
  };

  const removeLabel = (key: string) => {
    setLabels(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* Escalation Emails Section */}
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
            onClick={handleSaveEmails}
            disabled={loadingEmails}
            className="flex items-center bg-[#613cbc] hover:bg-purple-800 text-white font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {loadingEmails ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {savedEmails ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Dynamic Fields Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-[#613cbc]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Dynamic Columns Mapping</h2>
            <p className="text-sm text-gray-500">Rename the ugly raw keys from Meta into clean Table Headers.</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {Object.entries(labels).map(([key, val]) => (
            <div key={key} className="flex items-center gap-3">
              <input 
                type="text" 
                value={key}
                disabled
                className="w-1/3 bg-gray-100 border border-gray-200 text-gray-500 text-sm rounded-lg block p-2.5 cursor-not-allowed"
              />
              <span className="text-gray-400">→</span>
              <input 
                type="text" 
                value={val}
                onChange={(e) => setLabels(prev => ({ ...prev, [key]: e.target.value }))}
                className="flex-1 bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[#613cbc] focus:border-[#613cbc] block p-2.5"
              />
              <button onClick={() => removeLabel(key)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <input 
              type="text" 
              placeholder="Raw Meta Key (e.g. approx_budget_range)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-1/3 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[#613cbc] focus:border-[#613cbc] block p-2.5"
            />
            <span className="text-gray-400">→</span>
            <input 
              type="text" 
              placeholder="Display Name (e.g. Budget Range)"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[#613cbc] focus:border-[#613cbc] block p-2.5"
            />
            <button onClick={addLabel} disabled={!newKey.trim()} className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-50">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleSaveLabels}
            disabled={loadingLabels}
            className="flex items-center bg-[#613cbc] hover:bg-purple-800 text-white font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50 mt-6"
          >
            {loadingLabels ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {savedLabels ? "Saved!" : "Save Column Mappings"}
          </button>
        </div>
      </div>
    </div>
  );
}
