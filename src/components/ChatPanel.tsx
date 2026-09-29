import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  FileText,
  Loader2,
  MessageSquare,
  Quote,
  Copy,
  Check,
  X,
  PlusCircle,
  Search,
  Download,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Target,
  BookOpen,
  Cpu,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Trash2,
  Share2,
  FileCheck,
  GitCompare,
} from 'lucide-react';
import { askDocuMind, type Citation, type AIMode } from '../lib/ai';
import type { DocItem, ConvItem } from './Sidebar';
import { MarkdownContent } from './MarkdownContent';
import { useToast } from './Toast';
import { exportAsMarkdown, exportAsPlainText, exportAsPrintableReport } from '../lib/export';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  created_at: string;
  modelUsed?: string;
  quotaExceeded?: boolean;
  latencyMs?: number;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (msg: ChatMessage) => Promise<void> | void;
  documents: DocItem[];
  selectedDocId: string | null;
  selectedDocIds?: string[];
  onClearSelectedDocIds?: () => void;
  onToggleSelectDocId?: (id: string) => void;
  onSelectDoc: (id: string | null) => void;
  onSelectCitation?: (docId: string, snippet: string) => void;
  conversationTitle: string;
  conversations?: ConvItem[];
  activeConvId?: string | null;
  onSelectConv?: (id: string) => void;
  onNewConversation?: () => void;
  onDeleteConv?: (id: string) => void;
  onUploadClick?: () => void;
  onOpenStudyModal?: (doc: DocItem) => void;
  onOpenCompare?: () => void;
}

const REASONING_STEPS = [
  'Analyzing query semantics & identifying key terms…',
  'Performing hybrid vector & BM25 passage retrieval…',
  'Validating citation grounds with zero-hallucination guardrails…',
  'Synthesizing grounded multi-document response…',
];

