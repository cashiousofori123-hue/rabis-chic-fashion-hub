import { useRef } from 'react';
import { Camera, FolderOpen, Images } from 'lucide-react';

export default function ImagePickerNative({ onSelect, multiple = false, disabled = false, onDrop, compact = false }) {
  const inputRef = useRef(null);
  const openPicker = (camera = false) => {
    if (!inputRef.current || disabled) return;
    if (camera) inputRef.current.setAttribute('capture', 'environment');
    else inputRef.current.removeAttribute('capture');
    inputRef.current.click();
  };
  const receiveFiles = files => {
    const selected = Array.from(files || []).filter(file => file.type?.startsWith('image/'));
    if (selected.length) onSelect?.(selected);
  };

  return <div
    className={`flex min-h-12 flex-wrap items-center justify-center gap-2 ${compact ? '' : 'rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3'}`}
    onDragOver={event => { if (onDrop) event.preventDefault(); }}
    onDrop={event => { if (onDrop) { event.preventDefault(); onDrop(event.dataTransfer.files); } }}
  >
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple={multiple}
      onChange={event => {
        receiveFiles(event.currentTarget.files);
        event.currentTarget.value = '';
        event.currentTarget.removeAttribute('capture');
      }}
      className="sr-only"
      tabIndex={-1}
    />
    <button type="button" disabled={disabled} onClick={() => openPicker(false)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-bold text-slate-800 shadow-sm disabled:opacity-50">
      <Images size={15} /> Photo Library
    </button>
    <button type="button" disabled={disabled} onClick={() => openPicker(false)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50">
      <FolderOpen size={15} /> Choose File / Drive
    </button>
    <button type="button" disabled={disabled} onClick={() => openPicker(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50">
      <Camera size={15} /> Take Photo
    </button>
  </div>;
}
