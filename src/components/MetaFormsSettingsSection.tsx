"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Layers,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  MetaFormsSettingsPayload,
  MetaFormListItem,
  syncExistingMetaLeadForms,
  updateMetaFormVisibility,
} from "@/app/actions/settingsActions";

export default function MetaFormsSettingsSection({
  initialData,
}: {
  initialData: MetaFormsSettingsPayload;
}) {
  const router = useRouter();
  const [forms, setForms] = useState<MetaFormListItem[]>(initialData.forms || []);
  const [hiddenIds, setHiddenIds] = useState<string[]>(initialData.hiddenMetaFormIds || []);
  const [hiddenNames, setHiddenNames] = useState<string[]>(initialData.hiddenMetaFormNames || []);
  const [autoHideNew, setAutoHideNew] = useState<boolean>(Boolean(initialData.autoHideNewForms));
  const [searchQuery, setSearchQuery] = useState("");

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState(initialData.metaApiError || "");

  useEffect(() => {
    setForms(initialData.forms || []);
    setHiddenIds(initialData.hiddenMetaFormIds || []);
    setHiddenNames(initialData.hiddenMetaFormNames || []);
    setAutoHideNew(Boolean(initialData.autoHideNewForms));
    setErrorMsg(initialData.metaApiError || "");
  }, [initialData]);

  const isFormHidden = (form: MetaFormListItem) => {
    if (form.id && hiddenIds.includes(form.id)) return true;
    const norm = form.name.trim().toLowerCase();
    return hiddenNames.some((n) => n.trim().toLowerCase() === norm);
  };

  const toggleForm = (form: MetaFormListItem) => {
    const currentlyHidden = isFormHidden(form);
    setSavedMsg("");

    if (form.id) {
      setHiddenIds((prev) =>
        currentlyHidden ? prev.filter((id) => id !== form.id) : Array.from(new Set([...prev, form.id]))
      );
    }

    const norm = form.name.trim().toLowerCase();
    setHiddenNames((prev) => {
      if (currentlyHidden) {
        return prev.filter((n) => n.trim().toLowerCase() !== norm);
      }
      if (!form.id) {
        return Array.from(new Set([...prev, form.name.trim()]));
      }
      return prev;
    });

    setForms((prev) =>
      prev.map((f) =>
        (f.id && f.id === form.id) || (!f.id && f.name === form.name)
          ? { ...f, isHidden: !currentlyHidden }
          : f
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg("");
    setErrorMsg("");
    try {
      await updateMetaFormVisibility({
        hiddenMetaFormIds: hiddenIds,
        hiddenMetaFormNames: hiddenNames,
        autoHideNewForms: autoHideNew,
      });
      setSavedMsg("Form visibility saved! Hidden forms will not appear in Leads.");
      router.refresh();
      setTimeout(() => setSavedMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save form visibility settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncExisting = async () => {
    setSyncing(true);
    setSyncMsg("");
    setErrorMsg("");
    try {
      const res = await syncExistingMetaLeadForms();
      if (!res.success) {
        setErrorMsg(res.error || "Could not fetch Meta forms.");
      } else {
        if (res.data) {
          setForms(res.data.forms || []);
          setHiddenIds(res.data.hiddenMetaFormIds || []);
          setHiddenNames(res.data.hiddenMetaFormNames || []);
          setAutoHideNew(Boolean(res.data.autoHideNewForms));
        }
        setSyncMsg(
          `Synced ${res.formsCount} Meta form(s) and matched ${res.matchedCount} existing CRM lead(s).`
        );
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  const filteredForms = forms.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
  });

  const hiddenCount = forms.filter(isFormHidden).length;
  const visibleCount = forms.length - hiddenCount;

  return (
    <div id="meta-forms" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-[#4f46e5] shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h2 className="text-lg font-bold text-gray-900">Meta Lead Forms Visibility</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {visibleCount} Shown
              </span>
              {hiddenCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {hiddenCount} Hidden
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Choose which Facebook/Meta Lead Forms appear in Leads. Unwanted forms are kept out of Leads, calls, and alerts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSyncExisting}
          disabled={syncing}
          className="inline-flex items-center justify-center text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-[#4f46e5] border border-indigo-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
          title="Fetch latest Meta forms and match existing CRM leads without changing statuses or callers"
        >
          {syncing ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          {syncing ? "Syncing Forms..." : "Sync Forms & Tag Existing Leads"}
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {syncMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {syncMsg}
        </div>
      )}

      {/* Default behavior for future forms */}
      <div className="mb-4 p-3.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-800">
            Hide brand-new Meta forms by default
          </div>
          <div className="text-xs text-gray-500">
            When ON, any newly created Meta form stays hidden from Leads until you enable it here.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setAutoHideNew((v) => !v);
            setSavedMsg("");
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shrink-0 cursor-pointer ${
            autoHideNew ? "bg-[#4f46e5]" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              autoHideNew ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Search bar */}
      {forms.length > 4 && (
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter forms by name or form ID..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#4f46e5]"
          />
        </div>
      )}

      {/* Forms list */}
      {filteredForms.length === 0 ? (
        <div className="py-8 px-4 text-center bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-500">
          {forms.length === 0
            ? 'No Meta Lead Forms loaded yet. Click "Sync Forms & Tag Existing Leads" above to fetch your Facebook Page forms.'
            : "No forms match your search."}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {filteredForms.map((form) => {
            const hidden = isFormHidden(form);
            return (
              <div
                key={form.id || form.name}
                className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                  hidden ? "bg-gray-50/80" : "bg-white hover:bg-indigo-50/20"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-bold truncate ${
                        hidden ? "text-gray-500 line-through" : "text-gray-900"
                      }`}
                    >
                      {form.name}
                    </span>
                    {form.status && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          form.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {form.status}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {form.id && <span className="font-mono">ID: {form.id}</span>}
                    <span>{form.dbLeadsCount} in CRM</span>
                    {typeof form.metaLeadsCount === "number" && (
                      <span>{form.metaLeadsCount} on Meta</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleForm(form)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shrink-0 cursor-pointer ${
                    hidden
                      ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {hidden ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 mr-1.5" /> Hidden
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> Shown in Leads
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Actions */}
      <div className="pt-4 mt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center bg-[#4f46e5] hover:bg-purple-800 text-white font-bold py-2.5 px-5 rounded-lg transition-colors disabled:opacity-50 text-sm cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? "Saving..." : "Save Form Visibility"}
          </button>

          {savedMsg && <span className="text-xs font-semibold text-emerald-700">{savedMsg}</span>}
        </div>

        <a
          href="/leads?includeHiddenForms=true"
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-[#4f46e5]"
        >
          View All Leads incl. Hidden <ExternalLink className="w-3.5 h-3.5 ml-1" />
        </a>
      </div>
    </div>
  );
}
