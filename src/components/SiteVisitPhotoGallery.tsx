"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Camera,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  CheckCircle2
} from "lucide-react";

interface SiteVisitPhotoGalleryProps {
  photos: string[];
  leadName?: string;
  leadId?: string;
  date?: string;
  rooms?: string;
  measurements?: string;
  compact?: boolean;
}

export default function SiteVisitPhotoGallery({
  photos = [],
  leadName = "Client",
  leadId,
  date,
  rooms,
  measurements,
  compact = false
}: SiteVisitPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const isOpen = activeIndex !== null;
  const currentPhoto = isOpen ? photos[activeIndex] : null;

  const handleNext = useCallback(() => {
    if (activeIndex === null) return;
    setIsZoomed(false);
    setActiveIndex((prev) => (prev! + 1) % photos.length);
  }, [activeIndex, photos.length]);

  const handlePrev = useCallback(() => {
    if (activeIndex === null) return;
    setIsZoomed(false);
    setActiveIndex((prev) => (prev! - 1 + photos.length) % photos.length);
  }, [activeIndex, photos.length]);

  const handleClose = useCallback(() => {
    setActiveIndex(null);
    setIsZoomed(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowRight") handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose, handleNext, handlePrev]);

  // Handle file download
  const handleDownload = (photoUrl: string, index: number) => {
    try {
      const link = document.createElement("a");
      link.href = photoUrl;
      link.download = `SiteVisit_${leadName.replace(/\s+/g, "_")}_Photo_${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Failed to download photo:", e);
      window.open(photoUrl, "_blank");
    }
  };

  if (!photos || photos.length === 0) return null;

  return (
    <div className="w-full">
      {/* Thumbnail Display Mode */}
      {compact ? (
        // Compact mode for sidebar / cards
        <div className="flex flex-wrap gap-2 pt-1">
          {photos.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className="relative group w-14 h-14 rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-500 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-100 cursor-pointer"
              title="Click to view full photo"
            >
              <img
                src={url}
                alt={`Site photo ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="w-3.5 h-3.5 text-white" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        // Full Gallery Mode with responsive grid & previews
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {photos.map((url, idx) => (
              <div
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className="group relative aspect-4/3 rounded-xl overflow-hidden border border-gray-200 hover:border-indigo-500 bg-gray-900/5 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <img
                  src={url}
                  alt={`Site photo ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                
                {/* Overlay gradient & zoom icon */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
                  <div className="self-end">
                    <span className="p-1 rounded-md bg-black/60 text-white hover:bg-black/90 inline-flex items-center justify-center">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="text-white text-[11px] font-semibold flex items-center justify-between">
                    <span>Photo #{idx + 1}</span>
                    <span className="text-[10px] text-gray-300">Click to expand</span>
                  </div>
                </div>

                {/* Photo index badge */}
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold group-hover:hidden backdrop-blur-xs">
                  #{idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isOpen && currentPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-9999 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200 select-none"
        >
          {/* Top Bar Header */}
          <div className="px-4 py-3 bg-black/60 border-b border-white/10 flex items-center justify-between shrink-0 text-white z-10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight flex items-center gap-2">
                  <span>Site Photo {activeIndex! + 1} of {photos.length}</span>
                  {rooms && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/15 text-white/90">
                      {rooms}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {leadName} {date ? `• ${date}` : ""}
                </p>
              </div>
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsZoomed(!isZoomed)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                title={isZoomed ? "Zoom Out" : "Zoom In"}
              >
                {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                <span className="hidden sm:inline">{isZoomed ? "100%" : "Fit"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownload(currentPhoto, activeIndex!)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                title="Download High-Res Photo"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-colors cursor-pointer ml-1"
                title="Close (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Photo Viewing Canvas */}
          <div className="relative flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            {/* Previous Button */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center transition-all hover:scale-105 shadow-xl cursor-pointer"
                title="Previous Photo (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* The Image */}
            <div
              className={`relative max-w-full max-h-full transition-transform duration-200 flex items-center justify-center ${
                isZoomed ? "scale-150 cursor-grab" : "cursor-default"
              }`}
            >
              <img
                src={currentPhoto}
                alt={`Site visit photo ${activeIndex! + 1}`}
                className="max-h-[78vh] max-w-[92vw] object-contain rounded-lg shadow-2xl border border-white/10"
              />
            </div>

            {/* Next Button */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center transition-all hover:scale-105 shadow-xl cursor-pointer"
                title="Next Photo (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip & Notes */}
          <div className="bg-black/75 border-t border-white/10 p-3 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Measurements / Room Notes if any */}
            <div className="text-gray-300 text-xs truncate max-w-md hidden md:block">
              {measurements ? (
                <span className="truncate block" title={measurements}>
                  📐 {measurements}
                </span>
              ) : (
                <span className="text-gray-500">Inspection photo captured on site</span>
              )}
            </div>

            {/* Thumbnail Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
              {photos.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsZoomed(false);
                    setActiveIndex(idx);
                  }}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    activeIndex === idx
                      ? "border-indigo-400 scale-105 shadow-md shadow-indigo-500/30"
                      : "border-transparent opacity-50 hover:opacity-100"
                  }`}
                >
                  <img src={p} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Keyboard hint */}
            <div className="text-[11px] text-gray-500 hidden lg:block">
              Use <kbd className="px-1 py-0.5 bg-white/10 rounded text-gray-300">←</kbd> <kbd className="px-1 py-0.5 bg-white/10 rounded text-gray-300">→</kbd> to navigate, <kbd className="px-1 py-0.5 bg-white/10 rounded text-gray-300">ESC</kbd> to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
