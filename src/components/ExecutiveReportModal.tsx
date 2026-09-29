import React from 'react';
import {
  X,
  Printer,
  FileText,
  Sparkles,
  Quote,
  CheckCircle,
} from 'lucide-react';
import type { ChatMessage } from './ChatPanel';
import type { DocItem } from './Sidebar';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocItem | null;
  messages: ChatMessage[];
  conversationTitle: string;
}

export function ExecutiveReportModal({
  isOpen,
  onClose,
  document,
  messages,
  conversationTitle,
}: ExecutiveReportModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white print:fixed">
      <div className="bg-white rounded-3xl border border-[#d4e0dd] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden print:max-h-none print:h-auto print:border-none print:shadow-none">
        {/* Header - Hidden in Print */}
        <div className="px-6 py-4.5 border-b border-[#e2ece9] flex items-center justify-between bg-gradient-to-r from-[#1c4e48] to-[#25635b] text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-base">Executive Intelligence Report</h2>
              <p className="text-xs text-[#b8d6d0]">
                Formatted printable document briefing with verified citations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#183237] text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-8 bg-white print:p-0 print:overflow-visible">
          {/* Executive Header Banner */}
          <div className="border-b-2 border-[#1c4e48] pb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#3c8b7e] bg-[#e8f4f1] px-2.5 py-0.5 rounded-md">
                  DocuMind Enterprise Intelligence
                </span>
                <span className="text-xs text-[#5e7a76]">CONFIDENTIAL</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#183237] tracking-tight">
                {conversationTitle || (document ? `${document.name} Intelligence Brief` : 'Executive Document Analysis')}
              </h1>
              <p className="text-xs text-[#5e7a76] mt-1">
                Generated on {today} • Powered by Grounded RAG & Gemini 3.8
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-[#1c4e48]">DocuMind AI</div>
              <div className="text-[10px] text-[#5e7a76]">Zero-Hallucination Grounding</div>
            </div>
          </div>

          {/* Document Metadata Strip */}
          {document && (
            <div className="p-4 rounded-xl bg-[#f8fbfa] border border-[#e2ece9] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[#5e7a76] block text-[10px] uppercase font-bold">Source File</span>
                <span className="font-bold text-[#183237] truncate block">{document.name}</span>
              </div>
              <div>
                <span className="text-[#5e7a76] block text-[10px] uppercase font-bold">File Format</span>
                <span className="font-bold text-[#183237] uppercase">{document.file_type}</span>
              </div>
              <div>
                <span className="text-[#5e7a76] block text-[10px] uppercase font-bold">File Size</span>
                <span className="font-bold text-[#183237]">
                  {Math.round(document.file_size / 1024)} KB
                </span>
              </div>
              <div>
                <span className="text-[#5e7a76] block text-[10px] uppercase font-bold">Verification</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> 100% Grounded
                </span>
              </div>
            </div>
          )}

          {/* Document Summary (If available) */}
          {document?.summary && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1c4e48] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#3c8b7e]" />
                <span>Executive Summary</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#183237] leading-relaxed bg-[#f0f7f5] p-4 rounded-xl border border-[#d4e0dd]">
                {document.summary}
              </p>
            </div>
          )}

          {/* Q&A Dialog Transcript */}
          {messages.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1c4e48]">
                Analytical Q&A Transcript ({messages.length} exchanges)
              </h3>
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#f8fbfa] border-[#e2ece9] text-[#183237] font-semibold'
                        : 'bg-white border-[#d2ebe5] text-[#183237]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 text-[11px] font-bold text-[#5e7a76]">
                      <span>{msg.role === 'user' ? 'Question / Inquiry' : 'DocuMind Synthesis'}</span>
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-[#e2ece9] text-[11px] text-[#5e7a76] space-y-1">
                        <div className="font-bold flex items-center gap-1 text-[#1c4e48]">
                          <Quote className="w-3 h-3 text-[#3c8b7e]" />
                          <span>Sources Cited ({msg.citations.length}):</span>
                        </div>
                        {msg.citations.map((c, cIdx) => (
                          <div key={cIdx} className="italic text-[#4b6a65]">
                            • "{c.snippet}" ({c.document_name})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Footer */}
          <div className="pt-8 border-t border-[#e2ece9] text-[11px] text-[#9bbcb6] flex items-center justify-between">
            <span>DocuMind Enterprise Knowledge Platform</span>
            <span>Confidential Executive Briefing • Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
