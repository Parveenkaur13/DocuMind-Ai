import React from 'react';
import {
  FileText,
  MessageSquare,
  Upload,
  ArrowRight,
  BookOpen,
  GitCompare,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { DocItem, ConvItem, MainNavView } from './Sidebar';
import { splitIntoChunks } from '../lib/ai';

interface DashboardViewProps {
  documents: DocItem[];
  conversations: ConvItem[];
  totalQuestionsAsked: number;
  onNavigate: (view: MainNavView) => void;
  onOpenUpload: () => void;
  onSelectDoc: (id: string) => void;
  onSelectConv: (id: string) => void;
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

export function DashboardView({
  documents,
  conversations,
  totalQuestionsAsked,
  onNavigate,
  onOpenUpload,
  onSelectDoc,
  onSelectConv,
}: DashboardViewProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fbfa] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Welcome Banner (Section 4) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c4e48] via-[#23605a] to-[#0f322d] text-white p-6 sm:p-8 shadow-sm border border-[#1c4e48]/30">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[#7dd3c4] text-xs font-semibold tracking-wide border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome to DocuMind AI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
            Turn Your Documents Into Intelligence
          </h1>
          <p className="text-white/80 text-sm sm:text-base leading-relaxed">
            Upload documents, explore knowledge, ask questions with grounded citations, compare information across files, and generate personalized learning materials.
          </p>

          {/* Quick Actions (Section 4) */}
          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1c4e48] hover:bg-[#e8f4f1] font-bold text-xs shadow-sm transition transform active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#1c4e48]" />
              <span>Upload Document</span>
            </button>
            <button
              onClick={() => onNavigate('chat')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-semibold text-xs backdrop-blur-xs transition border border-white/15 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-[#7dd3c4]" />
              <span>Ask AI</span>
            </button>
            <button
              onClick={() => onNavigate('study')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-semibold text-xs backdrop-blur-xs transition border border-white/15 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#7dd3c4]" />
              <span>Study Document</span>
            </button>
            <button
              onClick={() => onNavigate('compare')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-semibold text-xs backdrop-blur-xs transition border border-white/15 cursor-pointer"
            >
              <GitCompare className="w-4 h-4 text-[#7dd3c4]" />
              <span>Compare Documents</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real Statistics Grid (Section 4: Real information only, no fake metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Documents */}
        <div className="p-5 rounded-2xl bg-white border border-[#e2ece9] shadow-2xs hover:border-[#3c8b7e]/40 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#5e7a76] uppercase tracking-wider">Documents</span>
            <div className="w-8 h-8 rounded-lg bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#3c8b7e]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#183237]">{documents.length}</div>
          <div className="text-[11px] text-[#5e7a76] mt-1">
            {documents.length === 1 ? '1 document in knowledge base' : `${documents.length} documents indexed`}
          </div>
        </div>

        {/* Metric 2: Questions Asked (Real Count) */}
        <div className="p-5 rounded-2xl bg-white border border-[#e2ece9] shadow-2xs hover:border-[#3c8b7e]/40 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#5e7a76] uppercase tracking-wider">Questions Asked</span>
            <div className="w-8 h-8 rounded-lg bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[#3c8b7e]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#183237]">{totalQuestionsAsked}</div>
          <div className="text-[11px] text-[#5e7a76] mt-1">
            {totalQuestionsAsked === 1 ? '1 grounded question asked' : `${totalQuestionsAsked} questions asked`}
          </div>
        </div>

        {/* Metric 3: Active Conversations */}
        <div className="p-5 rounded-2xl bg-white border border-[#e2ece9] shadow-2xs hover:border-[#3c8b7e]/40 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#5e7a76] uppercase tracking-wider">Chat Sessions</span>
            <div className="w-8 h-8 rounded-lg bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#3c8b7e]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#183237]">{conversations.length}</div>
          <div className="text-[11px] text-[#5e7a76] mt-1">
            {conversations.length === 1 ? '1 conversation saved' : `${conversations.length} conversations`}
          </div>
        </div>

        {/* Metric 4: Multi-Doc RAG Status */}
        <div className="p-5 rounded-2xl bg-white border border-[#e2ece9] shadow-2xs hover:border-[#3c8b7e]/40 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#5e7a76] uppercase tracking-wider">Status</span>
            <div className="w-8 h-8 rounded-lg bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#3c8b7e]" />
            </div>
          </div>
          <div className="text-sm font-bold text-[#183237] truncate mt-1">
            {documents.length > 0 ? 'Documents Ready' : 'Ready for Upload'}
          </div>
          <div className="text-[11px] text-[#5e7a76] mt-1.5 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${documents.length > 0 ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <span>{documents.length > 0 ? 'Grounded search active' : 'Awaiting documents'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Documents & Recent Chats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents Table (2 columns on lg) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#e2ece9] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#f0f4f3] pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#3c8b7e]" />
              <h2 className="text-sm font-bold text-[#183237]">Recent Documents</h2>
              {documents.length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f0f7f5] text-[#1c4e48]">
                  {documents.length}
                </span>
              )}
            </div>
            {documents.length > 0 && (
              <button
                onClick={() => onNavigate('documents')}
                className="text-xs font-semibold text-[#3c8b7e] hover:text-[#1c4e48] transition flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {documents.length === 0 ? (
            /* Professional Empty State (Section 4 & 17) */
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#e8f4f1] text-[#3c8b7e] flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#183237]">No documents yet</h3>
              <p className="text-xs text-[#5e7a76] max-w-sm mx-auto">
                Upload your first document and let DocuMind AI turn it into searchable knowledge.
              </p>
              <button
                onClick={onOpenUpload}
                className="px-4 py-2 rounded-xl bg-[#1c4e48] text-white text-xs font-bold hover:bg-[#163d38] transition cursor-pointer"
              >
                Upload Document
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.slice(0, 5).map((doc) => {
                const chunksCount = doc.extracted_text ? splitIntoChunks(doc.extracted_text).length : 0;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#f8fbfa] hover:bg-[#f0f7f5] border border-[#e8efed] hover:border-[#3c8b7e]/40 transition group"
                  >
                    <div
                      onClick={() => onSelectDoc(doc.id)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#d4e0dd] text-[#1c4e48] flex items-center justify-center font-bold text-[10px] uppercase flex-shrink-0">
                        {doc.file_type || 'txt'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#183237] truncate group-hover:text-[#1c4e48] transition">
                          {doc.name}
                        </div>
                        <div className="text-[10px] text-[#5e7a76] flex items-center gap-2 mt-0.5">
                          <span>{formatBytes(doc.file_size)}</span>
                          <span>•</span>
                          <span>{chunksCount} passages</span>
                          <span>•</span>
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                      <button
                        onClick={() => onSelectDoc(doc.id)}
                        className="px-2.5 py-1 rounded-lg text-[#5e7a76] hover:text-[#1c4e48] hover:bg-white transition text-xs font-semibold cursor-pointer"
                        title="Open Document Workspace"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => {
                          onSelectDoc(doc.id);
                          onNavigate('chat');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#d4e0dd] text-[#1c4e48] hover:border-[#3c8b7e] transition text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3 text-[#3c8b7e]" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Chats */}
        <div className="rounded-2xl bg-white border border-[#e2ece9] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#f0f4f3] pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#3c8b7e]" />
              <h2 className="text-sm font-bold text-[#183237]">Recent Chats</h2>
            </div>
            {conversations.length > 0 && (
              <button
                onClick={() => onNavigate('chat')}
                className="text-xs font-semibold text-[#3c8b7e] hover:text-[#1c4e48] transition cursor-pointer"
              >
                Open Chat
              </button>
            )}
          </div>

          {conversations.length === 0 ? (
            /* Professional Empty State (Section 4 & 17) */
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#e8f4f1] text-[#3c8b7e] flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#183237]">No conversations yet</h3>
              <p className="text-xs text-[#5e7a76]">
                Ask questions about your uploaded documents with source citations.
              </p>
              <button
                onClick={() => onNavigate('chat')}
                className="px-4 py-2 rounded-xl bg-[#1c4e48] text-white text-xs font-bold hover:bg-[#163d38] transition cursor-pointer"
              >
                Start AI Chat
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectConv(c.id);
                    onNavigate('chat');
                  }}
                  className="w-full text-left p-3 rounded-xl bg-[#f8fbfa] hover:bg-[#f0f7f5] border border-[#e8efed] hover:border-[#3c8b7e]/40 transition block cursor-pointer group"
                >
                  <div className="text-xs font-semibold text-[#183237] group-hover:text-[#1c4e48] truncate">
                    {c.title}
                  </div>
                  <div className="text-[10px] text-[#5e7a76] mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#5e7a76]" />
                    <span>{formatDate(c.updated_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
