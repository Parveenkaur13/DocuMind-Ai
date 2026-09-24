import { useState, useRef, useEffect } from 'react';
import { FileText, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { splitIntoChunks, generateSummary } from '@/lib/ai';
import { useAuth } from '@/lib/auth-context';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

interface UploadItem {
  file: File;
  status: 'reading' | 'saving' | 'done' | 'error';
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function UploadModal({ open, onClose, onUploaded }: UploadModalProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setItems([]);
      setDragOver(false);
    }
  }, [open]);

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const newItems: UploadItem[] = arr.map((file) => ({ file, status: 'reading' as const }));
    setItems((prev) => [...prev, ...newItems]);

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        const binaryExts = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'gif', 'zip'];
        let rawText: string;
        if (binaryExts.includes(ext)) {
          rawText = '';
        } else {
          rawText = await file.text();
        }
        const cleaned = rawText
          // eslint-disable-next-line no-control-regex
          .replace(/\u0000/g, '')
          // eslint-disable-next-line no-control-regex
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD]/g, '')
          .trim();
        const extracted = cleaned || `Document content from ${file.name}. This ${ext.toUpperCase()} file requires a parsing pipeline to extract text. In this demo, you can still chat with it using its name and metadata, and upload TXT or MD files for full text search.`;
        const summary = generateSummary(extracted);
        const chunks = splitIntoChunks(extracted);

        setItems((prev) => prev.map((it, idx) => {
          const globalIdx = prev.length - arr.length + i;
          return idx === globalIdx ? { ...it, status: 'saving' } : it;
        }));

        const { data: doc, error: docError } = await supabase
          .from('documents')
          .insert({
            name: file.name,
            file_type: file.name.split('.').pop() ?? 'txt',
            file_size: file.size,
            status: 'ready',
            extracted_text: extracted,
            summary,
            user_id: user?.id,
          })
          .select()
          .single();

        if (docError) throw docError;

        if (chunks.length && doc) {
          const chunkRows = chunks.map((content, idx) => ({
            document_id: doc.id,
            user_id: user?.id,
            chunk_index: idx,
            content,
            metadata: { char_count: content.length },
          }));
          await supabase.from('document_chunks').insert(chunkRows);
        }

        setItems((prev) => prev.map((it, idx) => {
          const globalIdx = prev.length - arr.length + i;
          return idx === globalIdx ? { ...it, status: 'done' } : it;
        }));
      } catch (err) {
        setItems((prev) => prev.map((it, idx) => {
          const globalIdx = prev.length - arr.length + i;
          return idx === globalIdx ? { ...it, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' } : it;
        }));
      }
    }
    onUploaded();
  };

  if (!open) return null;

  const allDone = items.length > 0 && items.every((it) => it.status === 'done' || it.status === 'error');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e2a27]/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-rise" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8efed]">
          <h3 className="display text-lg font-700 text-[#183237]">Upload documents</h3>
          <button onClick={onClose} className="text-[#5e7a76] hover:text-[#183237] transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${dragOver ? 'border-[#3c8b7e] bg-[#f0f7f5]' : 'border-[#d4e0dd] hover:border-[#9bbcb6] hover:bg-[#f8fbfa]'}`}
          >
            <input ref={inputRef} type="file" multiple accept=".txt,.md,.csv,.json,.pdf,.docx" className="hidden" onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }} />
            <FileText className="w-10 h-10 text-[#9bbcb6] mx-auto mb-3" />
            <p className="text-[#183237] font-600">Drop files here or click to browse</p>
            <p className="text-sm text-[#5e7a76] mt-1">TXT, MD, CSV, JSON, PDF, DOCX</p>
          </div>

          {items.length > 0 && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#f8fbfa] border border-[#e8efed]">
                  <div className="flex-shrink-0">
                    {item.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-[#3c8b7e]" />
                      : item.status === 'error' ? <AlertCircle className="w-5 h-5 text-[#c0413b]" />
                      : <Loader2 className="w-5 h-5 text-[#3c8b7e] animate-spin" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-600 text-[#183237] truncate">{item.file.name}</div>
                    <div className="text-xs text-[#5e7a76]">
                      {formatBytes(item.file.size)}
                      {item.status === 'reading' && ' — reading…'}
                      {item.status === 'saving' && ' — saving…'}
                      {item.status === 'done' && ' — uploaded'}
                      {item.status === 'error' && ` — ${item.error}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {allDone && (
            <button onClick={onClose} className="w-full mt-5 py-2.5 rounded-lg bg-[#1c4e48] text-white font-600 hover:bg-[#163d38] transition">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
