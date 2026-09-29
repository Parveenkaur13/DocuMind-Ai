import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  Sparkles,
  Upload,
  FileText,
  Search,
  CheckCircle2,
  ArrowRight,
  Database,
  Quote,
  ShieldCheck,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';

export function PipelineView() {
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [isSimulating, setIsSimulating] = useState(false);

  const steps = [
    {
      num: 1,
      title: 'UPLOAD',
      desc: 'User uploads PDF, DOCX, TXT, or CSV files directly into the workspace.',
      tech: 'PDF.js / Mammoth parser / CSV Formatter',
      icon: Upload,
    },
    {
      num: 2,
      title: 'TEXT EXTRACTION',
      desc: 'Extracts clean textual streams, strips control characters, and preserves document structure & page markers.',
      tech: 'DOM Text Normalization & Latin1 Fallback',
      icon: FileText,
    },
    {
      num: 3,
      title: 'CHUNKING',
      desc: 'Sliding window chunking with 700 characters length and 120 characters semantic overlap.',
      tech: 'Sliding Window Overlap Algorithm',
      icon: Layers,
    },
    {
      num: 4,
      title: 'EMBEDDING',
      desc: 'Converts semantic text segments into 3072-dimensional vector embeddings.',
      tech: 'Google Gemini embedding-001 API',
      icon: Cpu,
    },
    {
      num: 5,
      title: 'VECTOR DATABASE / INDEX',
      desc: 'Embeddings and metadata are cached locally with LRU and synced to Supabase vector storage.',
      tech: 'Supabase Vector / In-Memory Memory Cache',
      icon: Database,
    },
    {
      num: 6,
      title: 'SEMANTIC SEARCH',
      desc: 'Calculates cosine similarity combined with BM25 lexical keyword matching for hybrid retrieval.',
      tech: 'Hybrid Cosine Similarity + BM25 Lexical',
      icon: Search,
    },
    {
      num: 7,
      title: 'RELEVANT CONTEXT',
      desc: 'Top-k most relevant chunks are ranked, deduplicated, and formatted into clean XML context blocks.',
      tech: 'Context Synthesizer (<source id="...">)',
      icon: ShieldCheck,
    },
    {
      num: 8,
      title: 'LLM REASONING',
      desc: 'Query and verified context are evaluated by Google Gemini with temperature=0.0 for zero-hallucination grounding.',
      tech: 'Google Gemini 3.5 Flash (T=0.0)',
      icon: Sparkles,
    },
    {
      num: 9,
      title: 'GROUNDED ANSWER',
      desc: 'Factual response synthesized with strict grounding constraints in clean GitHub markdown.',
      tech: 'Deterministic Answer Formatter',
      icon: CheckCircle2,
    },
    {
      num: 10,
      title: 'SOURCE CITATIONS',
      desc: 'Exact document names, chunk indexes, and matching snippets attached for full auditability and trust.',
      tech: 'Audited Citation Attribution System',
      icon: Quote,
    },
  ];

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setActiveStep(0);

    let current = 0;
    const interval = setInterval(() => {
      current++;
      if (current >= steps.length) {
        clearInterval(interval);
        setIsSimulating(false);
      } else {
        setActiveStep(current);
      }
    }, 600);
  };

  const handleReset = () => {
    setActiveStep(-1);
    setIsSimulating(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fbfa] overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2ece9]">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5 text-[#3c8b7e]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#183237]">RAG Architecture & Pipeline</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e8f4f1] text-[#1c4e48] uppercase tracking-wider">
                10-Stage Flow
              </span>
            </div>
            <p className="text-xs text-[#5e7a76]">
              End-to-end trace of how DocuMind AI extracts, indexes, retrieves, and synthesizes grounded answers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeStep >= 0 && (
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-xl bg-white border border-[#d4e0dd] text-[#5e7a76] hover:text-[#183237] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Reset pipeline highlight"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="px-4 py-2 rounded-xl bg-[#1c4e48] text-white hover:bg-[#163d38] font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <Zap className="w-3.5 h-3.5 text-[#7dd3c4] animate-pulse" />
                <span>Simulating Pipeline Flow…</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-[#7dd3c4]" />
                <span>Simulate Live RAG Execution</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 10-Stage Pipeline Visual Grid (Section 11) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isActive = activeStep === idx;
          const isPassed = activeStep > idx;

          return (
            <div
              key={s.num}
              onClick={() => setActiveStep(idx)}
              className={`p-5 rounded-2xl bg-white border transition-all cursor-pointer shadow-2xs space-y-2 ${
                isActive
                  ? 'border-[#3c8b7e] ring-2 ring-[#3c8b7e]/30 bg-[#f0f7f5] scale-[1.01]'
                  : isPassed
                  ? 'border-emerald-300 bg-[#fbfdfc]'
                  : 'border-[#e2ece9] hover:border-[#3c8b7e]/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isActive
                        ? 'bg-[#1c4e48] text-white'
                        : isPassed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#e8f4f1] text-[#1c4e48]'
                    }`}
                  >
                    {s.num}
                  </div>
                  <h3 className="text-xs font-bold text-[#183237] tracking-wider uppercase">
                    {s.title}
                  </h3>
                </div>

                <div className="w-6 h-6 rounded-md bg-[#f8fbfa] border border-[#e8efed] flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-[#3c8b7e]" />
                </div>
              </div>

              <p className="text-xs text-[#5e7a76] leading-relaxed">{s.desc}</p>

              <div className="pt-2 border-t border-[#f4f7f6] flex items-center justify-between text-[10px]">
                <span className="font-mono text-[#1c4e48] font-semibold">{s.tech}</span>
                {isActive ? (
                  <span className="text-[#3c8b7e] font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-[#3c8b7e] animate-pulse" />
                    Executing
                  </span>
                ) : idx < steps.length - 1 ? (
                  <span className="flex items-center gap-1 text-[#5e7a76]">
                    <span>Step {idx + 2}</span>
                    <ArrowRight className="w-3 h-3 text-[#9bbcb6]" />
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Complete
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
