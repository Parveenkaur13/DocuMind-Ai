import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Trash2,
  Sparkles,
  X,
  FilePlus2,
  Search,
  Copy,
  Check,
  Download,
  MessageSquare,
  Clock,
  HardDrive,
  BookOpen,
  BarChart3,
  DollarSign,
  Percent,
  Calendar,
  Tag,
  ArrowUpRight,
  GraduationCap,
  Printer,
} from 'lucide-react';
import type { DocItem } from './Sidebar';
import { extractEntitiesFromText } from '../lib/ai';
import { useToast } from './Toast';

interface DocumentViewProps {
  doc: DocItem | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUploadClick: () => void;
  onAskAboutDoc?: (doc: DocItem) => void;
  onOpenStudyModal?: (doc: DocItem) => void;
  onOpenReportModal?: (doc: DocItem) => void;
  initialQuery?: string;
  initialTab?: 'summary' | 'content' | 'details' | 'entities';
}

function formatBytes(bytes: number): string {
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

type TabType = 'summary' | 'entities' | 'content' | 'details';

export function DocumentView({
  doc,
  onClose,
  onDelete,
  onUploadClick,
  onAskAboutDoc,
  onOpenStudyModal,
  onOpenReportModal,
  initialQuery,
  initialTab = 'summary',
}: DocumentViewProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>(initialQuery ? 'content' : initialTab);
  const [searchTerm, setSearchTerm] = useState(initialQuery || '');
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Compute word count and reading time
  const stats = useMemo(() => {
    if (!doc?.extracted_text) return { words: 0, chars: 0, readingTime: '< 1 min' };
    const chars = doc.extracted_text.length;
    const words = doc.extracted_text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readingTime: `${minutes} min read` };
  }, [doc]);

  const matchCount = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term || !doc?.extracted_text) return 0;
    let count = 0;
    let pos = 0;
    const textLower = doc.extracted_text.toLowerCase();
    while ((pos = textLower.indexOf(term, pos)) !== -1) {
      count++;
      pos += term.length;
    }
    return count;
  }, [doc?.extracted_text, searchTerm]);

  const renderedContent = useMemo(() => {
    const raw = doc?.extracted_text || '';
    if (!raw) return 'No text content available for this document.';
    const term = searchTerm.trim();
    if (!term) return raw;

    try {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = raw.split(regex);
      return parts.map((part, idx) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark key={idx} className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        ),
      );
    } catch {
      return raw;
    }
  }, [doc?.extracted_text, searchTerm]);

  const entities = useMemo(() => {
    if (!doc?.extracted_text) return [];
    return extractEntitiesFromText(doc.extracted_text);
  }, [doc?.extracted_text]);

  const financialEntities = useMemo(() => entities.filter((e) => e.category === 'financial'), [entities]);
  const metricEntities = useMemo(() => entities.filter((e) => e.category === 'metric'), [entities]);
  const dateEntities = useMemo(() => entities.filter((e) => e.category === 'date'), [entities]);
  const keyTermEntities = useMemo(() => entities.filter((e) => e.category === 'key_term'), [entities]);

  if (!doc) return null;

  const handleCopyText = () => {
    navigator.clipboard.writeText(doc.extracted_text || doc.summary);
    setCopied(true);
    showToast(`Copied text from ${doc.name}`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([doc.extracted_text || doc.summary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name.endsWith('.txt') ? doc.name : `${doc.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${doc.name}`, 'info');
  };

  return (
    <div className="w-full lg:w-[420px] xl:w-[480px] border-l border-[#e2ece9] bg-white flex flex-col flex-shrink-0 z-10 shadow-lg">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e2ece9] flex items-center justify-between gap-3 bg-gradient-to-b from-white to-[#fbfdfd]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#e8f4f1] border border-[#d2ebe5] flex items-center justify-center flex-shrink-0 text-[#1c4e48]">
            <FileText className="w-5 h-5 text-[#3c8b7e]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-[#183237] truncate" title={doc.name}>
              {doc.name}
            </h3>
            <p className="text-xs text-[#5e7a76] flex items-center gap-1.5 mt-0.5">
              <span>{formatBytes(doc.file_size)}</span>
              <span>•</span>
              <span>{stats.readingTime}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-[#5e7a76] hover:text-[#183237] p-1.5 rounded-lg hover:bg-[#f0f4f3] transition flex-shrink-0"
          title="Close document viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Action Toolbar */}
      <div className="px-5 py-2.5 border-b border-[#e2ece9] bg-[#f8fbfa] flex items-center justify-between gap-2">
        {onAskAboutDoc && (
          <button
            onClick={() => onAskAboutDoc(doc)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c4e48] hover:bg-[#163d38] text-white text-xs font-semibold transition shadow-xs"
            title="Focus conversational Q&A on this document"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ask DocuMind</span>
          </button>
        )}

        <div className="flex items-center gap-1.5">
          {onOpenStudyModal && (
            <button
              onClick={() => onOpenStudyModal(doc)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#e8f4f1] hover:bg-[#d4e8e3] text-[#1c4e48] text-xs font-semibold transition border border-[#d2ebe5] shadow-2xs cursor-pointer"
              title="Interactive Flashcards, Quiz & 2-Host Audio Podcast"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#3c8b7e]" />
              <span>Study & Audio</span>
            </button>
          )}

          {onOpenReportModal && (
            <button
              onClick={() => onOpenReportModal(doc)}
              className="p-1.5 rounded-lg text-[#5e7a76] hover:text-[#183237] hover:bg-white border border-transparent hover:border-[#d4e0dd] transition cursor-pointer"
              title="Print / Save Executive PDF Report"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleCopyText}
            className="p-1.5 rounded-lg text-[#5e7a76] hover:text-[#183237] hover:bg-white border border-transparent hover:border-[#d4e0dd] transition"
            title="Copy document text"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-[#5e7a76] hover:text-[#183237] hover:bg-white border border-transparent hover:border-[#d4e0dd] transition"
            title="Download document text"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 pt-3 border-b border-[#e2ece9] flex gap-4 text-xs font-semibold overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'summary'
              ? 'border-[#1c4e48] text-[#1c4e48]'
              : 'border-transparent text-[#5e7a76] hover:text-[#183237]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Summary</span>
        </button>
        <button
          onClick={() => setActiveTab('entities')}
          className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'entities'
              ? 'border-[#1c4e48] text-[#1c4e48]'
              : 'border-transparent text-[#5e7a76] hover:text-[#183237]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Metrics & Entities</span>
          {entities.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#e8f4f1] text-[#1c4e48] font-bold">
              {entities.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'content'
              ? 'border-[#1c4e48] text-[#1c4e48]'
              : 'border-transparent text-[#5e7a76] hover:text-[#183237]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Content Preview</span>
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'details'
              ? 'border-[#1c4e48] text-[#1c4e48]'
              : 'border-transparent text-[#5e7a76] hover:text-[#183237]'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Details</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'summary' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-[#f0f7f5] border border-[#d4e0dd] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1c4e48] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#3c8b7e]" />
                <span>Executive Overview</span>
              </div>
              <p className="text-sm text-[#183237] leading-relaxed">
                {doc.summary || 'Summary generated upon document upload.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#e2ece9] space-y-2.5 text-xs shadow-2xs">
              <div className="font-semibold text-[#183237] flex items-center justify-between">
                <span>Recommended Questions:</span>
                {onAskAboutDoc && (
                  <span className="text-[10px] text-[#3c8b7e] font-medium">Click to focus chat</span>
                )}
              </div>
              <div className="space-y-1.5">
                {[
                  `What are the main objectives in ${doc.name}?`,
                  `Extract key numbers, dates, and metrics from this document`,
                  `Summarize the primary conclusions and action items`,
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      if (onAskAboutDoc) {
                        onAskAboutDoc(doc);
                        showToast(`Focused chat on ${doc.name}`, 'info');
                      }
                    }}
                    className="w-full text-left p-2.5 rounded-lg bg-[#f8fbfa] hover:bg-[#e8f4f1] border border-[#e2ece9] hover:border-[#3c8b7e] text-[#1c4e48] transition text-xs flex items-center justify-between group cursor-pointer"
                  >
                    <span className="truncate">{q}</span>
                    <span className="text-[#3c8b7e] text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 flex-shrink-0">
                      Ask →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'entities' && (
          <div className="space-y-4 animate-fade-in">
            {/* Quick summary stats */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="font-bold text-emerald-800 text-sm">{financialEntities.length}</div>
                <div className="text-[10px] text-emerald-600 font-medium">Financial Values</div>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                <div className="font-bold text-blue-800 text-sm">{metricEntities.length}</div>
                <div className="text-[10px] text-blue-600 font-medium">Percentages & KPIs</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                <div className="font-bold text-amber-800 text-sm">{dateEntities.length}</div>
                <div className="text-[10px] text-amber-600 font-medium">Dates & Timelines</div>
              </div>
              <div className="p-2 rounded-lg bg-teal-50 border border-teal-100">
                <div className="font-bold text-teal-800 text-sm">{keyTermEntities.length}</div>
                <div className="text-[10px] text-teal-600 font-medium">Strategic Terms</div>
              </div>
            </div>

            {/* Financial Entities */}
            {financialEntities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Financial Figures ({financialEntities.length})</span>
                </div>
                <div className="grid gap-2">
                  {financialEntities.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/90 hover:border-emerald-400 transition text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-emerald-950">{item.value}</span>
                        {onAskAboutDoc && (
                          <button
                            onClick={() => {
                              onAskAboutDoc(doc);
                              showToast(`Focused on ${item.value}`, 'info');
                            }}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Ask DocuMind</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-[#3c5b55] text-[11px] leading-relaxed line-clamp-2 italic">
                        "{item.context}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Percentage & Metrics */}
            {metricEntities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wider">
                  <Percent className="w-3.5 h-3.5 text-blue-600" />
                  <span>Growth & Percentages ({metricEntities.length})</span>
                </div>
                <div className="grid gap-2">
                  {metricEntities.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/90 hover:border-blue-400 transition text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-blue-950">{item.value}</span>
                        {onAskAboutDoc && (
                          <button
                            onClick={() => {
                              onAskAboutDoc(doc);
                              showToast(`Focused on ${item.value}`, 'info');
                            }}
                            className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Ask DocuMind</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-[#3b5368] text-[11px] leading-relaxed line-clamp-2 italic">
                        "{item.context}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dates & Deadlines */}
            {dateEntities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Timelines & Milestones ({dateEntities.length})</span>
                </div>
                <div className="grid gap-2">
                  {dateEntities.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/90 hover:border-amber-400 transition text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-amber-950">{item.value}</span>
                        {onAskAboutDoc && (
                          <button
                            onClick={() => {
                              onAskAboutDoc(doc);
                              showToast(`Focused on ${item.value}`, 'info');
                            }}
                            className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Ask DocuMind</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-[#64553b] text-[11px] leading-relaxed line-clamp-2 italic">
                        "{item.context}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic Key Terms */}
            {keyTermEntities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900 uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5 text-teal-600" />
                  <span>Strategic Concepts ({keyTermEntities.length})</span>
                </div>
                <div className="grid gap-2">
                  {keyTermEntities.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/90 hover:border-teal-400 transition text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-teal-950">{item.value}</span>
                        {onAskAboutDoc && (
                          <button
                            onClick={() => {
                              onAskAboutDoc(doc);
                              showToast(`Focused on ${item.value}`, 'info');
                            }}
                            className="text-[11px] font-semibold text-teal-800 hover:text-teal-950 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Ask DocuMind</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-[#3b5e59] text-[11px] leading-relaxed line-clamp-2 italic">
                        "{item.context}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {entities.length === 0 && (
              <div className="p-8 text-center bg-[#f8fbfa] rounded-2xl border border-dashed border-[#d4e0dd]">
                <BarChart3 className="w-8 h-8 text-[#5e7a76] mx-auto mb-2 opacity-50" />
                <h4 className="text-xs font-bold text-[#183237] mb-1">No structured entities found</h4>
                <p className="text-[11px] text-[#5e7a76] max-w-xs mx-auto">
                  This document does not contain explicit currency, percentages, or dates. You can ask DocuMind to extract custom insights in the chat panel.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-3 animate-fade-in flex flex-col h-full">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5e7a76]" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search within this document…"
                className="w-full pl-9 pr-20 py-2 rounded-lg border border-[#d4e0dd] bg-[#f8fbfa] text-xs text-[#183237] focus:outline-none focus:ring-2 focus:ring-[#3c8b7e]"
              />
              {searchTerm && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#1c4e48] bg-[#e8f4f1] px-1.5 py-0.5 rounded border border-[#d2ebe5]">
                    {matchCount} found
                  </span>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-[#5e7a76] hover:text-[#183237] p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Document Text Box */}
            <div className="flex-1 p-4 rounded-xl bg-[#f8fbfa] border border-[#e2ece9] overflow-y-auto max-h-[500px]">
              <pre className="text-xs text-[#183237] whitespace-pre-wrap font-sans leading-relaxed select-text">
                {renderedContent}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-4 animate-fade-in text-sm">
            <div className="rounded-xl border border-[#e2ece9] p-4 bg-white space-y-3">
              <div className="flex justify-between items-center py-1 border-b border-[#f0f4f3]">
                <span className="text-[#5e7a76] text-xs">File Name</span>
                <span className="font-semibold text-xs text-[#183237] truncate max-w-[200px]">{doc.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#f0f4f3]">
                <span className="text-[#5e7a76] text-xs">File Type</span>
                <span className="font-semibold text-xs text-[#183237] uppercase">{doc.file_type}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#f0f4f3]">
                <span className="text-[#5e7a76] text-xs">File Size</span>
                <span className="font-semibold text-xs text-[#183237]">{formatBytes(doc.file_size)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#f0f4f3]">
                <span className="text-[#5e7a76] text-xs">Word Count</span>
                <span className="font-semibold text-xs text-[#183237]">{stats.words.toLocaleString()} words</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#f0f4f3]">
                <span className="text-[#5e7a76] text-xs">Estimated Reading Time</span>
                <span className="font-semibold text-xs text-[#183237]">{stats.readingTime}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#f0f4f3]">
                <span className="text-[#5e7a76] text-xs flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Date Added
                </span>
                <span className="font-semibold text-xs text-[#183237]">{formatDate(doc.created_at)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#5e7a76] text-xs">Indexing Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                  {doc.status || 'Ready'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[#e2ece9] space-y-2 bg-white">
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#e8f4f1] text-[#1c4e48] font-semibold hover:bg-[#d4e8e3] transition text-xs"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          <span>Upload Another Document</span>
        </button>

        {confirmDelete ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                onDelete(doc.id);
                setConfirmDelete(false);
                onClose();
              }}
              className="flex-1 py-2 rounded-xl bg-[#c0413b] text-white font-semibold hover:bg-[#a83730] transition text-xs"
            >
              Confirm Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2 rounded-xl bg-[#f0f4f3] text-[#5e7a76] font-semibold hover:bg-[#e2ece9] transition text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[#c0413b] hover:bg-[#fbe9e8] transition text-xs font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Document</span>
          </button>
        )}
      </div>
    </div>
  );
}
