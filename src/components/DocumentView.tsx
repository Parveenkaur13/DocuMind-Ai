import { useState } from 'react';
import { FileText, Trash2, Sparkles, X, FilePlus2, Clock } from 'lucide-react';
import type { DocItem } from './Sidebar';

interface DocumentViewProps {
  doc: DocItem | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUploadClick: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DocumentView({ doc, onClose, onDelete, onUploadClick }: DocumentViewProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!doc) return null;

  return (
    <div className="w-full lg:w-96 xl:w-[420px] border-l border-[#e8efed] bg-white flex flex-col flex-shrink-0">
      <div className="px-5 py-4 border-b border-[#e8efed] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#e8f4f1] flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-[#1c4e48]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-600 text-sm text-[#183237] truncate">{doc.name}</h3>
            <p className="text-xs text-[#5e7a76]">{formatBytes(doc.file_size)} · {formatDate(doc.created_at)}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-[#5e7a76] hover:text-[#183237] transition flex-shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#3c8b7e]" />
            <h4 className="text-xs font-700 uppercase tracking-wide text-[#5e7a76]">AI Summary</h4>
          </div>
          <div className="px-4 py-3.5 rounded-xl bg-[#f0f7f5] border border-[#d4e0dd]">
            <p className="text-sm text-[#183237] leading-relaxed">{doc.summary}</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-700 uppercase tracking-wide text-[#5e7a76] mb-2">Content Preview</h4>
          <div className="px-4 py-3.5 rounded-xl bg-[#f8fbfa] border border-[#e8efed] max-h-96 overflow-y-auto">
            <pre className="text-sm text-[#183237] whitespace-pre-wrap font-sans leading-relaxed">{doc.extracted_text}</pre>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-700 uppercase tracking-wide text-[#5e7a76] mb-2">Details</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#5e7a76]">File type</dt>
              <dd className="font-600 text-[#183237] uppercase">{doc.file_type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#5e7a76]">Size</dt>
              <dd className="font-600 text-[#183237]">{formatBytes(doc.file_size)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#5e7a76] flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Uploaded</dt>
              <dd className="font-600 text-[#183237]">{formatDate(doc.created_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#5e7a76]">Status</dt>
              <dd className="font-600 text-[#3c8b7e] capitalize">{doc.status}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="p-5 border-t border-[#e8efed] space-y-2">
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#e8f4f1] text-[#1c4e48] font-600 hover:bg-[#d4e8e3] transition text-sm"
        >
          <FilePlus2 className="w-4 h-4" /> Upload another
        </button>
        {confirmDelete ? (
          <div className="flex gap-2">
            <button
              onClick={() => { onDelete(doc.id); setConfirmDelete(false); onClose(); }}
              className="flex-1 py-2.5 rounded-lg bg-[#c0413b] text-white font-600 hover:bg-[#a83730] transition text-sm"
            >
              Confirm delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2.5 rounded-lg bg-[#f3f4f6] text-[#5e7a76] font-600 hover:bg-[#e8efed] transition text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[#c0413b] hover:bg-[#fbe9e8] transition text-sm font-600"
          >
            <Trash2 className="w-4 h-4" /> Delete document
          </button>
        )}
      </div>
    </div>
  );
}
