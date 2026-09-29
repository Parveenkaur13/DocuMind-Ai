import React, { useState } from 'react';
import {
  X,
  Sparkles,
  GitCompare,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Table,
  Copy,
  Check,
  Download,
  FileText,
} from 'lucide-react';
import type { DocItem } from './Sidebar';
import { compareDocumentsAI, type DocumentComparisonResult } from '../lib/ai';
import { useToast } from './Toast';

interface DocumentComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocItem[];
  initialDocAId?: string;
  initialDocBId?: string;
}

export function DocumentComparisonModal({
  isOpen,
  onClose,
  documents,
  initialDocAId,
  initialDocBId,
}: DocumentComparisonModalProps) {
  const { showToast } = useToast();

  const [docAId, setDocAId] = useState<string>(
    initialDocAId || (documents[0]?.id ?? '')
  );
  const [docBId, setDocBId] = useState<string>(
    initialDocBId || (documents[1]?.id ?? (documents[0]?.id ?? ''))
  );

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DocumentComparisonResult | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const docA = documents.find((d) => d.id === docAId);
  const docB = documents.find((d) => d.id === docBId);

  const handleRunComparison = async () => {
    if (!docA || !docB) {
      showToast('Please select two documents to compare', 'error');
      return;
    }
    if (docA.id === docB.id) {
      showToast('Please select two distinct documents for comparative analysis', 'info');
      return;
    }

    setBusy(true);
    setResult(null);

    try {
      const res = await compareDocumentsAI(
        { name: docA.name, text: docA.extracted_text || '' },
        { name: docB.name, text: docB.extracted_text || '' }
      );
      setResult(res);
      showToast('Comparative analysis synthesized successfully', 'success');
    } catch {
      showToast('Failed to run comparative analysis. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!result || !docA || !docB) return;
    const md = `# Cross-Document Intelligence Report
**Document A:** ${docA.name}  
**Document B:** ${docB.name}  
**Generated:** ${new Date().toLocaleString()}

---

## Strategic Synthesis
${result.summary}

## Key Metrics Comparison
| Metric | ${docA.name} | ${docB.name} |
|---|---|---|
${result.keyMetricsComparison.map((m) => `| ${m.metric} | ${m.docAValue} | ${m.docBValue} |`).join('\n')}

## Core Alignments & Similarities
${result.similarities.map((s) => `- ${s}`).join('\n')}

## Critical Divergences & Differences
${result.differences.map((d) => `- ${d}`).join('\n')}

## Strategic Synergies & Next Steps
${result.synergies.map((syn) => `- ${syn}`).join('\n')}
`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    showToast('Comparison report copied as Markdown', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result || !docA || !docB) return;
    const md = `# Cross-Document Intelligence Report
**Document A:** ${docA.name}  
**Document B:** ${docB.name}  
**Generated:** ${new Date().toLocaleString()}

---

## Strategic Synthesis
${result.summary}

## Key Metrics Comparison
| Metric | ${docA.name} | ${docB.name} |
|---|---|---|
${result.keyMetricsComparison.map((m) => `| ${m.metric} | ${m.docAValue} | ${m.docBValue} |`).join('\n')}

## Core Alignments & Similarities
${result.similarities.map((s) => `- ${s}`).join('\n')}

## Critical Divergences & Differences
${result.differences.map((d) => `- ${d}`).join('\n')}

## Strategic Synergies & Next Steps
${result.synergies.map((syn) => `- ${syn}`).join('\n')}
`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DocuMind_Comparison_${docA.name.slice(0, 10)}_vs_${docB.name.slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded comparison report', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#d4e0dd] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-[#e2ece9] flex items-center justify-between bg-gradient-to-r from-[#1c4e48] to-[#25635b] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <GitCompare className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-base flex items-center gap-2">
                Cross-Document Intelligence Studio
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  AI Comparison
                </span>
              </h2>
              <p className="text-xs text-[#b8d6d0]">
                Synthesize synergies, structural differences, and metric alignments between documents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Selection Strip */}
        <div className="px-6 py-4 border-b border-[#e2ece9] bg-[#f8fbfa] grid sm:grid-cols-2 gap-4 items-center">
          {/* Doc A */}
          <div>
            <label className="block text-xs font-bold text-[#1c4e48] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#3c8b7e]" />
              Document A (Baseline)
            </label>
            <select
              value={docAId}
              onChange={(e) => setDocAId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-[#d4e0dd] focus:outline-none focus:ring-2 focus:ring-[#3c8b7e] text-[#183237]"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({Math.round(d.file_size / 1024)} KB)
                </option>
              ))}
            </select>
          </div>

          {/* Doc B */}
          <div>
            <label className="block text-xs font-bold text-[#1c4e48] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#3c8b7e]" />
              Document B (Target)
            </label>
            <select
              value={docBId}
              onChange={(e) => setDocBId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-[#d4e0dd] focus:outline-none focus:ring-2 focus:ring-[#3c8b7e] text-[#183237]"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({Math.round(d.file_size / 1024)} KB)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Trigger */}
        <div className="px-6 py-3 bg-white border-b border-[#e2ece9] flex items-center justify-between">
          <p className="text-xs text-[#5e7a76]">
            {docA && docB && docA.id !== docB.id
              ? `Ready to analyze "${docA.name}" vs "${docB.name}"`
              : 'Select two distinct documents above to begin'}
          </p>
          <div className="flex items-center gap-2">
            {result && (
              <>
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="px-3 py-1.5 rounded-xl border border-[#d4e0dd] hover:bg-[#f0f6f4] text-xs font-semibold text-[#183237] transition flex items-center gap-1.5 cursor-pointer"
                  title="Copy as Markdown"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl border border-[#d4e0dd] hover:bg-[#f0f6f4] text-xs font-semibold text-[#183237] transition flex items-center gap-1.5 cursor-pointer"
                  title="Download Report"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleRunComparison}
              disabled={busy || !docA || !docB || docA.id === docB.id}
              className="px-4 py-2 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] active:bg-[#11312d] text-white text-xs font-bold transition disabled:opacity-40 flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Synthesizing Intelligence…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>Run Comparison</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {busy && (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#e8f4f1] border border-[#d2ebe5] flex items-center justify-center mx-auto text-[#1c4e48] animate-pulse">
                <GitCompare className="w-6 h-6 text-[#3c8b7e]" />
              </div>
              <h4 className="text-sm font-bold text-[#183237]">DocuMind AI Deep Comparative Engine</h4>
              <p className="text-xs text-[#5e7a76] max-w-sm mx-auto">
                Comparing semantic vectors, cross-referencing metrics, and generating strategic alignments…
              </p>
            </div>
          )}

          {!busy && !result && (
            <div className="py-14 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#f0f6f4] border border-[#d4e0dd] flex items-center justify-center mx-auto text-[#5e7a76]">
                <GitCompare className="w-7 h-7 text-[#3c8b7e]" />
              </div>
              <h3 className="text-sm font-bold text-[#183237]">Deep Multi-Document Intelligence</h3>
              <p className="text-xs text-[#5e7a76] max-w-md mx-auto leading-relaxed">
                Compare project briefs against requirements, contracts against compliance checklists, or historical financials against forward-looking roadmaps.
              </p>
              <button
                type="button"
                onClick={handleRunComparison}
                disabled={!docA || !docB || docA.id === docB.id}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1c4e48] text-white text-xs font-semibold hover:bg-[#163d38] transition cursor-pointer"
              >
                <span>Compare Selected Files</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!busy && result && (
            <div className="space-y-6 animate-fade-in">
              {/* Executive Synthesis */}
              <div className="p-4.5 rounded-2xl bg-gradient-to-br from-[#f0f7f5] to-[#e4f1ed] border border-[#cbe2dc] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1c4e48] uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-[#3c8b7e]" />
                  <span>Strategic Executive Synthesis</span>
                </div>
                <p className="text-xs text-[#183237] leading-relaxed font-medium">
                  {result.summary}
                </p>
              </div>

              {/* Side-by-Side Key Metrics Table */}
              {result.keyMetricsComparison && result.keyMetricsComparison.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#183237] uppercase tracking-wider">
                    <Table className="w-4 h-4 text-[#3c8b7e]" />
                    <span>Side-by-Side Metric Comparison</span>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-[#e2ece9] shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f8fbfa] border-b border-[#e2ece9] text-[#1c4e48] font-bold">
                        <tr>
                          <th className="py-2.5 px-4 w-1/3">Metric / Scope</th>
                          <th className="py-2.5 px-4 w-1/3 truncate text-[#1c4e48]">{docA?.name}</th>
                          <th className="py-2.5 px-4 w-1/3 truncate text-[#25635b]">{docB?.name}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f4f3] bg-white">
                        {result.keyMetricsComparison.map((m, idx) => (
                          <tr key={idx} className="hover:bg-[#fbfdfd] transition">
                            <td className="py-2.5 px-4 font-semibold text-[#183237]">{m.metric}</td>
                            <td className="py-2.5 px-4 text-[#43645f]">{m.docAValue}</td>
                            <td className="py-2.5 px-4 text-[#43645f]">{m.docBValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Two Column Alignments & Divergences */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Similarities */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Core Alignments ({result.similarities.length})</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#2b4d45]">
                    {result.similarities.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Differences */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Critical Divergences ({result.differences.length})</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#5e4b2d]">
                    {result.differences.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Synergies */}
              {result.synergies && result.synergies.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#f0f6f4] border border-[#d2ebe5] space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1c4e48] uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4 text-[#3c8b7e]" />
                    <span>Strategic Synergies & Next Steps</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#28504b]">
                    {result.synergies.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#3c8b7e] font-bold">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
