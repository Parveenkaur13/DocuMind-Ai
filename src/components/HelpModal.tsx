import React from 'react';
import {
  X,
  HelpCircle,
  Sparkles,
  FileText,
  BookOpen,
  GitCompare,
  Compass,
  Cpu,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e2a27]/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#d4e0dd] flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8efed] bg-gradient-to-b from-white to-[#fbfdfd] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-[#3c8b7e]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#183237]">About DocuMind AI</h3>
              <p className="text-xs text-[#5e7a76]">Intelligent Document & Personalized Learning Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#183237]">
          {/* Mission & Brand */}
          <div className="p-4 rounded-2xl bg-[#f0f7f5] border border-[#d2ebe5] space-y-1.5">
            <div className="text-xs font-bold text-[#1c4e48] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#3c8b7e]" />
              <span>Turn Your Documents Into Intelligence</span>
            </div>
            <p className="text-[#235850] text-xs leading-relaxed">
              Upload documents, understand knowledge, ask questions, compare information, and generate personalized learning material using AI.
            </p>
          </div>

          {/* Core Feature Suites */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-[#5e7a76] text-[11px]">Core Capabilities</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                <div className="font-bold text-[#1c4e48] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#3c8b7e]" />
                  <span>Multi-Doc RAG</span>
                </div>
                <p className="text-[#5e7a76] text-[11px] leading-relaxed">
                  Query one or multiple documents simultaneously with grounded citations.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                <div className="font-bold text-[#1c4e48] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#3c8b7e]" />
                  <span>Personalized Study</span>
                </div>
                <p className="text-[#5e7a76] text-[11px] leading-relaxed">
                  Generate MCQs, flashcards, viva questions, and exam revision notes with difficulty tiers.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                <div className="font-bold text-[#1c4e48] flex items-center gap-1.5">
                  <GitCompare className="w-3.5 h-3.5 text-[#3c8b7e]" />
                  <span>Cross-Doc Compare</span>
                </div>
                <p className="text-[#5e7a76] text-[11px] leading-relaxed">
                  Side-by-side matrices comparing Purpose, Methodology, Tech, and Results.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                <div className="font-bold text-[#1c4e48] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#3c8b7e]" />
                  <span>Knowledge Map</span>
                </div>
                <p className="text-[#5e7a76] text-[11px] leading-relaxed">
                  Hierarchical graph exploring entities, financial indicators, and core concepts.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                <div className="font-bold text-[#1c4e48] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#3c8b7e]" />
                  <span>Hybrid RAG Engine</span>
                </div>
                <p className="text-[#5e7a76] text-[11px] leading-relaxed">
                  Dual-pass retrieval combining dense neural embeddings with BM25 keyword matching.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                <div className="font-bold text-[#1c4e48] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#3c8b7e]" />
                  <span>Grounding Guardrails</span>
                </div>
                <p className="text-[#5e7a76] text-[11px] leading-relaxed">
                  Zero temperature synthesis guarantees answers are backed by verified source citations.
                </p>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-2 pt-2 border-t border-[#f0f4f3]">
            <h4 className="font-bold uppercase tracking-wider text-[#5e7a76] text-[11px]">Keyboard Shortcuts</h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f8fbfa] border border-[#e8efed]">
                <span className="text-[#5e7a76]">Upload Document</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#d4e0dd] font-mono text-[10px]">Ctrl + U</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f8fbfa] border border-[#e8efed]">
                <span className="text-[#5e7a76]">Send Question</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#d4e0dd] font-mono text-[10px]">Enter</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f8fbfa] border border-[#e8efed]">
                <span className="text-[#5e7a76]">New Line</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#d4e0dd] font-mono text-[10px]">Shift + Enter</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f8fbfa] border border-[#e8efed]">
                <span className="text-[#5e7a76]">Close Modals</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#d4e0dd] font-mono text-[10px]">Esc</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#f0f4f3] bg-[#fafcfb] flex items-center justify-between text-[11px] text-[#5e7a76] flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>DocuMind AI Architecture • Audited RAG System</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#1c4e48] text-white hover:bg-[#163d38] font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
