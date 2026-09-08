"use client";

import React, { useState } from "react";
import { FileSpreadsheet, ChevronRight, UploadCloud, Video } from "lucide-react";

export default function ExcelImportPage() {
  const [activeTab, setActiveTab] = useState("import-leads");

  return (
    <div className="h-full bg-white flex flex-col p-6">
      <div className="text-xl font-bold mb-4">Import Excel Data</div>
      <p>This is a placeholder for the Excel import page.</p>
    </div>
  );
}
