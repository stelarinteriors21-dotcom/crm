"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  UploadCloud, FileSpreadsheet, FileText, CheckCircle, 
  AlertTriangle, Download, ArrowRight, Search, Users, 
  Phone, MapPin, Mail, RefreshCw, X, ChevronDown, Check,
  Sparkles, File, Info, ArrowLeft
} from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { bulkImportLeads, parsePdfLeads, getUploadAssignees, BulkLeadRow, BulkUploadOptions } from "@/app/actions/bulkLeadActions";

type FileType = "excel" | "csv" | "pdf" | null;

interface ColumnMapping {
  name: string;
  phone: string;
  alternatePhone: string;
  email: string;
  city: string;
  budget: string;
  status: string;
  source: string;
  tag: string;
  propertyStatus: string;
}

export default function BulkUploadClient() {
  const router = useRouter();

  // State
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [parsing, setParsing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Raw file data
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);

  // Column Mapping
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: "",
    phone: "",
    alternatePhone: "",
    email: "",
    city: "",
    budget: "",
    status: "",
    source: "",
    tag: "",
    propertyStatus: ""
  });

  // Assignees list
  const [assignees, setAssignees] = useState<any[]>([]);

  // Settings
  const [assignmentStrategy, setAssignmentStrategy] = useState<BulkUploadOptions["assignmentStrategy"]>("ROUND_ROBIN");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [defaultStatus, setDefaultStatus] = useState<string>("Fresh");
  const [defaultSource, setDefaultSource] = useState<string>("BULK_IMPORT");
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);

  // Preview & Selection
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [previewSearch, setPreviewSearch] = useState<string>("");

  // Result state
  const [importResult, setImportResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getUploadAssignees().then(list => {
      setAssignees(list);
      const firstCaller = list.find(u => u.role === "TELECALLER");
      if (firstCaller) setTargetUserId(firstCaller.id);
      else if (list.length > 0) setTargetUserId(list[0].id);
    }).catch(console.error);
  }, []);

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (selectedFile: File) => {
    setErrorMsg("");
    setImportResult(null);
    setFile(selectedFile);
    setParsing(true);

    const ext = selectedFile.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      setFileType("excel");
      try {
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (json.length === 0) {
          setErrorMsg("The selected Excel sheet contains no rows.");
          setParsing(false);
          return;
        }

        const headers = Object.keys(json[0]);
        setRawHeaders(headers);
        setRawRows(json);
        autoMapColumns(headers);
        setSelectedIndices(new Set(json.map((_, i) => i)));
      } catch (err: any) {
        setErrorMsg("Failed to read Excel file: " + err.message);
      } finally {
        setParsing(false);
      }
    } else if (ext === "csv") {
      setFileType("csv");
      try {
        const text = await selectedFile.text();
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data: any[] = results.data;
            if (data.length === 0) {
              setErrorMsg("The CSV file contains no rows.");
              setParsing(false);
              return;
            }
            const headers = Object.keys(data[0]);
            setRawHeaders(headers);
            setRawRows(data);
            autoMapColumns(headers);
            setSelectedIndices(new Set(data.map((_, i) => i)));
            setParsing(false);
          },
          error: (err: any) => {
            setErrorMsg("Failed to parse CSV: " + err.message);
            setParsing(false);
          }
        });
      } catch (err: any) {
        setErrorMsg("Failed to read CSV file: " + err.message);
        setParsing(false);
      }
    } else if (ext === "pdf") {
      setFileType("pdf");
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const res = await parsePdfLeads(formData);

        if (!res.success) {
          setErrorMsg(res.error || "Failed to extract contacts from PDF.");
          setParsing(false);
          return;
        }

        const rows = res.rows || [];
        if (rows.length === 0) {
          setErrorMsg("No contact phone numbers or lead entries could be detected in this PDF.");
          setParsing(false);
          return;
        }

        // PDF rows are already pre-structured: { name, phone, email, city, budget, source }
        const headers = ["name", "phone", "email", "city", "budget", "source"];
        setRawHeaders(headers);
        setRawRows(rows);
        setMapping({
          name: "name",
          phone: "phone",
          alternatePhone: "",
          email: "email",
          city: "city",
          budget: "budget",
          status: "",
          source: "source",
          tag: "",
          propertyStatus: ""
        });
        setSelectedIndices(new Set(rows.map((_, i) => i)));
      } catch (err: any) {
        setErrorMsg("Failed to process PDF: " + err.message);
      } finally {
        setParsing(false);
      }
    } else {
      setErrorMsg("Unsupported file format. Please upload an Excel (.xlsx, .xls), CSV (.csv), or PDF (.pdf) file.");
      setFile(null);
      setFileType(null);
      setParsing(false);
    }
  };

  // Smart Column Auto-Mapping
  const autoMapColumns = (headers: string[]) => {
    const newMapping: ColumnMapping = {
      name: "",
      phone: "",
      alternatePhone: "",
      email: "",
      city: "",
      budget: "",
      status: "",
      source: "",
      tag: "",
      propertyStatus: ""
    };

    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const h of headers) {
      const c = clean(h);
      if (!newMapping.alternatePhone && (c.includes("alternate") || c.includes("secondary") || c.includes("otherphone") || c.includes("altphone") || c.includes("altmobile") || c.includes("phone2") || c.includes("mobile2"))) {
        newMapping.alternatePhone = h;
      } else if (!newMapping.phone && (c.includes("phone") || c.includes("mobile") || c.includes("contact") || c.includes("cell") || c.includes("tel") || c === "mob")) {
        newMapping.phone = h;
      } else if (!newMapping.name && (c.includes("name") || c.includes("customer") || c.includes("client") || c.includes("lead") || c.includes("person"))) {
        newMapping.name = h;
      } else if (!newMapping.email && (c.includes("email") || c.includes("mail"))) {
        newMapping.email = h;
      } else if (!newMapping.city && (c.includes("city") || c.includes("location") || c.includes("town") || c.includes("district") || c.includes("place") || c.includes("address"))) {
        newMapping.city = h;
      } else if (!newMapping.budget && (c.includes("budget") || c.includes("amount") || c.includes("value") || c.includes("cost") || c.includes("price"))) {
        newMapping.budget = h;
      } else if (!newMapping.status && (c.includes("status") || c.includes("stage"))) {
        newMapping.status = h;
      } else if (!newMapping.source && (c.includes("source") || c.includes("channel") || c.includes("campaign"))) {
        newMapping.source = h;
      } else if (!newMapping.tag && (c.includes("tag") || c.includes("category"))) {
        newMapping.tag = h;
      } else if (!newMapping.propertyStatus && (c.includes("property") || c.includes("house") || c.includes("flat") || c.includes("renovation"))) {
        newMapping.propertyStatus = h;
      }
    }

    setMapping(newMapping);
  };

  // Generate Sample Templates
  const downloadSampleExcel = () => {
    const sampleData = [
      {
        "Name": "Rahul Sharma",
        "Phone": "9847123456",
        "Email": "rahul.sharma@example.com",
        "City": "Kochi",
        "Budget": "₹5l-₹10l",
        "Status": "Fresh",
        "Property Status": "New House",
        "Source": "Website",
        "Tag": "Potential lead"
      },
      {
        "Name": "Anita Roy",
        "Phone": "9447654321",
        "Email": "anita.roy@example.com",
        "City": "Trivandrum",
        "Budget": "₹10l+",
        "Status": "Contacted",
        "Property Status": "Renovation",
        "Source": "Facebook Ads",
        "Tag": "Future potential lead"
      },
      {
        "Name": "Deepak Menon",
        "Phone": "8590601234",
        "Email": "deepak@example.com",
        "City": "Kollam",
        "Budget": "₹1l-₹5l",
        "Status": "Fresh",
        "Property Status": "Full home",
        "Source": "Referral",
        "Tag": "Potential lead"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads Template");
    XLSX.writeFile(wb, "crm_leads_import_template.xlsx");
  };

  const downloadSampleCsv = () => {
    const sampleCsv = `Name,Phone,Email,City,Budget,Status,Property Status,Source,Tag
Rahul Sharma,9847123456,rahul.sharma@example.com,Kochi,₹5l-₹10l,Fresh,New House,Website,Potential lead
Anita Roy,9447654321,anita.roy@example.com,Trivandrum,₹10l+,Contacted,Renovation,Facebook Ads,Future potential lead
Deepak Menon,8590601234,deepak@example.com,Kollam,₹1l-₹5l,Fresh,Full home,Referral,Potential lead`;

    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "crm_leads_import_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Prepare mapped rows for preview & import
  const preparedRows: BulkLeadRow[] = rawRows.map((row) => {
    const phoneVal = mapping.phone ? String(row[mapping.phone] || "") : "";
    const altPhoneVal = mapping.alternatePhone ? String(row[mapping.alternatePhone] || "") : "";
    const nameVal = mapping.name ? String(row[mapping.name] || "") : "";
    const emailVal = mapping.email ? String(row[mapping.email] || "") : "";
    const cityVal = mapping.city ? String(row[mapping.city] || "") : "";
    const budgetVal = mapping.budget ? String(row[mapping.budget] || "") : "";
    const statusVal = mapping.status ? String(row[mapping.status] || "") : "";
    const sourceVal = mapping.source ? String(row[mapping.source] || "") : "";
    const tagVal = mapping.tag ? String(row[mapping.tag] || "") : "";
    const propVal = mapping.propertyStatus ? String(row[mapping.propertyStatus] || "") : "";

    return {
      phone: phoneVal,
      alternatePhone: altPhoneVal,
      name: nameVal,
      email: emailVal,
      city: cityVal,
      budget: budgetVal,
      status: statusVal,
      source: sourceVal,
      tag: tagVal,
      propertyStatus: propVal
    };
  });

  const toggleSelectAll = () => {
    if (selectedIndices.size === preparedRows.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(preparedRows.map((_, i) => i)));
    }
  };

  const toggleSelectRow = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndices(next);
  };

  // Filter preview rows
  const filteredRows = preparedRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      if (!previewSearch) return true;
      const q = previewSearch.toLowerCase();
      return (
        row.name?.toLowerCase().includes(q) ||
        row.phone?.toLowerCase().includes(q) ||
        row.city?.toLowerCase().includes(q) ||
        row.email?.toLowerCase().includes(q)
      );
    });

  // Execute Bulk Import
  const handleImport = async () => {
    if (!mapping.phone) {
      setErrorMsg("Please select the 'Phone' column in the column mapping.");
      return;
    }

    const selectedRows = preparedRows.filter((_, i) => selectedIndices.has(i));
    if (selectedRows.length === 0) {
      setErrorMsg("Please select at least one row to import.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const options: BulkUploadOptions = {
        assignmentStrategy,
        targetUserId: assignmentStrategy === "SPECIFIC_USER" ? targetUserId : undefined,
        defaultStatus,
        defaultSource,
        skipDuplicates
      };

      const res = await bulkImportLeads(selectedRows, options);
      if (res.success) {
        setImportResult(res);
      } else {
        setErrorMsg(res.message || "Bulk import failed.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during bulk import.");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setFileType(null);
    setRawHeaders([]);
    setRawRows([]);
    setImportResult(null);
    setErrorMsg("");
    setSelectedIndices(new Set());
  };

  return (
    <div className="h-full bg-[#F8FAFC] flex flex-col -m-3 md:-m-6 relative">
      
      {/* Top Header & Tab Switcher */}
      <div className="px-4 md:px-8 py-5 border-b border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/leads" className="hover:text-indigo-600 transition-colors">Leads</Link>
            <span>/</span>
            <span className="font-semibold text-gray-800">Add Leads</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-indigo-600" /> Bulk Upload Leads
          </h1>
        </div>

        {/* Navigation Tabs (Single vs Bulk) */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <Link
            href="/add/single"
            className="flex items-center px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
          >
            <Users className="w-3.5 h-3.5 mr-1.5" /> Single Lead
          </Link>
          <div className="flex items-center px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-white rounded-lg shadow-xs">
            <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Bulk Upload
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-28">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Success Banner */}
          {importResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-emerald-950">Bulk Import Complete!</h3>
                  <p className="text-sm text-emerald-800 mt-1">
                    Successfully imported <b className="font-bold text-emerald-950">{importResult.importedCount}</b> lead(s) into your CRM.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/60">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Evaluated</div>
                      <div className="text-xl font-black text-emerald-950 mt-0.5">{importResult.totalProcessed}</div>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/60">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Imported</div>
                      <div className="text-xl font-black text-emerald-950 mt-0.5">{importResult.importedCount}</div>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/60">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Duplicates Skipped</div>
                      <div className="text-xl font-black text-emerald-950 mt-0.5">{importResult.duplicatesSkipped}</div>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/60">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Invalid Skipped</div>
                      <div className="text-xl font-black text-emerald-950 mt-0.5">{importResult.invalidSkipped}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-6">
                    <Link
                      href="/leads"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                    >
                      View in Leads Grid <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={resetAll}
                      className="bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
                    >
                      Upload Another File
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-red-800 text-sm font-semibold">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg("")} className="text-red-400 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 1: Upload File Area */}
          {!file && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Step 1: Select Your File</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Upload your lead contact lists in Microsoft Excel (.xlsx, .xls), CSV (.csv), or PDF document format.
                  </p>
                </div>
                
                {/* Template download buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={downloadSampleExcel}
                    className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                    title="Download pre-formatted Excel template"
                  >
                    <Download className="w-3.5 h-3.5" /> Sample Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={downloadSampleCsv}
                    className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                    title="Download pre-formatted CSV template"
                  >
                    <Download className="w-3.5 h-3.5" /> Sample CSV
                  </button>
                </div>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 transition-colors">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="text-base font-bold text-gray-900 mb-1">
                  Drag & drop your file here, or <span className="text-indigo-600 underline">Browse files</span>
                </div>
                <p className="text-xs text-gray-400 max-w-md">
                  Supports Excel spreadsheets (.xlsx, .xls), CSV files (.csv), or PDF lead lists (.pdf) up to 25MB.
                </p>

                <div className="flex items-center gap-3 mt-6">
                  <span className="flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Excel (.xlsx, .xls)
                  </span>
                  <span className="flex items-center text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                    <FileText className="w-3.5 h-3.5 mr-1 text-blue-600" /> CSV (.csv)
                  </span>
                  <span className="flex items-center text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                    <File className="w-3.5 h-3.5 mr-1 text-red-600" /> PDF (.pdf)
                  </span>
                </div>
              </div>

              {/* Supported Guidelines Box */}
              <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <b>Pro-Tip for Fast Uploads:</b> For Excel and CSV, ensure your file includes a header row with column names like <code className="bg-white/80 px-1 py-0.5 rounded border border-amber-200">Name</code>, <code className="bg-white/80 px-1 py-0.5 rounded border border-amber-200">Phone</code>, and <code className="bg-white/80 px-1 py-0.5 rounded border border-amber-200">City</code>. For PDF files, our intelligent scanner automatically extracts Indian 10-digit mobile numbers, emails, names, and recognized Kerala locations.
                </div>
              </div>
            </div>
          )}

          {/* Parsing Spinner */}
          {parsing && (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <div className="font-bold text-gray-900 text-sm">Processing & Parsing File...</div>
              <p className="text-xs text-gray-500 mt-1">Detecting phone numbers, headers, and contact information.</p>
            </div>
          )}

          {/* STEP 2: Configuration & Column Mapping (Visible once file is parsed) */}
          {file && !parsing && (
            <>
              {/* File Summary Pill */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    fileType === "excel" ? "bg-emerald-100 text-emerald-700" :
                    fileType === "pdf" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {fileType === "excel" ? <FileSpreadsheet className="w-6 h-6" /> :
                     fileType === "pdf" ? <File className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-gray-900 truncate">{file.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                      <span>&bull;</span>
                      <span className="font-bold text-indigo-600">{rawRows.length} total rows detected</span>
                      <span>&bull;</span>
                      <span className="uppercase text-[10px] font-black bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{fileType}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetAll}
                  className="text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 px-3.5 py-2 rounded-xl transition-colors self-start sm:self-auto flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Change File
                </button>
              </div>

              {/* Column Mapping Section (Only for Excel / CSV) */}
              {fileType !== "pdf" && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" /> Match Columns to CRM Fields
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Verify or adjust which columns in your file match CRM lead properties.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* PHONE (Required) */}
                    <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-200/80">
                      <label className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                        <span>Phone Number *</span>
                        <span className="text-[10px] text-red-600 font-black">MANDATORY</span>
                      </label>
                      <select
                        value={mapping.phone}
                        onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                        className="w-full text-xs font-semibold bg-white border border-purple-300 rounded-lg px-2.5 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- Select Phone Column --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    {/* ALTERNATE PHONE */}
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                        Alternate Phone
                      </label>
                      <select
                        value={mapping.alternatePhone}
                        onChange={(e) => setMapping({ ...mapping, alternatePhone: e.target.value })}
                        className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- (Optional) --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    {/* NAME */}
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                        Lead Name
                      </label>
                      <select
                        value={mapping.name}
                        onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                        className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- (Auto or None) --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    {/* CITY */}
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                        City / Location
                      </label>
                      <select
                        value={mapping.city}
                        onChange={(e) => setMapping({ ...mapping, city: e.target.value })}
                        className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- (Optional) --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    {/* EMAIL */}
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                        Email Address
                      </label>
                      <select
                        value={mapping.email}
                        onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                        className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- (Optional) --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    {/* BUDGET */}
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                        Approximate Budget
                      </label>
                      <select
                        value={mapping.budget}
                        onChange={(e) => setMapping({ ...mapping, budget: e.target.value })}
                        className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- (Optional) --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    {/* PROPERTY STATUS */}
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                        Property Status
                      </label>
                      <select
                        value={mapping.propertyStatus}
                        onChange={(e) => setMapping({ ...mapping, propertyStatus: e.target.value })}
                        className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- (Optional) --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* PDF Extraction Notice */}
              {fileType === "pdf" && (
                <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 flex items-center justify-between text-xs text-red-950">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><b>PDF Scanner Success:</b> Automatically extracted <b>{rawRows.length}</b> contacts from document text.</span>
                  </div>
                  <span className="font-bold text-red-700 bg-red-100/80 px-2 py-0.5 rounded">Auto-Structured</span>
                </div>
              )}

              {/* STEP 3: Lead Import Configuration */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100">
                  Assignment & Pipeline Settings
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Assignment Strategy */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                      Assign Leads To
                    </label>
                    <select
                      value={assignmentStrategy}
                      onChange={(e) => setAssignmentStrategy(e.target.value as any)}
                      className="w-full text-xs font-semibold bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="ROUND_ROBIN">Auto Round-Robin (All Active Callers)</option>
                      <option value="SPECIFIC_USER">Assign to Specific Caller</option>
                      <option value="UNASSIGNED">Unassigned Queue</option>
                    </select>
                  </div>

                  {/* Specific User Target (if selected) */}
                  {assignmentStrategy === "SPECIFIC_USER" && (
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                        Target Caller
                      </label>
                      <select
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                        className="w-full text-xs font-semibold bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {assignees.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} (Caller)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Default Status */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                      Initial Status
                    </label>
                    <select
                      value={defaultStatus}
                      onChange={(e) => setDefaultStatus(e.target.value)}
                      className="w-full text-xs font-semibold bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Fresh">Fresh</option>
                      <option value="Contacted">Contacted</option>
                      <option value="follow up">follow up</option>
                      <option value="RNR">RNR</option>
                      <option value="Site visit Schedules">Site visit Schedules</option>
                      <option value="Quotation Requested">Quotation Requested</option>
                    </select>
                  </div>

                  {/* Default Source */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                      Lead Source Label
                    </label>
                    <input
                      type="text"
                      value={defaultSource}
                      onChange={(e) => setDefaultSource(e.target.value)}
                      placeholder="e.g. EXCEL_UPLOAD, FACEBOOK, CAMPAIGN"
                      className="w-full text-xs font-semibold bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Duplicate Checkbox */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-gray-800">
                      Skip duplicate leads if the phone number already exists in CRM
                    </span>
                  </label>
                  <p className="text-[11px] text-gray-400 ml-6 mt-0.5">
                    Recommended: prevents creating duplicate records for clients already being handled by callers.
                  </p>
                </div>
              </div>

              {/* STEP 4: Live Preview Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
                <div className="p-4 md:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/70">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      {selectedIndices.size === preparedRows.length ? "Deselect All" : "Select All"}
                    </button>
                    <span className="text-xs text-gray-400">&bull;</span>
                    <span className="text-xs font-bold text-gray-700">
                      Selected: <b className="text-indigo-600">{selectedIndices.size}</b> of {preparedRows.length} leads
                    </span>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      placeholder="Search preview leads..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[450px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-gray-100/70 sticky top-0 z-10 text-gray-600 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">City</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Budget</th>
                        <th className="p-3 text-right">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRows.slice(0, 100).map(({ row, index }) => {
                        const isSelected = selectedIndices.has(index);
                        const cleanPhone = String(row.phone || "").replace(/\D/g, "").slice(-10);
                        const isValidPhone = cleanPhone.length === 10;

                        return (
                          <tr
                            key={index}
                            onClick={() => toggleSelectRow(index)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? "bg-indigo-50/40 hover:bg-indigo-50/70" : "hover:bg-gray-50 opacity-60"
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRow(index)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300"
                              />
                            </td>
                            <td className="p-3 font-semibold text-gray-900">
                              {row.name || <span className="text-gray-400 italic">No name</span>}
                            </td>
                            <td className="p-3 font-mono font-bold text-gray-800">
                              {isValidPhone ? cleanPhone : <span className="text-red-500">{row.phone || "Missing"}</span>}
                            </td>
                            <td className="p-3 text-gray-600">{row.city || "--"}</td>
                            <td className="p-3 text-gray-600">{row.email || "--"}</td>
                            <td className="p-3 text-gray-600">{row.budget || "--"}</td>
                            <td className="p-3 text-right">
                              {isValidPhone ? (
                                <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                  Invalid Phone
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredRows.length > 100 && (
                  <div className="p-3 bg-gray-50 text-center text-xs text-gray-500 border-t border-gray-100">
                    Showing first 100 preview rows of {filteredRows.length}. All {selectedIndices.size} selected rows will be imported.
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      {file && (
        <div className="fixed md:absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-20">
          <div className="text-xs text-gray-600">
            Ready to import <b className="text-indigo-600 font-black">{selectedIndices.size}</b> lead(s) into your CRM.
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetAll}
              className="text-xs font-bold text-gray-500 hover:text-gray-800 px-4 py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || selectedIndices.size === 0 || !mapping.phone}
              onClick={handleImport}
              className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-8 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 ${
                loading || selectedIndices.size === 0 || !mapping.phone ? "opacity-50 cursor-not-allowed" : "hover:scale-102 active:scale-98"
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>IMPORTING {selectedIndices.size} LEADS...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>IMPORT {selectedIndices.size} LEADS</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
