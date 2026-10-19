"use client";
import { useState } from "react";
import { updateEscalationEmails, updateCustomFieldLabels, updateCustomTags, updateRequireGps } from "@/app/actions/settingsActions";
import { Loader2, Save, Mail, FileText, Plus, Trash2, Tag } from "lucide-react";

export default function SettingsClient({ initialEmails, initialLabels, initialTags, initialRequireGps }: { initialEmails: string, initialLabels: Record<string, string>, initialTags?: any[], initialRequireGps?: boolean }) {
  const [emails, setEmails] = useState(initialEmails);
  const [labels, setLabels] = useState(initialLabels);
  const [tags, setTags] = useState<any[]>(initialTags || []);
  const [requireGps, setRequireGps] = useState(initialRequireGps || false);
  const [savingGps, setSavingGps] = useState(false);
  
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [savedEmails, setSavedEmails] = useState(false);

  const [loadingLabels, setLoadingLabels] = useState(false);
  const [savedLabels, setSavedLabels] = useState(false);

  const [loadingTags, setLoadingTags] = useState(false);
  const [savedTags, setSavedTags] = useState(false);

  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#4f46e5");

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


  const handleToggleGps = async () => {
    setSavingGps(true);
    try {
      await updateRequireGps(!requireGps);
      setRequireGps(!requireGps);
    } catch (err) {
      alert("Failed to update GPS setting");
    } finally {
      setSavingGps(false);
    }
  };

  const handleSaveTags = async () => {
    setLoadingTags(true);
    setSavedTags(false);
    await updateCustomTags(tags);
    setLoadingTags(false);
    setSavedTags(true);
    setTimeout(() => setSavedTags(false), 3000);
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

  const addTag = () => {
    if (!newTagName.trim()) return;
    setTags(prev => [...prev, { name: newTagName.trim(), color: newTagColor }]);
    setNewTagName("");
  };

  const removeTag = (idx: number) => {
    setTags(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-8">
      
      {/* GPS Settings */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">Require GPS for Site Visits</h2>
            <p className="text-sm text-gray-500">Site visitors must have their GPS location recorded when verifying OTPs.</p>
          </div>
          <button 
            onClick={handleToggleGps}
            disabled={savingGps}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${requireGps ? 'bg-indigo-600' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireGps ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>


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
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[#4f46e5] focus:border-[#4f46e5] block p-3 mb-4"
          />

          <button
            onClick={handleSaveEmails}
            disabled={loadingEmails}
            className="flex items-center bg-[#4f46e5] hover:bg-purple-800 text-white font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {loadingEmails ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {savedEmails ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Tags Settings Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Custom Tags Mapping</h2>
            <p className="text-sm text-gray-500">Create color-coded tags that team members can apply to leads.</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {tags.map((tag, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input 
                type="text" 
                value={tag.name}
                disabled
                className="w-1/3 bg-gray-100 border border-gray-200 text-gray-700 text-sm rounded-lg block p-2.5 cursor-not-allowed font-medium"
              />
              <input 
                type="color" 
                value={tag.color}
                disabled
                className="w-12 h-10 rounded cursor-not-allowed border-0 p-0"
              />
              <button 
                onClick={() => removeTag(idx)}
                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <input 
              type="text" 
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              placeholder="Tag Name (e.g. VIP Client)"
              className="w-1/3 bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[#4f46e5] focus:border-[#4f46e5] block p-2.5"
            />
            <input 
              type="color" 
              value={newTagColor}
              onChange={e => setNewTagColor(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer border border-gray-200 p-0"
            />
            <button 
              onClick={addTag}
              disabled={!newTagName.trim()}
              className="flex items-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Tag
            </button>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={handleSaveTags}
              disabled={loadingTags}
              className="flex items-center bg-[#4f46e5] hover:bg-purple-800 text-white font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {loadingTags ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {savedTags ? "Saved!" : "Save Tags"}
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Fields Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-[#4f46e5]">
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
                onChange={e => setLabels(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-1/3 bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[#4f46e5] focus:border-[#4f46e5] block p-2.5"
              />
              <button 
                onClick={() => removeLabel(key)}
                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <input 
              type="text" 
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              placeholder="Raw key (e.g. ad_id)"
              className="w-1/3 bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[#4f46e5] focus:border-[#4f46e5] block p-2.5"
            />
            <span className="text-gray-400">→</span>
            <input 
              type="text" 
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
              placeholder="Display name (e.g. Ad ID)"
              className="w-1/3 bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[#4f46e5] focus:border-[#4f46e5] block p-2.5"
            />
            <button 
              onClick={addLabel}
              disabled={!newKey.trim()}
              className="flex items-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </button>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={handleSaveLabels}
              disabled={loadingLabels}
              className="flex items-center bg-[#4f46e5] hover:bg-purple-800 text-white font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {loadingLabels ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {savedLabels ? "Saved!" : "Save Mapping"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
