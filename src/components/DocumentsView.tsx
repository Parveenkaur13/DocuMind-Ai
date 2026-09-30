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
  ChevronRight,
  Filter,
  Eye,
  GitCompare,
  Tag,
  ArrowRight,
  Share2,
  Calendar,
  Briefcase,
  DollarSign,
  Cpu,
  ChevronDown,
} from 'lucide-react';
import type { DocItem } from './Sidebar';
import { splitIntoChunks, extractEntitiesFromText, type ExtractedEntity } from '../lib/ai';
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

function estimatePages(text: string): number {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 320));
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

  // Document Detail Inspector State (Section 6 & 11)
  const [detailDoc, setDetailDoc] = useState<DocItem | null>(() => {
    if (initialDocId) {
      return documents.find((d) => d.id === initialDocId) || null;
    }
    return null;
  });

  const [activeDetailTab, setActiveDetailTab] = useState<
    'summary' | 'topics' | 'entities' | 'knowledge' | 'content' | 'sources' | 'details'
  >(initialQuery ? 'content' : 'summary');

  const [contentSearch, setContentSearch] = useState(initialQuery || '');
  const [copied, setCopied] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    topics: true,
    concepts: true,
    entities: true,
  });

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
    if (!detailDoc?.extracted_text) {
      return { words: 0, chars: 0, readingTime: '1 min', chunks: 0, pages: 1 };
    }
    const text = detailDoc.extracted_text;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const chunks = splitIntoChunks(text).length;
    const pages = Math.max(1, Math.ceil(words / 320));
    const readingTime = `${Math.max(1, Math.ceil(words / 200))} min read`;
    return { words, chars, readingTime, chunks, pages };
  }, [detailDoc]);

  const detailEntities = useMemo(() => {
    if (!detailDoc?.extracted_text) return [];
    return extractEntitiesFromText(detailDoc.extracted_text);
  }, [detailDoc]);

  const detailChunks = useMemo(() => {
    if (!detailDoc?.extracted_text) return [];
    return splitIntoChunks(detailDoc.extracted_text);
  }, [detailDoc]);

  const detailTopics = useMemo(() => {
    if (!detailDoc?.extracted_text) return [];
    const text = detailDoc.extracted_text;
    const matches = text.match(/\b[A-Z][a-zA-Z0-9-]{2,}(?:\s+[A-Z][a-zA-Z0-9-]{2,}){0,2}\b/g) || [];
    const counts = new Map<string, number>();
    for (const m of matches) {
      if (
        m.length > 3 &&
        !/^(The|This|That|With|From|They|There|When|What|Where|Which|These|Those|Document|Title|Section|Chapter|Page)$/i.test(m)
      ) {
        counts.set(m, (counts.get(m) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(([topic, count]) => ({ topic, count }));
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

  // Toggle tree node in Knowledge Map
  const toggleNode = (node: string) => {
    setExpandedNodes((prev) => ({ ...prev, [node]: !prev[node] }));
  };

  // -------------------------------------------------------------
  // DOCUMENT DETAIL WORKSPACE (Section 6 & 11)
  // -------------------------------------------------------------
  if (detailDoc) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#f8fbfa] overflow-hidden">
        {/* Detail Workspace Top Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#e2ece9] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDetailDoc(null)}
              className="text-xs font-semibold text-[#5e7a76] hover:text-[#183237] flex items-center gap-1 transition cursor-pointer"
            >
              <span>← Documents</span>
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
              <span>Ask AI</span>
            </button>
            <button
              onClick={() => onNavigateToStudy(detailDoc)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#d4e0dd] text-[#183237] hover:border-[#3c8b7e] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#3c8b7e]" />
              <span>Study Mode</span>
            </button>
            <button
              onClick={() => setDetailDoc(null)}
              className="p-1.5 rounded-lg text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3] transition cursor-pointer"
              title="Close Workspace"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clean Two-Column Layout (Section 6) */}
        <div className="flex-1 flex overflow-hidden">
          {/* MAIN/LEFT PANEL: Document Preview / Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-[#e2ece9]">
            {/* Search & Actions toolbar for Content */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-[#f8fbfa] border-b border-[#e2ece9] flex-shrink-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#183237]">
                <FileText className="w-4 h-4 text-[#3c8b7e]" />
                <span>Document Content</span>
                <span className="text-[11px] text-[#5e7a76]">
                  ({detailStats.pages} {detailStats.pages === 1 ? 'page' : 'pages'} • {detailStats.words.toLocaleString()} words)
                </span>
              </div>

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
                  className="p-1.5 rounded-lg border border-[#d4e0dd] hover:bg-white text-[#5e7a76] text-xs transition cursor-pointer"
                  title="Copy Text"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg border border-[#d4e0dd] hover:bg-white text-[#5e7a76] text-xs transition cursor-pointer"
                  title="Download Text"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Text Body */}
            <div className="flex-1 p-6 overflow-y-auto font-mono text-xs text-[#183237] leading-relaxed whitespace-pre-wrap select-text bg-[#fbfdfc]">
              {highlightedContent || 'No extracted text available.'}
            </div>
          </div>

          {/* RIGHT PANEL: AI Assistant & Detailed Workspace Tabs (Section 6 & 11) */}
          <div className="w-96 lg:w-[460px] bg-white flex flex-col flex-shrink-0">
            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 py-2.5 border-b border-[#e2ece9] overflow-x-auto no-scrollbar flex-shrink-0">
              {[
                { id: 'summary', label: 'AI Summary' },
                { id: 'topics', label: 'Key Topics' },
                { id: 'entities', label: 'Entities' },
                { id: 'knowledge', label: 'Knowledge Map' },
                { id: 'sources', label: 'Sources' },
                { id: 'details', label: 'Details' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id as typeof activeDetailTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    activeDetailTab === tab.id
                      ? 'bg-[#1c4e48] text-white shadow-2xs'
                      : 'text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {/* TAB 1: AI Summary */}
              {activeDetailTab === 'summary' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] space-y-2.5">
                    <div className="flex items-center gap-2 text-[#1c4e48]">
                      <Sparkles className="w-4 h-4 text-[#3c8b7e]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider">Executive Summary</h3>
                    </div>
                    <p className="text-xs text-[#183237] leading-relaxed whitespace-pre-line">
                      {detailDoc.summary || 'Summary generated from document text.'}
                    </p>
                  </div>

                  {/* Quick AI Triggers */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[11px] font-bold text-[#5e7a76] uppercase tracking-wider">
                      Study & Analyze
                    </h4>
                    <button
                      onClick={() => onNavigateToStudy(detailDoc)}
                      className="w-full text-left p-3 rounded-xl bg-white hover:bg-[#f8fbfa] border border-[#e2ece9] hover:border-[#3c8b7e] transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#183237]">Generate Study Suite</div>
                        <div className="text-[11px] text-[#5e7a76]">MCQs, flashcards, short notes & viva questions</div>
                      </div>
                      <BookOpen className="w-4 h-4 text-[#3c8b7e]" />
                    </button>

                    <button
                      onClick={() => {
                        onSelectDocForChat(detailDoc.id);
                        onNavigateToChat();
                      }}
                      className="w-full text-left p-3 rounded-xl bg-[#f0f7f5] hover:bg-[#e0ece8] border border-[#d2ebe5] transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#1c4e48]">Ask AI About This File</div>
                        <div className="text-[11px] text-[#5e7a76]">Grounded answers with page citations</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#3c8b7e]" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Key Topics */}
              {activeDetailTab === 'topics' && (
                <div className="space-y-3">
                  <p className="text-xs text-[#5e7a76]">
                    Key themes and recurring technical concepts identified in <strong>{detailDoc.name}</strong>:
                  </p>
                  {detailTopics.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#5e7a76]">No key topics extracted.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {detailTopics.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-[#f8fbfa] border border-[#e8efed] flex items-center justify-between gap-1.5"
                        >
                          <span className="text-xs font-bold text-[#183237] truncate">{item.topic}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#e8f4f1] text-[#1c4e48]">
                            {item.count}×
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Extracted Entities */}
              {activeDetailTab === 'entities' && (
                <div className="space-y-3">
                  <p className="text-xs text-[#5e7a76]">
                    Entities, terminology, and metrics extracted from text:
                  </p>
                  {detailEntities.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#5e7a76]">No entities extracted.</div>
                  ) : (
                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                      {detailEntities.map((ent, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-[#f8fbfa] border border-[#e8efed] space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#1c4e48]">{ent.value}</span>
                            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#e8f4f1] text-[#1c4e48]">
                              {ent.category}
                            </span>
                          </div>
                          {ent.context && (
                            <p className="text-[11px] text-[#5e7a76] italic line-clamp-2">
                              "{ent.context}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Knowledge Map (Section 11: Document -> Topics -> Concepts -> Entities) */}
              {activeDetailTab === 'knowledge' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-[#f0f7f5] border border-[#d2ebe5] text-xs text-[#1c4e48]">
                    <div className="font-bold flex items-center gap-1.5 mb-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#3c8b7e]" />
                      <span>Document Knowledge Hierarchy</span>
                    </div>
                    <p className="text-[11px] text-[#5e7a76]">
                      Interactive structural taxonomy built from extracted topics, concepts, and entities.
                    </p>
                  </div>

                  {/* Hierarchical Tree (Section 11) */}
                  <div className="p-4 rounded-2xl bg-[#f8fbfa] border border-[#e2ece9] font-mono text-xs space-y-3">
                    {/* Root: Document */}
                    <div className="flex items-center gap-2 text-[#1c4e48] font-bold">
                      <FileText className="w-4 h-4 text-[#3c8b7e]" />
                      <span className="truncate">{detailDoc.name}</span>
                    </div>

                    {/* Level 1: Topics */}
                    <div className="pl-4 border-l-2 border-[#d2ebe5] space-y-2">
                      <button
                        onClick={() => toggleNode('topics')}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#183237] hover:text-[#3c8b7e] cursor-pointer"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedNodes.topics ? '' : '-rotate-90'}`} />
                        <span>├── Topics ({detailTopics.length})</span>
                      </button>

                      {expandedNodes.topics && (
                        <div className="pl-5 space-y-1">
                          {detailTopics.slice(0, 6).map((t, idx) => (
                            <div key={idx} className="text-[11px] text-[#5e7a76] flex items-center justify-between">
                              <span>• {t.topic}</span>
                              <span className="text-[10px] text-[#3c8b7e] font-semibold">{t.count} occurrences</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Level 2: Concepts */}
                      <button
                        onClick={() => toggleNode('concepts')}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#183237] hover:text-[#3c8b7e] cursor-pointer"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedNodes.concepts ? '' : '-rotate-90'}`} />
                        <span>├── Concepts & Terminology</span>
                      </button>

                      {expandedNodes.concepts && (
                        <div className="pl-5 space-y-1">
                          {detailEntities
                            .filter((e) => e.category === 'key_term' || e.category === 'metric')
                            .slice(0, 5)
                            .map((e, idx) => (
                              <div key={idx} className="text-[11px] text-[#5e7a76] flex items-center justify-between">
                                <span className="font-semibold text-[#1c4e48]">• {e.value}</span>
                                <span className="text-[9px] uppercase text-[#5e7a76]">{e.category}</span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Level 3: Entities */}
                      <button
                        onClick={() => toggleNode('entities')}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#183237] hover:text-[#3c8b7e] cursor-pointer"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedNodes.entities ? '' : '-rotate-90'}`} />
                        <span>└── Entities ({detailEntities.length})</span>
                      </button>

                      {expandedNodes.entities && (
                        <div className="pl-5 space-y-1">
                          {detailEntities.slice(0, 6).map((e, idx) => (
                            <div key={idx} className="text-[11px] text-[#5e7a76] flex items-center justify-between">
                              <span>• {e.value}</span>
                              <span className="text-[9px] uppercase px-1 rounded bg-[#e8f4f1] text-[#1c4e48]">
                                {e.category}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: Sources / Chunks */}
              {activeDetailTab === 'sources' && (
                <div className="space-y-3">
                  <div className="text-xs text-[#5e7a76]">
                    Indexed into <strong>{detailChunks.length} semantic chunks</strong>:
                  </div>
                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {detailChunks.map((chunk, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#f8fbfa] border border-[#e8efed] space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#1c4e48]">
                          <span>Passage {idx + 1}</span>
                          <span className="font-mono text-[#5e7a76]">{chunk.length} chars</span>
                        </div>
                        <p className="text-xs text-[#183237] leading-relaxed bg-white p-2.5 rounded-lg border border-[#eef4f2]">
                          {chunk}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: Details Metadata */}
              {activeDetailTab === 'details' && (
                <div className="p-4 rounded-2xl bg-[#f8fbfa] border border-[#e2ece9] space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#e8efed]">
                    <span className="text-[#5e7a76]">File Name</span>
                    <span className="font-semibold text-[#183237]">{detailDoc.name}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#e8efed]">
                    <span className="text-[#5e7a76]">File Format</span>
                    <span className="font-semibold uppercase text-[#1c4e48]">{detailDoc.file_type}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#e8efed]">
                    <span className="text-[#5e7a76]">File Size</span>
                    <span className="font-semibold text-[#183237]">{formatBytes(detailDoc.file_size)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#e8efed]">
                    <span className="text-[#5e7a76]">Estimated Pages</span>
                    <span className="font-semibold text-[#183237]">{detailStats.pages}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#e8efed]">
                    <span className="text-[#5e7a76]">Word Count</span>
                    <span className="font-semibold text-[#183237]">{detailStats.words.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#e8efed]">
                    <span className="text-[#5e7a76]">Reading Time</span>
                    <span className="font-semibold text-[#183237]">{detailStats.readingTime}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#e8efed]">
                    <span className="text-[#5e7a76]">Semantic Chunks</span>
                    <span className="font-semibold text-[#183237]">{detailStats.chunks}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#e8efed]">
                    <span className="text-[#5e7a76]">Upload Date</span>
                    <span className="font-semibold text-[#183237]">{formatDate(detailDoc.created_at)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#5e7a76]">Processing Status</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Ready
                    </span>
                  </div>

                  <div className="pt-3">
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
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN DOCUMENTS REPOSITORY VIEW (Section 5)
  // -------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fbfa] overflow-hidden">
      {/* Top Header & Search Bar */}
      <div className="p-4 sm:p-6 lg:p-8 pb-4 space-y-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#183237]">Documents</h1>
            <p className="text-xs sm:text-sm text-[#5e7a76] mt-0.5">
              Manage, search, inspect, and select documents for multi-document RAG.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {selectedDocIds.length > 0 && (
              <div className="flex items-center gap-2 bg-[#e8f4f1] border border-[#3c8b7e]/30 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1c4e48]">
                <span>{selectedDocIds.length} selected</span>
                <button
                  onClick={onNavigateToChat}
                  className="px-2.5 py-0.5 rounded-lg bg-[#1c4e48] text-white hover:bg-[#163d38] text-[11px] transition cursor-pointer"
                >
                  Ask AI ({selectedDocIds.length})
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
              <span>Upload Document</span>
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
              placeholder="Search documents by name or summary…"
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
                <option value="size">Size</option>
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
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'table' ? 'bg-[#e8f4f1] text-[#1c4e48]' : 'text-[#5e7a76] hover:text-[#183237]'
                }`}
                title="Table view"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Grid / Table */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 pt-0 overflow-y-auto">
        {filteredDocs.length === 0 ? (
          /* Empty State (Section 5 & 17) */
          <div className="p-12 text-center bg-white rounded-3xl border border-[#e2ece9] max-w-md mx-auto space-y-4 my-8">
            <div className="w-14 h-14 rounded-2xl bg-[#e8f4f1] text-[#3c8b7e] flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#183237]">No documents yet</h3>
              <p className="text-xs text-[#5e7a76] mt-1">
                Upload your first document and let DocuMind AI turn it into searchable knowledge.
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
                    <th className="py-3 px-4">Pages</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Upload Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f4f3]">
                  {filteredDocs.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    const pagesCount = estimatePages(doc.extracted_text || '');
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
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-[#e8f4f1] text-[#1c4e48] text-[10px] font-bold uppercase">
                            {doc.file_type || 'TXT'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#5e7a76]">
                          {pagesCount} {pagesCount === 1 ? 'page' : 'pages'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#5e7a76] whitespace-nowrap">
                          {formatBytes(doc.file_size)}
                        </td>
                        <td className="py-3 px-4 text-[#5e7a76] whitespace-nowrap">
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Ready
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setDetailDoc(doc)}
                              className="px-2 py-1 rounded-lg text-xs font-semibold text-[#1c4e48] hover:bg-[#e8f4f1] transition cursor-pointer"
                              title="Open Document"
                            >
                              Open
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
          /* Clean Document Cards (Section 5: File name, File type, Pages, Upload date, Processing status) */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              const pagesCount = estimatePages(doc.extracted_text || '');

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
                    {/* Header: Checkbox, File type, File name, Delete */}
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

                    {/* Clean Metadata (Section 5: File name, File type, Pages, Upload date, Processing status) */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 rounded-xl bg-[#f8fbfa] border border-[#eef4f2]">
                      <div>
                        <span className="text-[10px] text-[#5e7a76] uppercase tracking-wider block">Pages</span>
                        <span className="font-semibold text-[#183237]">
                          {pagesCount} {pagesCount === 1 ? 'page' : 'pages'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5e7a76] uppercase tracking-wider block">Upload Date</span>
                        <span className="font-semibold text-[#183237]">{formatDate(doc.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5e7a76] uppercase tracking-wider block">Size</span>
                        <span className="font-semibold text-[#183237]">{formatBytes(doc.file_size)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5e7a76] uppercase tracking-wider block">Status</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Ready
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-[#f4f7f6]">
                    <button
                      onClick={() => setDetailDoc(doc)}
                      className="px-3 py-1.5 rounded-lg bg-[#f0f7f5] hover:bg-[#e0ece8] text-[#1c4e48] text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#3c8b7e]" />
                      <span>Open</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onNavigateToStudy(doc)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#d4e0dd] hover:border-[#3c8b7e] text-[#183237] text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                        title="Study Mode"
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
                        title="Chat"
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
