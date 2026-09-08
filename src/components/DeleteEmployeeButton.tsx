"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteEmployee } from "@/app/actions/teamActions";

export default function DeleteEmployeeButton({ userId }: { userId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      setIsDeleting(true);
      const res = await deleteEmployee(userId);
      if (res?.error) {
        alert(res.error);
        setIsDeleting(false);
      }
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className={"text-[11px] font-bold text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50 transition-colors ml-2 disabled:opacity-50"}
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}
