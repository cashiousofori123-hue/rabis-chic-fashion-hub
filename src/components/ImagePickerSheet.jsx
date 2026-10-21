import React, { useState } from 'react';

export default function ImagePickerSheet({ isOpen, onClose, onSelect, title = "Select Image" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl transition-transform duration-300 ease-out animate-slide-up overflow-hidden">
        <div className="flex flex-col">
          {/* Handle for mobile */}
          <div className="w-full flex justify-center py-3">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
          </div>

          <header className="px-6 pb-4 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </header>

          <div className="px-6 pb-8 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {/* Take Photo */}
              <label className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition group">
                <div className="w-12 h-12 rounded-xl border border-black bg-white text-black flex items-center justify-center transition">
                  <i className="fa-solid fa-camera text-xl"></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">Take Photo</p>
                  <p className="text-xs text-slate-500">Capture a live photo with camera</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onSelect(e.target.files[0], 'camera')}
                />
              </label>

              {/* Photo Library */}
              <label className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition group">
                <div className="w-12 h-12 rounded-xl border border-black bg-white text-black flex items-center justify-center transition">
                  <i className="fa-solid fa-images text-xl"></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">Photo Library</p>
                  <p className="text-xs text-slate-500">Choose a photo from your gallery</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onSelect(e.target.files[0], 'library')}
                />
              </label>

              {/* Files / Google Drive */}
              <label className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition group">
                <div className="w-12 h-12 rounded-xl border border-black bg-white text-black flex items-center justify-center transition">
                  <i className="fa-solid fa-file-import text-xl"></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">Files / Google Drive</p>
                  <p className="text-xs text-slate-500">Import from cloud storage or documents</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onSelect(e.target.files[0], 'files')}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
