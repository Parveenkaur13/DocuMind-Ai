import React, { useState } from 'react';
import {
  GitCompare,
  Sparkles,
  ArrowRight,
  Download,
  Printer,
  Table,
  CheckCircle2,
  TrendingUp,
  FileText,
  Loader2,
  Copy,
  Info,
  Check,
} from 'lucide-react';
import type { DocItem } from './Sidebar';
import { compareDocumentsAI, type DocumentComparisonResult } from '../lib/ai';
import { useToast } from './Toast';
import { exportToMarkdown, exportToPrint, exportToTxt } from '../lib/export';

interface CompareViewProps {
  documents: DocItem[];
  initialDocAId?: string;
  initialDocBId?: string;
  onNavigateToChat: () => void;
  onOpenUpload?: () => void;
}

export function CompareView({
  documents,
  initialDocAId,
  initialDocBId,
  onNavigateToChat,
  onOpenUpload,
}: CompareViewProps) {
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
      showToast('Comparative analysis generated successfully', 'success');
    } catch {
      showToast('Failed to complete comparative analysis', 'error');
    } finally {
      setBusy(false);
    }
  };

  const generateMarkdown = () => {
    if (!result || !docA || !docB) return '';
    const title = `Document Comparison - ${docA.name} vs ${docB.name}`;
    let md = `# ${title}\n\n`;
    md += `## Executive Summary\n${result.summary}\n\n`;
    md += `## Structured Comparison Dimensions\n\n`;
    md += `| Dimension | ${docA.name} | ${docB.name} | Comparative Synthesis |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    (result.dimensions || []).forEach((dim) => {
      md += `| **${dim.dimension}** | ${dim.docA} | ${dim.docB} | ${dim.analysis || 'N/A'} |\n`;
    });
    md += `\n## Key Similarities\n` + result.similarities.map((s) => `- ${s}`).join('\n') + `\n\n`;
    md += `## Key Differences\n` + result.differences.map((d) => `- ${d}`).join('\n') + `\n\n`;
    md += `## Synergies & Implications\n` + result.synergies.map((s) => `- ${s}`).join('\n');
    return md;
  };

  const handleExport = (format: 'md' | 'txt' | 'print') => {
    if (!result || !docA || !docB) return;
    const title = `Document Comparison - ${docA.name} vs ${docB.name}`;
    const md = generateMarkdown();

    if (format === 'md') exportToMarkdown(title, md);
    else if (format === 'txt') exportToTxt(title, md);
    else exportToPrint(title, md);
  };

  const handleCopy = async () => {
    const md = generateMarkdown();
    if (!md) return;
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      showToast('Comparison copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fbfa] overflow-hidden">
      {/* Top Header */}
      <div className="p-4 sm:p-6 bg-white border-b border-[#e2ece9] flex-shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center font-bold">
              <GitCompare className="w-5 h-5 text-[#3c8b7e]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#183237]">Cross-Document Intelligence Comparison</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e8f4f1] text-[#1c4e48] uppercase tracking-wider">
                  Multi-Doc RAG
                </span>
              </div>
              <p className="text-xs text-[#5e7a76]">
                Compare methodology, technologies, datasets, algorithms, and results in a structured matrix.
              </p>
            </div>
          </div>

          {result && (
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#d4e0dd] hover:border-[#3c8b7e] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Copy comparison to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#3c8b7e]" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleExport('md')}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#d4e0dd] hover:border-[#3c8b7e] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#3c8b7e]" />
                <span>Export Markdown</span>
              </button>
              <button
                onClick={() => handleExport('print')}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#d4e0dd] hover:border-[#3c8b7e] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#3c8b7e]" />
                <span>Print / PDF</span>
              </button>
              <button
                onClick={onNavigateToChat}
                className="px-3 py-1.5 rounded-xl bg-[#e8f4f1] hover:bg-[#d8ece8] border border-[#c5e1da] text-[#1c4e48] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Discuss comparison in Chat"
              >
                <span>Discuss in Chat</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#1c4e48]" />
              </button>
            </div>
          )}
        </div>

        {/* Document Selection & Run Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2">
          {/* Document A */}
          <div className="sm:col-span-5 bg-[#f8fbfa] p-3 rounded-2xl border border-[#d4e0dd]">
            <label className="text-[11px] font-bold text-[#5e7a76] uppercase tracking-wider block mb-1.5">
              Document A (Baseline)
            </label>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#3c8b7e] flex-shrink-0" />
              <select
                value={docAId}
                onChange={(e) => setDocAId(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-[#183237] focus:outline-none cursor-pointer"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* VS Divider & Action */}
          <div className="sm:col-span-2 flex flex-col items-center justify-center">
            <button
              onClick={handleRunComparison}
              disabled={busy || !docA || !docB}
              className="w-full py-2.5 px-3 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {busy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7dd3c4]" />
                  <span>Synthesizing…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#7dd3c4]" />
                  <span>Compare</span>
                </>
              )}
            </button>
          </div>

          {/* Document B */}
          <div className="sm:col-span-5 bg-[#f8fbfa] p-3 rounded-2xl border border-[#d4e0dd]">
            <label className="text-[11px] font-bold text-[#5e7a76] uppercase tracking-wider block mb-1.5">
              Document B (Comparison Target)
            </label>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#3c8b7e] flex-shrink-0" />
              <select
                value={docBId}
                onChange={(e) => setDocBId(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-[#183237] focus:outline-none cursor-pointer"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Comparison Results View */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {documents.length < 2 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#e2ece9] max-w-lg mx-auto space-y-4 my-8">
            <div className="w-14 h-14 rounded-2xl bg-[#e8f4f1] text-[#3c8b7e] flex items-center justify-center mx-auto">
              <Info className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#183237]">At Least Two Documents Required</h3>
              <p className="text-xs text-[#5e7a76] leading-relaxed">
                Comparative analysis synthesizes methodologies, datasets, algorithms, and results between two distinct documents. Please upload at least one more document to begin.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              {onOpenUpload && (
                <button
                  onClick={onOpenUpload}
                  className="px-4 py-2 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] text-white text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Upload Documents</span>
                </button>
              )}
              <button
                onClick={onNavigateToChat}
                className="px-4 py-2 rounded-xl bg-[#f0f7f5] hover:bg-[#e2ece9] text-[#1c4e48] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Return to Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : !result && !busy ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#e2ece9] max-w-lg mx-auto space-y-3 my-8">
            <div className="w-14 h-14 rounded-2xl bg-[#e8f4f1] text-[#3c8b7e] flex items-center justify-center mx-auto">
              <GitCompare className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-[#183237]">Ready to Compare Documents</h3>
            <p className="text-xs text-[#5e7a76] leading-relaxed">
              Select two documents above and click <strong>Compare</strong> to generate an exhaustive side-by-side breakdown of Purpose, Methodology, Technologies, Dataset, Algorithms, and Results.
            </p>
            {docAId === docBId && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 py-2 px-3 rounded-xl mt-2 max-w-md mx-auto">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Please select two distinct documents above to compare them.</span>
              </div>
            )}
          </div>
        ) : null}

        {busy && (
          <div className="p-16 text-center bg-white rounded-3xl border border-[#e2ece9] shadow-sm max-w-lg mx-auto space-y-4 my-8">
            <Loader2 className="w-10 h-10 text-[#3c8b7e] animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#183237]">Analyzing Cross-Document Intelligence…</h3>
              <p className="text-xs text-[#5e7a76]">
                Extracting semantic chunks and comparing structured dimensions across both files.
              </p>
            </div>
          </div>
        )}

        {result && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Executive Comparative Summary */}
            <div className="p-6 rounded-2xl bg-white border border-[#e2ece9] shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-[#1c4e48]">
                <Sparkles className="w-4 h-4 text-[#3c8b7e]" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Comparative Executive Summary</h2>
              </div>
              <p className="text-sm text-[#183237] leading-relaxed bg-[#f8fbfa] p-4 rounded-xl border border-[#e8efed]">
                {result.summary}
              </p>
            </div>

            {/* SECTION 8: Clean Structured Comparison Table */}
            {result.dimensions && result.dimensions.length > 0 && (
              <div className="rounded-2xl bg-white border border-[#e2ece9] shadow-2xs overflow-hidden space-y-0">
                <div className="p-4 sm:p-5 bg-gradient-to-r from-[#f8fbfa] to-[#f0f7f5] border-b border-[#e2ece9] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-[#3c8b7e]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1c4e48]">
                      Structured Comparison Dimensions
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-[#5e7a76]">9 Core Dimensions Analyzed</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f0f7f5] border-b border-[#e2ece9] text-[#1c4e48] font-bold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4 w-36">Dimension</th>
                        <th className="py-3 px-4 w-1/3">{docA?.name || 'Document A'}</th>
                        <th className="py-3 px-4 w-1/3">{docB?.name || 'Document B'}</th>
                        <th className="py-3 px-4">Comparative Synthesis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f4f3]">
                      {result.dimensions.map((dim, idx) => (
                        <tr key={idx} className="hover:bg-[#f8fbfa] transition">
                          <td className="py-3.5 px-4 font-bold text-[#1c4e48] bg-[#fafcfb] whitespace-nowrap">
                            {dim.dimension}
                          </td>
                          <td className="py-3.5 px-4 text-[#183237] leading-relaxed">
                            {dim.docA || 'Not explicitly detailed in document.'}
                          </td>
                          <td className="py-3.5 px-4 text-[#183237] leading-relaxed">
                            {dim.docB || 'Not explicitly detailed in document.'}
                          </td>
                          <td className="py-3.5 px-4 text-[#5e7a76] italic bg-[#fafcfb] leading-relaxed">
                            {dim.analysis || 'Aligned.'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Similarities & Differences Two-Column Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Similarities */}
              <div className="p-5 rounded-2xl bg-white border border-[#e2ece9] shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Key Similarities & Alignments</h3>
                </div>
                <ul className="space-y-2 text-xs text-[#183237]">
                  {result.similarities.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#f8fbfa]">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Differences */}
              <div className="p-5 rounded-2xl bg-white border border-[#e2ece9] shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-[#1c4e48]">
                  <TrendingUp className="w-4 h-4 text-[#3c8b7e]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Key Differences & Gaps</h3>
                </div>
                <ul className="space-y-2 text-xs text-[#183237]">
                  {result.differences.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#f8fbfa]">
                      <span className="text-[#3c8b7e] font-bold">•</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Synergies Card */}
            {result.synergies && result.synergies.length > 0 && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#f0f7f5] to-[#e8f4f1] border border-[#d2ebe5] shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-[#1c4e48]">
                  <Sparkles className="w-4 h-4 text-[#3c8b7e]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Strategic Synergies & Implications</h3>
                </div>
                <div className="space-y-2 text-xs text-[#1c4e48]">
                  {result.synergies.map((item, i) => (
                    <p key={i} className="leading-relaxed">
                      • {item}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Discuss in Chat CTA */}
            <div className="p-4 rounded-2xl bg-white border border-[#e2ece9] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e8f4f1] flex items-center justify-center text-[#1c4e48]">
                  <Sparkles className="w-4 h-4 text-[#3c8b7e]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#183237]">Have specific questions about this comparison?</p>
                  <p className="text-[11px] text-[#5e7a76]">Continue the conversation with AI in your workspace chat.</p>
                </div>
              </div>
              <button
                onClick={onNavigateToChat}
                className="px-4 py-2 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Continue to Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