export function ChatPanel({
  messages,
  onSendMessage,
  documents,
  selectedDocId,
  selectedDocIds = [],
  onClearSelectedDocIds,
  onToggleSelectDocId,
  onSelectDoc,
  onSelectCitation,
  conversationTitle,
  conversations = [],
  activeConvId,
  onSelectConv,
  onNewConversation,
  onDeleteConv,
  onUploadClick,
  onOpenStudyModal,
  onOpenCompare,
}: ChatPanelProps) {
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>('grounded');
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [reasoningStep, setReasoningStep] = useState(0);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [showConvPicker, setShowConvPicker] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);

  // Reasoning progress step cycler
  useEffect(() => {
    if (!busy) {
      setReasoningStep(0);
      return;
    }
    const interval = setInterval(() => {
      setReasoningStep((prev) => (prev + 1) % REASONING_STEPS.length);
    }, 1000);
    return () => clearInterval(interval);
  }, [busy]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
  };

  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, busy]);

  // Web Speech API Voice Dictation
  const toggleVoiceInput = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('Voice input is supported in Google Chrome, Edge, and Safari.', 'info');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Listening… Speak your question now', 'info');
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => r[0].transcript)
          .join('');
        setInput(transcript);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Web Speech API Text-to-Speech
  const handleToggleSpeak = (msgId: string, content: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast('Text-to-speech is not supported in this browser.', 'info');
      return;
    }

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = content
      .replace(/[*#`_>[\]()]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    window.speechSynthesis.speak(utterance);
    setSpeakingId(msgId);
    showToast('Reading response aloud…', 'info');
  };

  // Determine active target documents
  const docsToSearch = (selectedDocIds && selectedDocIds.length > 0)
    ? documents.filter((d) => selectedDocIds.includes(d.id))
    : selectedDocId
    ? documents.filter((d) => d.id === selectedDocId)
    : documents;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      citations: [],
      created_at: new Date().toISOString(),
    };

    // 1. Post user question immediately
    await onSendMessage(userMsg);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const history = [
        ...messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: trimmed },
      ];

      const result = await askDocuMind(
        trimmed,
        docsToSearch.map((d) => ({ id: d.id, name: d.name, extracted_text: d.extracted_text })),
        {
          history,
          mode: aiMode,
        },
      );

      // 2. Post grounded assistant answer
      await onSendMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer,
        citations: result.citations,
        created_at: new Date().toISOString(),
        modelUsed: result.model,
        quotaExceeded: result.quotaExceeded,
        latencyMs: result.latencyMs,
      });
    } catch {
      await onSendMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I couldn't find enough information in the selected documents to answer this question.",
        citations: [],
        created_at: new Date().toISOString(),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    if (busy || messages.length < 2) return;
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        const lastQuestion = messages[i].content;
        await send(lastQuestion);
        break;
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportAnswer = (content: string, format: 'md' | 'txt' | 'print') => {
    const title = `DocuMind_Answer_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'md') exportAsMarkdown(title, content);
    else if (format === 'txt') exportAsPlainText(title, content);
    else exportAsPrintableReport(title, content);
    showToast(`Exported answer as ${format.toUpperCase()}`, 'success');
  };

  const handleExportChat = (format: 'md' | 'txt' | 'print') => {
    if (!messages.length) {
      showToast('No messages to export', 'info');
      return;
    }
    const formatted = messages
      .map(
        (m) =>
          `### ${m.role === 'user' ? '👤 User' : '🤖 DocuMind AI'}\n*${new Date(m.created_at).toLocaleString()}*\n\n${m.content}\n\n${
            m.citations && m.citations.length > 0
              ? `**Sources:**\n${m.citations.map((c) => `- ${c.document_name}: "${c.snippet}"`).join('\n')}\n\n`
              : ''
          }---`,
      )
      .join('\n\n');

    const title = conversationTitle || 'DocuMind_Chat_Session';
    if (format === 'md') exportAsMarkdown(title, `# ${title}\n\n${formatted}`);
    else if (format === 'txt') exportAsPlainText(title, formatted);
    else exportAsPrintableReport(title, formatted);
    showToast(`Exported conversation as ${format.toUpperCase()}`, 'success');
  };

  const activeDoc = selectedDocId ? documents.find((d) => d.id === selectedDocId) : null;

  // Dynamic contextual starter suggestions
  const suggestions = docsToSearch.length > 1
    ? [
        `Compare the methodology and findings across these ${docsToSearch.length} documents`,
        `What are the common topics and strategic themes across these files?`,
        `Summarize the important differences and contrasting points`,
        `Extract all key metrics, deadlines, and dates from these documents`,
      ]
    : activeDoc
    ? [
        `Summarize the key takeaways of ${activeDoc.name}`,
        `What are the main metrics, methodologies, and findings?`,
        `Extract actionable requirements and conclusions`,
        `Explain the core concepts of this document for a beginner`,
      ]
    : [
        'Summarize the primary objectives across all uploaded documents',
        'Compare the key findings and conclusions in our knowledge base',
        'What critical metrics, dates, and deadlines are specified?',
        'Extract important technical definitions and formulas',
      ];

  const answerModes: Array<{ id: AIMode; label: string; icon: React.ElementType; tip: string }> = [
    { id: 'grounded', label: 'Grounded', icon: Target, tip: 'Strict zero-hallucination facts with citations' },
    { id: 'simple', label: 'Simple', icon: Sparkles, tip: 'Explain simply in plain English (ELI5)' },
    { id: 'student', label: 'Student', icon: BookOpen, tip: 'Pedagogical explanations with study context' },
    { id: 'technical', label: 'Technical', icon: Cpu, tip: 'Deep architectural and engineering detail' },
    { id: 'detailed', label: 'Detailed', icon: FileCheck, tip: 'Comprehensive executive analysis' },
    { id: 'exam_oriented', label: 'Exam-Oriented', icon: BookOpen, tip: 'Key viva points and exam answer structure' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#f4f7f7] min-w-0 relative h-full">
      {/* Top Header Bar (Clean, Uncluttered, Professional) */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#e2ece9] bg-white flex items-center justify-between gap-3 shadow-2xs z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#e8f4f1] border border-[#d2ebe5] flex items-center justify-center text-[#1c4e48] flex-shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-[#183237] truncate" title={conversationTitle}>
                {conversationTitle}
              </h2>

              {conversations.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setShowConvPicker((prev) => !prev)}
                    className="p-1 rounded text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3] transition cursor-pointer"
                    title="Switch conversation"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {showConvPicker && (
                    <div className="absolute left-0 mt-1 w-64 bg-white border border-[#d2ebe5] rounded-xl shadow-lg p-1.5 z-30">
                      <div className="text-[10px] font-bold text-[#5e7a76] px-2 py-1 uppercase">Chat History</div>
                      <div className="max-h-56 overflow-y-auto space-y-0.5">
                        {conversations.map((c) => (
                          <div
                            key={c.id}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                              c.id === activeConvId ? 'bg-[#e8f4f1] text-[#1c4e48] font-semibold' : 'hover:bg-[#f4f7f7] text-[#183237]'
                            }`}
                          >
                            <button
                              onClick={() => {
                                onSelectConv?.(c.id);
                                setShowConvPicker(false);
                              }}
                              className="flex-1 text-left truncate cursor-pointer"
                            >
                              {c.title}
                            </button>
                            {onDeleteConv && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteConv(c.id);
                                }}
                                className="text-[#9bbcb6] hover:text-red-600 p-1 transition cursor-pointer"
                                title="Delete chat"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scope / Multi-Document RAG Target Indicator */}
            <div className="flex items-center gap-2 text-xs text-[#5e7a76] mt-0.5">
              {docsToSearch.length > 1 ? (
                <div className="flex items-center gap-1.5 font-medium text-[#1c4e48]">
                  <span className="text-[11px] text-[#5e7a76]">RAG Scope:</span>
                  <span className="font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-1 text-[11px]">
                    <FileText className="w-3 h-3 text-[#3c8b7e] flex-shrink-0" />
                    {docsToSearch.length} documents selected
                    {selectedDocIds.length > 0 && onClearSelectedDocIds && (
                      <button
                        onClick={onClearSelectedDocIds}
                        className="ml-1 hover:text-red-600 transition cursor-pointer"
                        title="Clear multi-doc selection"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                </div>
              ) : activeDoc ? (
                <div className="flex items-center gap-1.5 font-medium text-[#1c4e48]">
                  <span className="text-[11px] text-[#5e7a76]">Single Document:</span>
                  <span className="font-semibold px-2 py-0.5 rounded-md bg-[#e8f4f1] border border-[#d2ebe5] flex items-center gap-1 text-[11px] truncate max-w-[200px]">
                    <FileText className="w-3 h-3 text-[#3c8b7e] flex-shrink-0" />
                    {activeDoc.name}
                    <button
                      onClick={() => onSelectDoc(null)}
                      className="ml-1 hover:text-red-600 transition cursor-pointer"
                      title="Clear scope"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              ) : (
                <span className="text-[11px]">
                  Searching all {documents.length} document{documents.length !== 1 ? 's' : ''} in library
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Multi-Document Scope Selector Dropdown */}
          {documents.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowDocPicker((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                  selectedDocIds.length > 0
                    ? 'border-[#3c8b7e] bg-[#e8f4f1] text-[#1c4e48]'
                    : 'border-[#d4e0dd] hover:border-[#9bbcb6] bg-white text-[#5e7a76] hover:text-[#183237]'
                }`}
                title="Select specific documents for Multi-Document RAG"
              >
                <FileText className="w-3.5 h-3.5 text-[#3c8b7e]" />
                <span className="hidden sm:inline">Select Docs</span>
                <span className="text-[10px] bg-[#1c4e48] text-white px-1.5 py-0.2 rounded-full font-bold">
                  {docsToSearch.length}
                </span>
              </button>

              {showDocPicker && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-[#d2ebe5] rounded-xl shadow-xl p-2 z-30 animate-fade-in">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#e8f0ee]">
                    <span className="text-xs font-bold text-[#183237]">Target Documents for RAG</span>
                    {selectedDocIds.length > 0 && onClearSelectedDocIds && (
                      <button
                        onClick={onClearSelectedDocIds}
                        className="text-[11px] text-[#3c8b7e] hover:underline cursor-pointer"
                      >
                        Reset to all
                      </button>
                    )}
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {documents.map((d) => {
                      const isChecked = selectedDocIds.includes(d.id) || (selectedDocIds.length === 0 && selectedDocId === d.id);
                      return (
                        <label
                          key={d.id}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#f4f7f7] cursor-pointer text-xs text-[#183237]"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleSelectDocId?.(d.id)}
                            className="rounded text-[#1c4e48] focus:ring-[#3c8b7e]"
                          />
                          <span className="truncate flex-1 font-medium">{d.name}</span>
                          <span className="text-[10px] uppercase font-bold text-[#5e7a76]">{d.file_type}</span>
                          {onOpenStudyModal && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowDocPicker(false);
                                onOpenStudyModal(d);
                              }}
                              className="text-[#5e7a76] hover:text-[#1c4e48] p-1 rounded hover:bg-[#e8f4f1] transition ml-1 cursor-pointer"
                              title={`Study ${d.name}`}
                            >
                              <BookOpen className="w-3 h-3" />
                            </button>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <div className="pt-2 mt-1.5 border-t border-[#e8f0ee] flex justify-between items-center text-[11px] text-[#5e7a76]">
                    <span>{docsToSearch.length} active for queries</span>
                    <button
                      onClick={() => setShowDocPicker(false)}
                      className="px-2 py-0.5 bg-[#1c4e48] text-white rounded text-[11px] font-semibold"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Study Mode shortcut */}
          {activeDoc && onOpenStudyModal && (
            <button
              onClick={() => onOpenStudyModal(activeDoc)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#d4e0dd] hover:border-[#3c8b7e] bg-white text-[#5e7a76] hover:text-[#1c4e48] transition cursor-pointer text-xs font-semibold"
              title={`Open Study Mode for ${activeDoc.name}`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#3c8b7e]" />
              <span className="hidden lg:inline">Study</span>
            </button>
          )}

          {/* Quick Cross-Document Comparison shortcut */}
          {documents.length >= 2 && onOpenCompare && (
            <button
              onClick={onOpenCompare}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#d4e0dd] hover:border-[#3c8b7e] bg-white text-[#5e7a76] hover:text-[#1c4e48] transition cursor-pointer text-xs font-semibold"
              title="Compare documents side-by-side"
            >
              <GitCompare className="w-3.5 h-3.5 text-[#3c8b7e]" />
              <span className="hidden lg:inline">Compare</span>
            </button>
          )}

          {/* Search Inside Chat */}
          <button
            onClick={() => {
              setShowSearch((prev) => !prev);
              if (showSearch) setChatSearch('');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
              showSearch
                ? 'border-[#3c8b7e] bg-[#e8f4f1] text-[#1c4e48]'
                : 'border-[#d4e0dd] hover:border-[#9bbcb6] bg-white text-[#5e7a76] hover:text-[#183237]'
            }`}
            title="Search inside this conversation"
          >
            <Search className="w-3.5 h-3.5 text-[#3c8b7e]" />
            <span className="hidden md:inline text-xs font-semibold">Search</span>
          </button>

          {/* Export Chat */}
          {messages.length > 0 && (
            <div className="relative group">
              <button
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#d4e0dd] hover:border-[#9bbcb6] bg-white text-[#5e7a76] hover:text-[#183237] text-xs font-semibold transition cursor-pointer"
                title="Export conversation"
              >
                <Download className="w-3.5 h-3.5 text-[#3c8b7e]" />
                <span className="hidden md:inline">Export</span>
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-[#d2ebe5] rounded-xl shadow-lg p-1 z-30 min-w-[130px]">
                <button
                  onClick={() => handleExportChat('md')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#f4f7f7] text-[#183237] flex items-center justify-between"
                >
                  <span>Markdown</span>
                  <span className="text-[10px] text-[#5e7a76]">.md</span>
                </button>
                <button
                  onClick={() => handleExportChat('txt')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#f4f7f7] text-[#183237] flex items-center justify-between"
                >
                  <span>Plain Text</span>
                  <span className="text-[10px] text-[#5e7a76]">.txt</span>
                </button>
                <button
                  onClick={() => handleExportChat('print')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#f4f7f7] text-[#1c4e48] font-semibold flex items-center justify-between"
                >
                  <span>Print / PDF</span>
                  <span className="text-[10px] text-[#3c8b7e]">Print</span>
                </button>
              </div>
            </div>
          )}

          {/* New Chat Button */}
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c4e48] hover:bg-[#163d38] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
              title="Start a new chat session"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* In-Chat Search Bar */}
      {showSearch && (
        <div className="px-4 sm:px-6 py-2.5 bg-[#f0f7f5] border-b border-[#d2ebe5] flex items-center gap-2 animate-fade-in z-10">
          <Search className="w-3.5 h-3.5 text-[#3c8b7e] flex-shrink-0" />
          <input
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            placeholder="Search keywords or phrases in this conversation…"
            className="flex-1 bg-white border border-[#d2ebe5] rounded-lg px-3 py-1.5 text-xs text-[#183237] focus:outline-none focus:ring-2 focus:ring-[#3c8b7e]/50"
            autoFocus
          />
          {chatSearch && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#1c4e48] bg-white px-2 py-0.5 rounded border border-[#d2ebe5]">
                {messages.filter((m) => m.content.toLowerCase().includes(chatSearch.toLowerCase())).length} found
              </span>
              <button
                onClick={() => setChatSearch('')}
                className="text-[#5e7a76] hover:text-[#183237] p-1 cursor-pointer"
                title="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            onClick={() => {
              setShowSearch(false);
              setChatSearch('');
            }}
            className="text-xs text-[#5e7a76] hover:text-[#183237] px-2 py-1 font-semibold rounded hover:bg-black/5 cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* Messages Thread */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
      >
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-10 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e8f4f1] to-[#d2ebe5] border border-[#bfe2da] flex items-center justify-center mx-auto mb-4 shadow-xs">
              <Sparkles className="w-7 h-7 text-[#1c4e48]" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-[#183237] mb-2 tracking-tight">
              {docsToSearch.length > 1
                ? `Ask across ${docsToSearch.length} selected documents`
                : activeDoc
                ? `Ask anything about ${activeDoc.name}`
                : 'Turn Your Documents Into Intelligence'}
            </h3>

            <p className="text-[#5e7a76] text-xs sm:text-sm mb-6 max-w-lg mx-auto leading-relaxed">
              DocuMind AI uses semantic search, dense passage embeddings, and grounded zero-hallucination synthesis to deliver verified answers with exact document citations.
            </p>

            <div className="grid sm:grid-cols-2 gap-2.5 max-w-xl mx-auto mb-6 text-left">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="p-3 rounded-xl bg-white border border-[#e2ece9] hover:border-[#3c8b7e] hover:shadow-xs transition text-xs text-[#183237] font-medium group cursor-pointer"
                >
                  <span className="group-hover:text-[#1c4e48] transition leading-snug">{s}</span>
                </button>
              ))}
            </div>

            {documents.length === 0 && onUploadClick && (
              <div className="pt-4 border-t border-[#e2ece9] max-w-md mx-auto">
                <button
                  onClick={onUploadClick}
                  className="px-5 py-2.5 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  Upload your first document to start
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, idx) => {
              const isMatch = chatSearch.trim() && msg.content.toLowerCase().includes(chatSearch.trim().toLowerCase());
              const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-[#1c4e48] flex items-center justify-center flex-shrink-0 text-white shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                    {/* Header info for assistant */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[11px] font-bold text-[#1c4e48]">DocuMind AI</span>
                        {msg.modelUsed && (
                          <span className="text-[10px] text-[#5e7a76] px-1.5 py-0.2 rounded bg-[#e8f4f1] border border-[#d2ebe5] font-medium">
                            {msg.modelUsed}
                          </span>
                        )}
                        {msg.latencyMs !== undefined && (
                          <span className="text-[10px] text-[#3c8b7e] font-mono font-medium">
                            ⚡ {msg.latencyMs}ms
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      className={`px-4.5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-2xs transition ${
                        isMatch ? 'ring-2 ring-[#3c8b7e] ring-offset-2' : ''
                      } ${
                        msg.role === 'user'
                          ? 'bg-[#1c4e48] text-white rounded-tr-xs'
                          : 'bg-white border border-[#e2ece9] text-[#183237] rounded-tl-xs'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <MarkdownContent content={msg.content} />
                      )}
                    </div>

                    {/* Rate Limit notice if applicable */}
                    {msg.quotaExceeded && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                        <span>Shared Gemini quota reached. Add your API key in Settings for unlimited requests.</span>
                      </div>
                    )}

                    {/* Assistant Action Controls (Section 13 & 14) */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mt-2 px-1 flex-wrap">
                        {/* Copy */}
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="text-[#5e7a76] hover:text-[#183237] text-xs flex items-center gap-1 transition py-0.5 px-1.5 rounded hover:bg-white cursor-pointer"
                          title="Copy answer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px]">{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        {/* Export Dropdown */}
                        <div className="relative group">
                          <button
                            className="text-[#5e7a76] hover:text-[#183237] text-xs flex items-center gap-1 transition py-0.5 px-1.5 rounded hover:bg-white cursor-pointer"
                            title="Export this response"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Export</span>
                          </button>
                          <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-white border border-[#d2ebe5] rounded-xl shadow-lg p-1 z-20 min-w-[120px]">
                            <button
                              onClick={() => handleExportAnswer(msg.content, 'md')}
                              className="w-full text-left px-2 py-1 rounded text-xs hover:bg-[#f4f7f7] text-[#183237]"
                            >
                              Markdown (.md)
                            </button>
                            <button
                              onClick={() => handleExportAnswer(msg.content, 'txt')}
                              className="w-full text-left px-2 py-1 rounded text-xs hover:bg-[#f4f7f7] text-[#183237]"
                            >
                              Text (.txt)
                            </button>
                            <button
                              onClick={() => handleExportAnswer(msg.content, 'print')}
                              className="w-full text-left px-2 py-1 rounded text-xs hover:bg-[#f4f7f7] text-[#1c4e48] font-semibold"
                            >
                              Print / PDF
                            </button>
                          </div>
                        </div>

                        {/* Text to Speech */}
                        <button
                          onClick={() => handleToggleSpeak(msg.id, msg.content)}
                          className={`text-xs flex items-center gap-1 transition py-0.5 px-1.5 rounded hover:bg-white cursor-pointer ${
                            speakingId === msg.id ? 'text-red-600 font-semibold bg-red-50' : 'text-[#5e7a76] hover:text-[#183237]'
                          }`}
                          title={speakingId === msg.id ? 'Stop listening' : 'Listen to answer'}
                        >
                          {speakingId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px]">{speakingId === msg.id ? 'Stop audio' : 'Listen'}</span>
                        </button>

                        {/* Regenerate (if last message) */}
                        {isLastAssistant && (
                          <button
                            onClick={handleRegenerate}
                            disabled={busy}
                            className="text-[#5e7a76] hover:text-[#183237] text-xs flex items-center gap-1 transition py-0.5 px-1.5 rounded hover:bg-white cursor-pointer disabled:opacity-40"
                            title="Regenerate this answer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Regenerate</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Source Citations (Section 6: Required format with [View Source]) */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#5e7a76] flex items-center gap-1 px-1">
                          <Quote className="w-3 h-3 text-[#3c8b7e]" />
                          <span>Grounded Source Citations ({msg.citations.length})</span>
                        </div>
                        <div className="grid gap-2">
                          {msg.citations.map((c, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-xl bg-white border border-[#e2ece9] hover:border-[#3c8b7e] transition text-left"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-3.5 h-3.5 text-[#3c8b7e] flex-shrink-0" />
                                  <span className="text-xs font-bold text-[#183237] truncate">
                                    {c.document_name}
                                  </span>
                                  {c.chunkIndex !== undefined && (
                                    <span className="text-[10px] text-[#5e7a76] font-mono">
                                      — Passage {c.chunkIndex + 1}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {c.relevanceScore !== undefined && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#e8f4f1] text-[#1c4e48]">
                                      {c.relevanceScore}% match
                                    </span>
                                  )}
                                  {/* Explicit [View Source] Button (Section 6) */}
                                  <button
                                    onClick={() => {
                                      if (onSelectCitation) {
                                        onSelectCitation(c.document_id, c.snippet);
                                      } else {
                                        onSelectDoc(c.document_id);
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded bg-[#f0f7f5] hover:bg-[#e2ece9] text-[#1c4e48] text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                    title="Open document excerpt in viewer"
                                  >
                                    <span>View Source</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>

                                  {onOpenStudyModal && (() => {
                                    const citDoc = documents.find((d) => d.id === c.document_id);
                                    if (!citDoc) return null;
                                    return (
                                      <button
                                        onClick={() => onOpenStudyModal(citDoc)}
                                        className="px-2 py-0.5 rounded bg-[#f0f7f5] hover:bg-[#e2ece9] text-[#1c4e48] text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                        title="Open Study Mode for this document"
                                      >
                                        <BookOpen className="w-3 h-3 text-[#3c8b7e]" />
                                        <span className="hidden sm:inline">Study</span>
                                      </button>
                                    );
                                  })()}
                                </div>
                              </div>
                              <p className="text-xs text-[#5e7a76] leading-relaxed italic bg-[#f9fbfa] p-2 rounded-lg border border-[#eef4f2]">
                                "{c.snippet}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {busy && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-[#1c4e48] flex items-center justify-center flex-shrink-0 text-white shadow-xs">
                  <Sparkles className="w-4 h-4 animate-spin text-emerald-300" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-xs bg-gradient-to-br from-white to-[#f4f9f8] border border-[#cfe2de] shadow-xs max-w-md w-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1c4e48] flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#3c8b7e] animate-pulse" />
                      RAG Pipeline Reasoning
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#e3f1ee] text-[#1c4e48]">
                      Step {reasoningStep + 1}/4
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#28504b] font-medium py-1">
                    <Loader2 className="w-4 h-4 text-[#3c8b7e] animate-spin flex-shrink-0" />
                    <span className="transition-all duration-300">{REASONING_STEPS[reasoningStep]}</span>
                  </div>
                  <div className="w-full bg-[#e2edea] h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="bg-[#3c8b7e] h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${((reasoningStep + 1) / REASONING_STEPS.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {!busy && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (
              <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 animate-fade-in">
                <span className="text-[11px] font-semibold text-[#5e7a76] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#3c8b7e]" />
                  Follow-ups:
                </span>
                {(docsToSearch.length > 1
                  ? [
                      `What are the most significant differences?`,
                      `Extract common conclusions across these papers`,
                      `What datasets and benchmarks are compared?`,
                    ]
                  : [
                      `Summarize main conclusions`,
                      `Extract key formulas and metrics`,
                      `What are the limitations noted?`,
                    ]
                ).map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => send(chip)}
                    className="text-xs px-3 py-1 rounded-full bg-white border border-[#d2ebe5] hover:border-[#3c8b7e] text-[#1c4e48] hover:bg-[#e8f4f1] transition shadow-2xs font-medium cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Bar & Controls */}
      <div className="px-4 sm:px-6 py-3.5 border-t border-[#e2ece9] bg-white shadow-lg">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Answer Mode Selector (Section 13 Required Modes) */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-[#5e7a76] flex items-center gap-1 mr-1">
                <SlidersHorizontal className="w-3 h-3 text-[#3c8b7e]" />
                Mode:
              </span>
              {answerModes.map((m) => {
                const Icon = m.icon;
                const isSelected = aiMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAiMode(m.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition font-medium cursor-pointer ${
                      isSelected
                        ? 'bg-[#1c4e48] text-white shadow-2xs'
                        : 'bg-[#f0f6f4] text-[#4b6a65] hover:bg-[#e2ece9]'
                    }`}
                    title={m.tip}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {isListening && (
              <span className="text-[11px] font-semibold text-red-600 animate-pulse flex items-center gap-1 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                Listening to speech…
              </span>
            )}
          </div>

          {/* Prompt Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 bg-[#f8fbfa] border border-[#d4e0dd] focus-within:border-[#3c8b7e] focus-within:ring-2 focus-within:ring-[#3c8b7e]/20 rounded-2xl p-2 transition shadow-2xs"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={
                docsToSearch.length > 1
                  ? `Ask across ${docsToSearch.length} selected documents (e.g. Compare methodology…)…`
                  : activeDoc
                  ? `Ask about ${activeDoc.name}…`
                  : 'Ask a question across your documents…'
              }
              className="flex-1 bg-transparent px-3 py-2 text-sm text-[#183237] placeholder:text-[#5e7a76] focus:outline-none resize-none max-h-40"
            />

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-2.5 rounded-xl transition flex items-center justify-center flex-shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-md ring-2 ring-red-400'
                  : 'bg-white hover:bg-[#eaf3f1] text-[#5e7a76] hover:text-[#1c4e48] border border-[#d4e0dd]'
              }`}
              title={isListening ? 'Stop listening' : 'Dictate with Voice'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="p-2.5 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] active:bg-[#11312d] text-white transition disabled:opacity-30 disabled:hover:bg-[#1c4e48] flex items-center justify-center flex-shrink-0 shadow-xs cursor-pointer"
              title="Send message (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[11px] text-[#5e7a76] text-center mt-1 font-medium">
            Grounded RAG synthesis with strict zero-hallucination source verification.
          </p>
        </div>
      </div>
    </div>
  );
}
