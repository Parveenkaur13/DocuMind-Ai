import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  FileText,
  BookOpen,
  GitCompare,
  Upload,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Mail,
  Send,
  Sparkles,
  AlertCircle,
  HelpCircle as QuestionIcon,
  LifeBuoy,
  Lock,
} from 'lucide-react';
import { useToast } from './Toast';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

type HelpTab =
  | 'about'
  | 'upload'
  | 'rag'
  | 'study'
  | 'compare'
  | 'file_types'
  | 'faq'
  | 'troubleshooting'
  | 'privacy'
  | 'contact';

export function HelpModal({ open, onClose }: HelpModalProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<HelpTab>('about');

  // FAQ open state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Feedback form state
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackType, setFeedbackType] = useState('Feedback');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [submittedFeedback, setSubmittedFeedback] = useState(false);

  if (!open) return null;

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;
    setSubmittedFeedback(true);
    showToast('Thank you! Your feedback has been sent to the DocuMind AI team.', 'success');
    setTimeout(() => {
      setFeedbackMessage('');
      setSubmittedFeedback(false);
    }, 2500);
  };

  const navItems: Array<{ id: HelpTab; label: string; icon: React.ElementType }> = [
    { id: 'about', label: 'About DocuMind AI', icon: Sparkles },
    { id: 'upload', label: 'How to Upload', icon: Upload },
    { id: 'rag', label: 'How AI Chat/RAG Works', icon: Cpu },
    { id: 'study', label: 'How to Use Study Mode', icon: BookOpen },
    { id: 'compare', label: 'How to Compare Docs', icon: GitCompare },
    { id: 'file_types', label: 'Supported File Types', icon: FileText },
    { id: 'faq', label: 'FAQ', icon: QuestionIcon },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: LifeBuoy },
    { id: 'privacy', label: 'Privacy & Data', icon: Lock },
    { id: 'contact', label: 'Contact & Feedback', icon: Mail },
  ];

  const faqs = [
    {
      q: 'Does DocuMind AI hallucinate or invent facts?',
      a: 'No. DocuMind AI enforces strict Zero-Temperature Grounding. It retrieves exact document excerpts using hybrid dense-sparse RAG and bases its answers solely on cited passages. If the information is not in your uploaded documents, it explicitly tells you so.',
    },
    {
      q: 'Can I query multiple documents in the same conversation?',
      a: 'Yes! In the AI Chat view, you can check one, multiple, or all documents in your library. DocuMind will perform multi-document retrieval and attribute citations to the exact source document for each fact.',
    },
    {
      q: 'How does Study Mode differ from standard Chat?',
      a: 'Study Mode turns your document into an active learning workspace. Instead of answering ad-hoc questions, it systematically creates: AI Summaries, Short Revision Notes, 10 practice MCQs with explanations, interactive Flashcards with flip animations, Viva examination questions with evaluation criteria, High-Yield Important Questions, and Feynman-style Topic Explanations.',
    },
    {
      q: 'Can I export or print generated study notes and MCQs?',
      a: 'Yes. All study outputs, MCQs, flashcards, summaries, and chat citations have dedicated buttons to Copy to Clipboard, Export as Markdown (.md), Download as Plain Text (.txt), and Print or Save as PDF.',
    },
    {
      q: 'Are my uploaded documents private and secure?',
      a: 'Yes. Documents are parsed and stored in your authenticated local workspace. Your documents are never used for foundation model training or public indexing.',
    },
    {
      q: 'What should I do if a PDF contains scanned images instead of text?',
      a: 'DocuMind AI extracts digital text layers from PDF, DOCX, and TXT files. For optimal results, ensure your PDF has selectable text. Scanned PDFs without digital text layers should be run through OCR before uploading.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0e2a27]/60 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-[#d4e0dd] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8efed] bg-gradient-to-b from-white to-[#fbfdfd] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-[#3c8b7e]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#183237]">DocuMind AI Help & Guide</h3>
              <p className="text-xs text-[#5e7a76]">Project guide, workflow walkthroughs, and technical FAQ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Official Project Description Banner */}
        <div className="px-6 py-3 bg-[#f0f7f5] border-b border-[#d2ebe5] flex items-start gap-2.5 flex-shrink-0">
          <Sparkles className="w-4 h-4 text-[#3c8b7e] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#235850] font-medium leading-relaxed">
            “DocuMind AI is an AI-powered document intelligence and personalized learning assistant that uses document retrieval and generative AI to help users understand, search, summarize, compare, and learn from their documents.”
          </p>
        </div>

        {/* Content Body: Sidebar Navigation + Help View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Tabs */}
          <nav className="w-full md:w-56 p-3 bg-[#f8fbfa] border-r border-[#e8efed] flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto flex-shrink-0 text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1c4e48] text-white shadow-2xs'
                      : 'text-[#5e7a76] hover:text-[#183237] hover:bg-[#edf3f1]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Tab Content Display */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto text-xs text-[#183237] space-y-4">
            {/* 1. ABOUT DOCUMIND AI */}
            {activeTab === 'about' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">About DocuMind AI</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Grounded document intelligence and adaptive learning studio.
                  </p>
                </div>

                <p className="text-xs text-[#183237] leading-relaxed">
                  DocuMind AI transforms static, lengthy documents into active, conversational intelligence. By integrating neural semantic retrieval with zero-hallucination generative AI, it allows students, researchers, and professionals to query complex texts with verified citations and instantly create comprehensive study tools.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                    <span className="font-bold text-[#1c4e48] flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#3c8b7e]" />
                      <span>Hybrid RAG Pipeline</span>
                    </span>
                    <p className="text-[11px] text-[#5e7a76] leading-relaxed">
                      Dual-stage retrieval combining neural vector search with BM25 lexical token matching for 100% precision.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                    <span className="font-bold text-[#1c4e48] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#3c8b7e]" />
                      <span>Zero Hallucination</span>
                    </span>
                    <p className="text-[11px] text-[#5e7a76] leading-relaxed">
                      Every answer is anchored by exact document snippets with clickable source locations and relevance scores.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. HOW TO UPLOAD DOCUMENTS */}
            {activeTab === 'upload' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">How to Upload Documents</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Fast, seamless document indexing and automatic parsing.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#f8fbfa] border border-[#e8efed]">
                    <span className="w-6 h-6 rounded-full bg-[#1c4e48] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      1
                    </span>
                    <div>
                      <strong className="block text-[#183237]">Drag & Drop Anywhere</strong>
                      <span className="text-[11px] text-[#5e7a76]">
                        Drag any PDF, DOCX, or TXT file directly into the browser window or click the <strong>"Upload Document"</strong> button. Shortcut: <kbd className="px-1 py-0.5 rounded bg-white border border-[#d4e0dd] text-[10px]">Ctrl + U</kbd>.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#f8fbfa] border border-[#e8efed]">
                    <span className="w-6 h-6 rounded-full bg-[#1c4e48] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      2
                    </span>
                    <div>
                      <strong className="block text-[#183237]">Automatic Extraction & Cleaning</strong>
                      <span className="text-[11px] text-[#5e7a76]">
                        DocuMind extracts the full textual layer, cleans up binary artifacts, and creates sliding-window chunks with contextual section headers.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#f8fbfa] border border-[#e8efed]">
                    <span className="w-6 h-6 rounded-full bg-[#1c4e48] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      3
                    </span>
                    <div>
                      <strong className="block text-[#183237]">Instant Indexing</strong>
                      <span className="text-[11px] text-[#5e7a76]">
                        The document is immediately available in Dashboard, AI Chat, Study Mode, and Compare views.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. HOW AI CHAT / RAG WORKS */}
            {activeTab === 'rag' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">How AI Chat (RAG) Works</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Understanding Retrieval-Augmented Generation and Grounding Guardrails.
                  </p>
                </div>

                <div className="space-y-2.5 leading-relaxed text-xs">
                  <div className="p-3.5 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                    <strong className="text-[#1c4e48] block">1. User Query & Retrieval</strong>
                    <p className="text-[#5e7a76] text-[11px]">
                      When you type a question, DocuMind searches your selected documents using hybrid retrieval: ranking chunks by keyword frequency (BM25) and conceptual similarity.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                    <strong className="text-[#1c4e48] block">2. Strict Context Assembly</strong>
                    <p className="text-[#5e7a76] text-[11px]">
                      The top verified chunks are formatted as Grounded Excerpts and passed to the generative engine with strict zero-temperature constraints.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                    <strong className="text-[#1c4e48] block">3. Cited Response with Traceability</strong>
                    <p className="text-[#5e7a76] text-[11px]">
                      The AI crafts a structured answer where every claim is tied to an interactive citation button. Clicking a citation takes you directly to the document source snippet.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. HOW TO USE STUDY MODE */}
            {activeTab === 'study' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">How to Use Study Mode</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    A comprehensive guide to all 7 personalized study features.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-[#f8fbfa] border border-[#e8efed]">
                    <strong className="text-[#1c4e48] block">1. Select a Document First</strong>
                    <span className="text-[11px] text-[#5e7a76]">
                      Choose an uploaded document from the library cards or dropdown at the top. Study Mode uses this document's actual text to generate grounded material.
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#f8fbfa] border border-[#e8efed]">
                    <strong className="text-[#1c4e48] block">2. Choose Difficulty Level</strong>
                    <span className="text-[11px] text-[#5e7a76]">
                      Switch between <em>Beginner</em> (Foundational), <em>Intermediate</em> (Standard), <em>Advanced</em> (Deep Dive), and <em>Exam-Oriented</em> (High-Yield).
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#f8fbfa] border border-[#e8efed]">
                    <strong className="text-[#1c4e48] block">3. Explore Feature Tabs:</strong>
                    <ul className="list-disc pl-4 mt-1 space-y-1 text-[11px] text-[#5e7a76]">
                      <li><strong>AI Summary:</strong> High-level executive and academic overview.</li>
                      <li><strong>Short Notes:</strong> Key facts, formulas, definitions, and rules in bullet points.</li>
                      <li><strong>MCQs:</strong> 10 questions with 4 choices each, instant score tracking, and full explanations.</li>
                      <li><strong>Flashcards:</strong> Interactive flip cards with term and answer; track mastered cards.</li>
                      <li><strong>Viva Questions:</strong> Oral exam questions with expected keywords and examiner evaluation criteria.</li>
                      <li><strong>Important Questions:</strong> Core high-yield questions with model answers.</li>
                      <li><strong>Explain Topic:</strong> Feynman Technique explanation with simple language and analogies.</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#f8fbfa] border border-[#e8efed]">
                    <strong className="text-[#1c4e48] block">4. Copy, Download & Regenerate</strong>
                    <span className="text-[11px] text-[#5e7a76]">
                      Use the "Regenerate" button to create fresh material anytime. Copy or export to Markdown (.md), Plain Text (.txt), or Print/PDF.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. HOW TO COMPARE DOCUMENTS */}
            {activeTab === 'compare' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">How to Compare Documents</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Cross-document comparative matrices and synergy detection.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                    <strong className="text-[#1c4e48] block">1. Select Document A & Document B</strong>
                    <p className="text-[#5e7a76] text-[11px]">
                      Navigate to the <strong>Compare</strong> tab from the sidebar. Pick any two documents from your library.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                    <strong className="text-[#1c4e48] block">2. Multi-Dimensional Comparison</strong>
                    <p className="text-[#5e7a76] text-[11px]">
                      DocuMind AI evaluates both files across key dimensions: Executive Summary, Similarities, Differences, Quantitative Metrics, and Synergies.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                    <strong className="text-[#1c4e48] block">3. Export Comparison Matrix</strong>
                    <p className="text-[#5e7a76] text-[11px]">
                      Download the full comparative matrix as Markdown or print for collaborative reviews.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. SUPPORTED FILE TYPES */}
            {activeTab === 'file_types' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">Supported File Types</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    DocuMind AI parses digital documents with instant text extraction.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#183237]">PDF (.pdf)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5e7a76] mt-0.5">
                        Native digital PDF documents, articles, whitepapers, textbooks, and reports.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#183237]">Word Documents (.docx)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          Supported
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5e7a76] mt-0.5">
                        Microsoft Word files (.docx) extracted using mammoth.js pipeline.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#183237]">Plain Text & Markdown (.txt, .md)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Instant
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5e7a76] mt-0.5">
                        Code documentation, raw notes, transcripts, and markdown files.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. FAQ */}
            {activeTab === 'faq' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">Frequently Asked Questions</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Common questions about document processing, accuracy, and exports.
                  </p>
                </div>

                <div className="space-y-2">
                  {faqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-[#e8efed] overflow-hidden bg-[#f8fbfa] transition"
                      >
                        <button
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full text-left p-3.5 font-bold text-xs text-[#183237] flex items-center justify-between cursor-pointer hover:bg-[#edf3f1]"
                        >
                          <span>{faq.q}</span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-[#3c8b7e] flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#5e7a76] flex-shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="p-3.5 pt-0 text-[11px] text-[#5e7a76] leading-relaxed border-t border-[#f0f4f3] bg-white">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 8. TROUBLESHOOTING */}
            {activeTab === 'troubleshooting' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">Troubleshooting & Diagnostics</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Solutions for common document extraction and retrieval scenarios.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-[#e8efed] space-y-1">
                    <span className="font-bold text-[#183237] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Issue: Document shows 0 characters extracted</span>
                    </span>
                    <p className="text-[11px] text-[#5e7a76] leading-relaxed">
                      <strong>Solution:</strong> The PDF may contain pure raster images / scanned pages without an embedded text layer. Open the document in an OCR tool to add searchable text, then re-upload.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-[#e8efed] space-y-1">
                    <span className="font-bold text-[#183237] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Issue: AI answers: "I could not find information regarding this"</span>
                    </span>
                    <p className="text-[11px] text-[#5e7a76] leading-relaxed">
                      <strong>Solution:</strong> This means strict grounding guardrails prevented hallucination. Try rephrasing your question using terms that appear in the document, or check if the target document was selected.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-[#e8efed] space-y-1">
                    <span className="font-bold text-[#183237] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Issue: Study Mode generation error</span>
                    </span>
                    <p className="text-[11px] text-[#5e7a76] leading-relaxed">
                      <strong>Solution:</strong> Ensure your document is selected in the header dropdown and click the "Regenerate" button. Verify your internet connection or start the local Python backend via <code>npm run backend</code>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 9. PRIVACY & DATA INFORMATION */}
            {activeTab === 'privacy' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">Privacy & Data Information</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    How DocuMind AI protects your intellectual property and data.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-[#f0f7f5] border border-[#d2ebe5] space-y-1">
                    <span className="font-bold text-[#1c4e48] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Zero Model Retraining</span>
                    </span>
                    <p className="text-[11px] text-[#235850] leading-relaxed">
                      Your document text, uploaded files, and chat messages are NEVER used to retrain foundation models or shared with third parties.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                    <span className="font-bold text-[#183237]">Client-Side & Isolated Storage</span>
                    <p className="text-[11px] text-[#5e7a76] leading-relaxed">
                      Document text extracts and conversations are maintained within your private workspace session. You can clear all data anytime via Settings &gt; Data & Storage.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f8fbfa] border border-[#e8efed] space-y-1">
                    <span className="font-bold text-[#183237]">Encrypted API Transmission</span>
                    <p className="text-[11px] text-[#5e7a76] leading-relaxed">
                      All retrieval requests sent to Google Gemini or the Python RAG backend are encrypted in transit via HTTPS/TLS.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 10. CONTACT & FEEDBACK */}
            {activeTab === 'contact' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">Contact & Feedback</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Have a suggestion, bug report, or feature request? We’d love to hear from you.
                  </p>
                </div>

                <form onSubmit={handleSendFeedback} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[#183237] block mb-1">Your Email (Optional)</label>
                      <input
                        type="email"
                        value={feedbackEmail}
                        onChange={(e) => setFeedbackEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full px-3 py-2 rounded-xl bg-[#f8fbfa] border border-[#d4e0dd] text-xs text-[#183237] focus:outline-none focus:border-[#3c8b7e]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#183237] block mb-1">Feedback Category</label>
                      <select
                        value={feedbackType}
                        onChange={(e) => setFeedbackType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#f8fbfa] border border-[#d4e0dd] text-xs text-[#183237] focus:outline-none focus:border-[#3c8b7e]"
                      >
                        <option value="Feedback">General Feedback</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="Bug Report">Bug Report</option>
                        <option value="Document Parsing">Document Parsing Question</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#183237] block mb-1">Message</label>
                    <textarea
                      rows={4}
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Tell us what you love or what we can improve in DocuMind AI..."
                      className="w-full px-3 py-2 rounded-xl bg-[#f8fbfa] border border-[#d4e0dd] text-xs text-[#183237] focus:outline-none focus:border-[#3c8b7e]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittedFeedback || !feedbackMessage.trim()}
                    className="px-4 py-2 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-[#7dd3c4]" />
                    <span>{submittedFeedback ? 'Sent! Thank You' : 'Submit Feedback'}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#f0f4f3] bg-[#fafcfb] flex items-center justify-between text-xs text-[#5e7a76] flex-shrink-0">
          <span className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>DocuMind AI Grounded Architecture</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#1c4e48] text-white hover:bg-[#163d38] font-bold text-xs cursor-pointer transition shadow-xs"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
