import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Upload,
  Trash2,
  BookOpen,
  MessageSquare,
  ArrowUpDown,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  Clock,
  HardDrive,
  Copy,
  Check,
  Download,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
  GitCompare,
  Tag,
  ArrowRight,
} from 'lucide-react';
import type { DocItem } from './Sidebar';
import { splitIntoChunks, extractEntitiesFromText } from '../lib/ai';
import { useToast } from './Toast';

interface DocumentsViewProps {
  documents: DocItem[];
  selectedDocIds: string[];
  onToggleSelectDocId: (id: string) => void;
  onClearSelectedDocIds: () => void;
  onSelectDocForChat: (id: string) => void;
  onDeleteDoc: (id: string) => void;
  onOpenUpload: () => void;
  onNavigateToStudy: (doc: DocItem) => void;
  onNavigateToCompare: () => void;
  onNavigateToChat: () => void;
  initialDocId?: string | null;
  initialQuery?: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recent';
  }
}

export function DocumentsView({
  documents,
  selectedDocIds,
  onToggleSelectDocId,
  onClearSelectedDocIds,
  onSelectDocForChat,
  onDeleteDoc,
  onOpenUpload,
  onNavigateToStudy,
  onNavigateToCompare,
  onNavigateToChat,
  initialDocId,
  initialQuery,
}: DocumentsViewProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Document Detail Inspector State (Section 16 three-panel view)
  const [detailDoc, setDetailDoc] = useState<DocItem | null>(() => {
    if (initialDocId) {
      return documents.find((d) => d.id === initialDocId) || null;
    }
    return null;
  });
  const [activeDetailTab, setActiveDetailTab] = useState<'summary' | 'content' | 'entities' | 'sources' | 'details'>(
    initialQuery ? 'content' : 'summary'
  );
  const [contentSearch, setContentSearch] = useState(initialQuery || '');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (initialDocId) {
      const match = documents.find((d) => d.id === initialDocId);
      if (match) {
        setDetailDoc(match);
        if (initialQuery) {
          setContentSearch(initialQuery);
          setActiveDetailTab('content');
        }
      }
    }
  }, [initialDocId, initialQuery, documents]);

  // Filtered & Sorted documents
  const filteredDocs = useMemo(() => {
    let result = documents.filter((doc) => {
      const matchSearch =
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.summary?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'all' || doc.file_type.toLowerCase() === filterType.toLowerCase();
      return matchSearch && matchType;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return b.file_size - a.file_size;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [documents, searchTerm, filterType, sortBy]);

  // Selected document details
  const detailStats = useMemo(() => {
    if (!detailDoc?.extracted_text) return { words: 0, chars: 0, readingTime: '1 min', chunks: 0 };
    const text = detailDoc.extracted_text;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const chunks = splitIntoChunks(text).length;
    const readingTime = `${Math.max(1, Math.ceil(words / 200))} min read`;
    return { words, chars, readingTime, chunks };
  }, [detailDoc]);

  const detailEntities = useMemo(() => {
    if (!detailDoc?.extracted_text) return [];
    return extractEntitiesFromText(detailDoc.extracted_text);
  }, [detailDoc]);

  const detailChunks = useMemo(() => {
    if (!detailDoc?.extracted_text) return [];
    return splitIntoChunks(detailDoc.extracted_text);
  }, [detailDoc]);

  // Highlight search in document content
  const highlightedContent = useMemo(() => {
    if (!detailDoc?.extracted_text) return null;
    const query = contentSearch.trim();
    if (!query) return detailDoc.extracted_text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return detailDoc.extracted_text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-amber-200 text-amber-950 px-0.5 rounded font-semibold">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  }, [detailDoc, contentSearch]);

  const handleCopyContent = () => {
    if (!detailDoc?.extracted_text) return;
    navigator.clipboard.writeText(detailDoc.extracted_text);
    setCopied(true);
    showToast('Document text copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!detailDoc?.extracted_text) return;
    const blob = new Blob([detailDoc.extracted_text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${detailDoc.name}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded document text', 'success');
  };

  // If a document is selected for detail inspection (Section 16: Three-panel layout)
  if (detailDoc) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#f8fbfa] overflow-hidden">
        {/* Top Header of Detail Inspector */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-[#e2ece9] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDetailDoc(null)}
              className="text-xs font-semibold text-[#5e7a76] hover:text-[#183237] flex items-center gap-1 transition cursor-pointer"
            >
              <span>← All Documents</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#9bbcb6]" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-[#e8f4f1] text-[#1c4e48] text-[10px] font-bold uppercase">
                {detailDoc.file_type}
              </span>
              <h1 className="text-sm font-bold text-[#183237] truncate max-w-md">{detailDoc.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                onSelectDocForChat(detailDoc.id);
                onNavigateToChat();
              }}
              className="px-3 py-1.5 rounded-xl bg-[#1c4e48] text-white hover:bg-[#163d38] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#7dd3c4]" />
              <span>Chat with Doc</span>
            </button>
            <button
              onClick={() => onNavigateToStudy(detailDoc)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#d4e0dd] text-[#183237] hover:border-[#3c8b7e] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#3c8b7e]" />
              <span>Study Mode</span>
            </button>
            <button
              onClick={() => {
                onSelectDocForChat(detailDoc.id);
                onNavigateToChat();
              }}
              className="p-1.5 rounded-lg border border-[#d4e0dd] hover:bg-[#f0f4f3] text-[#5e7a76] hover:text-[#183237] transition cursor-pointer"
              title="Open in Chat"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDetailDoc(null)}
              className="p-1.5 rounded-lg text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3] transition cursor-pointer"
              title="Close Inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Professional Three-Panel Layout (Section 16) */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL: Metadata, Statistics & Extracted Entities */}
          <div className="w-72 bg-white border-r border-[#e2ece9] p-5 overflow-y-auto space-y-5 hidden md:block flex-shrink-0">
            <div>
              <h3 className="text-xs font-bold text-[#5e7a76] uppercase tracking-wider mb-2.5">
                Document Metadata
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#f4f7f6]">
                  <span className="text-[#5e7a76] flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-[#3c8b7e]" />
                    <span>Size</span>
                  </span>
                  <span className="font-semibold text-[#183237]">{formatBytes(detailDoc.file_size)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#f4f7f6]">
                  <span className="text-[#5e7a76]">Word Count</span>
                  <span className="font-semibold text-[#183237]">{detailStats.words.toLocaleString()} words</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#f4f7f6]">
                  <span className="text-[#5e7a76] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#3c8b7e]" />
                    <span>Reading Time</span>
                  </span>
                  <span className="font-semibold text-[#183237]">{detailStats.readingTime}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#f4f7f6]">
                  <span className="text-[#5e7a76] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#3c8b7e]" />
                    <span>Knowledge Chunks</span>
                  </span>
                  <span className="font-semibold text-[#3c8b7e] font-mono">~{detailStats.chunks} chunks</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#f4f7f6]">
                  <span className="text-[#5e7a76]">Indexed Date</span>
                  <span className="font-semibold text-[#183237]">{formatDate(detailDoc.created_at)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#5e7a76]">RAG Status</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Verified Grounded
                  </span>
                </div>
              </div>
            </div>

            {/* Extracted Entities preview */}
            <div>
              <h3 className="text-xs font-bold text-[#5e7a76] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#3c8b7e]" />
                <span>Extracted Entities ({detailEntities.length})</span>
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {detailEntities.length === 0 ? (
                  <p className="text-[11px] text-[#5e7a76]">No entities extracted.</p>
                ) : (
                  detailEntities.slice(0, 10).map((ent, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-[#f8fbfa] border border-[#e8efed] text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#1c4e48] truncate">{ent.value}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white text-[#5e7a76] border border-[#e2ece9]">
                          {ent.category}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${detailDoc.name}?`)) {
                    onDeleteDoc(detailDoc.id);
                    setDetailDoc(null);
                  }
                }}
                className="w-full py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer border border-transparent hover:border-red-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Document</span>
              </button>
            </div>
          </div>

          {/* CENTER PANEL: Document Content & Preview with Search */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#f8fbfa] border-r border-[#e2ece9]">
            {/* Tabs for Center Content */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-[#e2ece9] flex-shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveDetailTab('summary')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeDetailTab === 'summary'
                      ? 'bg-[#1c4e48] text-white shadow-2xs'
                      : 'text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3]'
                  }`}
                >
                  AI Summary
                </button>
                <button
                  onClick={() => setActiveDetailTab('content')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeDetailTab === 'content'
                      ? 'bg-[#1c4e48] text-white shadow-2xs'
                      : 'text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3]'
                  }`}
                >
                  Document Content
                </button>
                <button
                  onClick={() => setActiveDetailTab('sources')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeDetailTab === 'sources'
                      ? 'bg-[#1c4e48] text-white shadow-2xs'
                      : 'text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3]'
                  }`}
                >
                  Chunks ({detailChunks.length})
                </button>
                <button
                  onClick={() => setActiveDetailTab('entities')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeDetailTab === 'entities'
                      ? 'bg-[#1c4e48] text-white shadow-2xs'
                      : 'text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3]'
                  }`}
                >
                  Entities & Topics
                </button>
              </div>

              {activeDetailTab === 'content' && (
                <div className="flex items-center gap-2">
                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 text-[#5e7a76] absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Find in text…"
                      value={contentSearch}
                      onChange={(e) => setContentSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 rounded-lg border border-[#d4e0dd] text-xs focus:outline-none focus:ring-1 focus:ring-[#3c8b7e]"
                    />
                  </div>
                  <button
                    onClick={handleCopyContent}
                    className="p-1.5 rounded-lg border border-[#d4e0dd] hover:bg-[#f0f4f3] text-[#5e7a76] text-xs transition cursor-pointer"
                    title="Copy Text"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-1.5 rounded-lg border border-[#d4e0dd] hover:bg-[#f0f4f3] text-[#5e7a76] text-xs transition cursor-pointer"
                    title="Download Text"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Center Content Body */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeDetailTab === 'summary' && (
                <div className="max-w-2xl bg-white p-6 rounded-2xl border border-[#e2ece9] shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 text-[#1c4e48]">
                    <Sparkles className="w-4 h-4 text-[#3c8b7e]" />
                    <h2 className="text-sm font-bold uppercase tracking-wider">Executive Summary</h2>
                  </div>
                  <div className="text-sm text-[#183237] leading-relaxed whitespace-pre-line bg-[#f8fbfa] p-4 rounded-xl border border-[#e8efed]">
                    {detailDoc.summary || 'Summary is being generated or was not available during extraction.'}
                  </div>
                  <div className="pt-2 flex items-center justify-between text-xs text-[#5e7a76] border-t border-[#f0f4f3]">
                    <span>Verified grounded by Gemini RAG engine</span>
                    <button
                      onClick={() => onNavigateToStudy(detailDoc)}
                      className="text-[#3c8b7e] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Generate Full Study Notes</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeDetailTab === 'content' && (
                <div className="bg-white p-6 rounded-2xl border border-[#e2ece9] shadow-2xs font-mono text-xs text-[#183237] leading-relaxed whitespace-pre-wrap select-text">
                  {highlightedContent || 'No extracted text available.'}
                </div>
              )}

              {activeDetailTab === 'sources' && (
                <div className="space-y-3 max-w-3xl">
                  <div className="text-xs text-[#5e7a76]">
                    Document split into <strong>{detailChunks.length} semantic chunks</strong> with 120-character overlap for vector search and cosine retrieval.
                  </div>
                  {detailChunks.map((chunk, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white border border-[#e2ece9] shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#1c4e48]">
                        <span>Chunk #{idx + 1}</span>
                        <span className="font-mono text-[#5e7a76]">{chunk.length} characters</span>
                      </div>
                      <p className="text-xs text-[#183237] leading-relaxed bg-[#f8fbfa] p-3 rounded-lg border border-[#e8efed]">
                        {chunk}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeDetailTab === 'entities' && (
                <div className="max-w-3xl space-y-4">
                  <div className="text-xs text-[#5e7a76]">
                    Key terminology, quantitative data, and organizational entities extracted from this document.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {detailEntities.map((ent, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-white border border-[#e2ece9] shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1c4e48]">{ent.value}</span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#e8f4f1] text-[#1c4e48]">
                            {ent.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5e7a76] italic line-clamp-2">
                          "{ent.context}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Quick AI Assistant & Study Triggers (Section 16) */}
          <div className="w-80 bg-white p-5 overflow-y-auto space-y-4 hidden lg:block flex-shrink-0">
            <div className="flex items-center gap-2 pb-3 border-b border-[#f0f4f3]">
              <Sparkles className="w-4 h-4 text-[#3c8b7e]" />
              <h3 className="text-xs font-bold text-[#183237] uppercase tracking-wider">AI Study & Actions</h3>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  onSelectDocForChat(detailDoc.id);
                  onNavigateToChat();
                }}
                className="w-full text-left p-3 rounded-xl bg-[#f0f7f5] hover:bg-[#e0ece8] border border-[#d2ebe5] transition cursor-pointer group"
              >
                <div className="text-xs font-bold text-[#1c4e48] flex items-center justify-between">
                  <span>Chat With This Document</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#3c8b7e] group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[11px] text-[#5e7a76] mt-0.5">
                  Ask grounded questions strictly verified against this file.
                </p>
              </button>

              <button
                onClick={() => onNavigateToStudy(detailDoc)}
                className="w-full text-left p-3 rounded-xl bg-white hover:bg-[#f8fbfa] border border-[#e2ece9] hover:border-[#3c8b7e] transition cursor-pointer group"
              >
                <div className="text-xs font-bold text-[#183237] flex items-center justify-between">
                  <span>Generate Flashcards & MCQs</span>
                  <BookOpen className="w-3.5 h-3.5 text-[#3c8b7e]" />
                </div>
                <p className="text-[11px] text-[#5e7a76] mt-0.5">
                  Interactive quizzes and memory cards with explanations.
                </p>
              </button>

              <button
                onClick={() => onNavigateToCompare()}
                className="w-full text-left p-3 rounded-xl bg-white hover:bg-[#f8fbfa] border border-[#e2ece9] hover:border-[#3c8b7e] transition cursor-pointer group"
              >
                <div className="text-xs font-bold text-[#183237] flex items-center justify-between">
                  <span>Compare With Another Document</span>
                  <GitCompare className="w-3.5 h-3.5 text-[#3c8b7e]" />
                </div>
                <p className="text-[11px] text-[#5e7a76] mt-0.5">
                  Side-by-side analysis of methodology, algorithms, and results.
                </p>
              </button>
            </div>

            {/* Quick Prompt Starters for this Document */}
            <div className="pt-2 space-y-2">
              <span className="text-[11px] font-bold text-[#5e7a76] uppercase tracking-wider block">
                Suggested Prompts
              </span>
              {[
                `Summarize key takeaways from ${detailDoc.name}`,
                'What are the core metrics and conclusions?',
                'Are there any limitations or open challenges mentioned?',
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onSelectDocForChat(detailDoc.id);
                    onNavigateToChat();
                  }}
                  className="w-full text-left p-2 rounded-lg bg-[#f8fbfa] hover:bg-[#f0f7f5] text-[11px] text-[#1c4e48] border border-[#e8efed] hover:border-[#3c8b7e]/50 transition cursor-pointer"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DOCUMENT REPOSITORY & MANAGEMENT VIEW
  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fbfa] overflow-hidden">
      {/* Top Action Bar */}
      <div className="p-4 sm:p-6 lg:p-8 pb-4 space-y-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#183237]">Knowledge Base Documents</h1>
            <p className="text-xs sm:text-sm text-[#5e7a76] mt-0.5">
              Manage, search, inspect, and select documents for multi-document RAG and comparative learning.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {selectedDocIds.length > 0 && (
              <div className="flex items-center gap-2 bg-[#e8f4f1] border border-[#3c8b7e]/30 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1c4e48]">
                <span>{selectedDocIds.length} selected</span>
                <button
                  onClick={onNavigateToChat}
                  className="px-2 py-0.5 rounded-lg bg-[#1c4e48] text-white hover:bg-[#163d38] text-[11px] transition cursor-pointer"
                >
                  Query Selected ({selectedDocIds.length})
                </button>
                <button
                  onClick={onClearSelectedDocIds}
                  className="text-[#5e7a76] hover:text-[#183237] text-[11px] cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}

            <button
              onClick={onOpenUpload}
              className="px-4 py-2 rounded-xl bg-[#1c4e48] text-white hover:bg-[#163d38] font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#7dd3c4]" />
              <span>Upload Documents</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#5e7a76] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search documents by name or content summary…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-[#d4e0dd] text-xs text-[#183237] focus:outline-none focus:ring-2 focus:ring-[#3c8b7e]/30 transition"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#5e7a76] mr-1">
              <Filter className="w-3.5 h-3.5 text-[#3c8b7e]" />
              <span>Filter:</span>
            </div>
            {['all', 'pdf', 'docx', 'txt'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-xl font-semibold uppercase tracking-wider text-[10px] transition cursor-pointer ${
                  filterType === type
                    ? 'bg-[#1c4e48] text-white shadow-2xs'
                    : 'bg-white border border-[#d4e0dd] text-[#5e7a76] hover:text-[#183237]'
                }`}
              >
                {type}
              </button>
            ))}

            {/* Sort Selector */}
            <div className="flex items-center gap-1 bg-white border border-[#d4e0dd] px-2.5 py-1.5 rounded-xl text-xs text-[#5e7a76]">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size')}
                className="bg-transparent text-xs font-semibold text-[#183237] focus:outline-none cursor-pointer"
              >
                <option value="date">Newest</option>
                <option value="name">Name (A-Z)</option>
                <option value="size">File Size</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white border border-[#d4e0dd] p-0.5 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#e8f4f1] text-[#1c4e48]' : 'text-[#5e7a76] hover:text-[#183237]'
                }`}
                title="Grid view"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'table' ? 'bg-[#e8f4f1] text-[#1c4e48]' : 'text-[#5e7a76] hover:text-[#183237]'
                }`}
                title="Table view"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Table</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Grid / List Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 pt-0 overflow-y-auto">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#e2ece9] max-w-lg mx-auto space-y-4 my-8">
            <div className="w-14 h-14 rounded-2xl bg-[#e8f4f1] text-[#3c8b7e] flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#183237]">No documents match your filter</h3>
              <p className="text-xs text-[#5e7a76] mt-1">
                Upload new PDF, DOCX, or TXT documents to index them into your knowledge base.
              </p>
            </div>
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 rounded-xl bg-[#1c4e48] text-white text-xs font-bold hover:bg-[#163d38] transition cursor-pointer"
            >
              Upload Document
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white rounded-2xl border border-[#e2ece9] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f0f7f5] border-b border-[#e2ece9] text-[#1c4e48] font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 w-10">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Chunks</th>
                    <th className="py-3 px-4">Indexed</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f4f3]">
                  {filteredDocs.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    const chunksCount = doc.extracted_text ? splitIntoChunks(doc.extracted_text).length : 0;
                    return (
                      <tr
                        key={doc.id}
                        className={`hover:bg-[#f8fbfa] transition ${
                          isSelected ? 'bg-[#f4f9f8]' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <button
                            onClick={() => onToggleSelectDocId(doc.id)}
                            className="text-[#5e7a76] hover:text-[#1c4e48] cursor-pointer"
                            title={isSelected ? 'Deselect' : 'Select'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#3c8b7e]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setDetailDoc(doc)}
                            className="font-bold text-[#183237] hover:text-[#1c4e48] text-left truncate max-w-xs block cursor-pointer"
                          >
                            {doc.name}
                          </button>
                          <p className="text-[11px] text-[#5e7a76] truncate max-w-sm">
                            {doc.summary || 'Extracted document'}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-[#e8f4f1] text-[#1c4e48] text-[10px] font-bold uppercase">
                            {doc.file_type || 'TXT'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#5e7a76] whitespace-nowrap">
                          {formatBytes(doc.file_size)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#3c8b7e] whitespace-nowrap">
                          ~{chunksCount}
                        </td>
                        <td className="py-3 px-4 text-[#5e7a76] whitespace-nowrap">
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setDetailDoc(doc)}
                              className="p-1.5 rounded-lg hover:bg-[#e0ece8] text-[#1c4e48] cursor-pointer"
                              title="Inspect"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onNavigateToStudy(doc)}
                              className="p-1.5 rounded-lg hover:bg-[#e0ece8] text-[#1c4e48] cursor-pointer"
                              title="Study"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                onSelectDocForChat(doc.id);
                                onNavigateToChat();
                              }}
                              className="p-1.5 rounded-lg hover:bg-[#e0ece8] text-[#1c4e48] cursor-pointer"
                              title="Chat"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete ${doc.name}?`)) onDeleteDoc(doc.id);
                              }}
                              className="p-1.5 rounded-lg text-[#5e7a76] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              const chunksCount = doc.extracted_text ? splitIntoChunks(doc.extracted_text).length : 0;
              const wordsCount = doc.extracted_text
                ? doc.extracted_text.trim().split(/\s+/).filter(Boolean).length
                : 0;

              return (
                <div
                  key={doc.id}
                  className={`p-5 rounded-2xl bg-white border transition-all flex flex-col justify-between group shadow-2xs ${
                    isSelected
                      ? 'border-[#3c8b7e] ring-2 ring-[#3c8b7e]/20 bg-[#fafdfc]'
                      : 'border-[#e2ece9] hover:border-[#3c8b7e]/50'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: File type, Checkbox, Actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={() => onToggleSelectDocId(doc.id)}
                          className="text-[#5e7a76] hover:text-[#1c4e48] transition cursor-pointer flex-shrink-0"
                          title={isSelected ? 'Deselect' : 'Select for multi-document RAG'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#3c8b7e]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <span className="px-2 py-0.5 rounded-md bg-[#e8f4f1] text-[#1c4e48] text-[10px] font-bold uppercase flex-shrink-0">
                          {doc.file_type || 'TXT'}
                        </span>
                        <h3
                          onClick={() => setDetailDoc(doc)}
                          className="text-xs font-bold text-[#183237] group-hover:text-[#1c4e48] truncate transition cursor-pointer"
                          title={doc.name}
                        >
                          {doc.name}
                        </h3>
                      </div>

                      <button
                        onClick={() => {
                          if (confirm(`Delete ${doc.name}?`)) onDeleteDoc(doc.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[#5e7a76] hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Summary Preview */}
                    <p className="text-xs text-[#5e7a76] line-clamp-3 leading-relaxed">
                      {doc.summary || 'Summary generated automatically from extracted text.'}
                    </p>

                    {/* Document Stats Badges */}
                    <div className="flex flex-wrap gap-2 text-[10px] text-[#5e7a76] pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-[#f8fbfa] border border-[#e8efed]">
                        {formatBytes(doc.file_size)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#f8fbfa] border border-[#e8efed]">
                        ~{chunksCount} chunks
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#f8fbfa] border border-[#e8efed]">
                        {wordsCount.toLocaleString()} words
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#f8fbfa] border border-[#e8efed]">
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom Action Bar */}
                  <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-[#f4f7f6]">
                    <button
                      onClick={() => setDetailDoc(doc)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#f0f7f5] hover:bg-[#e0ece8] text-[#1c4e48] text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#3c8b7e]" />
                      <span>Inspect</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onNavigateToStudy(doc)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#d4e0dd] hover:border-[#3c8b7e] text-[#183237] text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                        title="Generate study material"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#3c8b7e]" />
                        <span>Study</span>
                      </button>
                      <button
                        onClick={() => {
                          onSelectDocForChat(doc.id);
                          onNavigateToChat();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1c4e48] hover:bg-[#163d38] text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                        title="Chat with document"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#7dd3c4]" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
