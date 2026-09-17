"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteTask } from "@/app/actions/leadActions";

export default function DeleteTaskButton({ taskId, leadId }: { taskId: string; leadId: string }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    setLoading(true);
    try {
      await deleteTask(taskId, leadId);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      className="text-gray-400 hover:text-red-500 transition-colors p-1"
      title="Delete Task"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
    </button>
  );
}
