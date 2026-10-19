"use client";

import { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, Trash2, Loader2, Plus } from "lucide-react";
import { addLeave, deleteLeave, getMyLeaves } from "@/app/actions/leaveActions";

export default function ManageLeavesModal({ onClose }: { onClose: () => void }) {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const data = await getMyLeaves();
      setLeaves(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setSubmitting(true);
    try {
      await addLeave(startDate, endDate);
      await loadLeaves();
      setStartDate("");
      setEndDate("");
    } catch (e) {
      console.error(e);
      alert("Failed to add leave");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this leave?")) return;
    try {
      await deleteLeave(id);
      await loadLeaves();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2 text-purple-600" /> My Leaves
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          <form onSubmit={handleAdd} className="mb-6 space-y-4 bg-purple-50/50 p-3.5 sm:p-4 rounded-xl border border-purple-100">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-800">Mark new leave</h3>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Start Date</label>
                <input 
                  type="date" 
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full text-sm border-gray-200 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">End Date</label>
                <input 
                  type="date" 
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full text-sm border-gray-200 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg text-sm flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add Leave
            </button>
          </form>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Upcoming & Past Leaves</h3>
            {loading ? (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
              </div>
            ) : leaves.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                <p className="text-sm text-gray-500">No leaves marked yet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {leaves.map(leave => (
                  <div key={leave.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(leave.endDate) < new Date() ? "Past" : "Upcoming/Active"}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDelete(leave.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 transition-colors rounded-md hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
