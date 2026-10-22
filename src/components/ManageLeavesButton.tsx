"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import ManageLeavesModal from "./ManageLeavesModal";

export default function ManageLeavesButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button 
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center px-4 py-1.5 border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-sm font-semibold transition-colors shadow-xs"
      >
        <Calendar className="w-4 h-4 mr-2 text-purple-600" /> Manage Leaves
      </button>

      {showModal && <ManageLeavesModal onClose={() => setShowModal(false)} />}
    </>
  );
}
