import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Edit2,
  History,
  Layers,
  ChevronLeft,
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
  onRenameConv?: (id: string, newTitle: string) => void;
  onUploadClick?: () => void;
  onOpenStudyModal?: (doc: DocItem) => void;
  onOpenCompare?: () => void;
}

function groupConversationsByDate(convs: ConvItem[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  const today: ConvItem[] = [];
  const yesterday: ConvItem[] = [];
  const earlier: ConvItem[] = [];

  for (const c of convs) {
    const t = new Date(c.updated_at).getTime();
    if (t >= startOfToday) {
      today.push(c);
    } else if (t >= startOfYesterday) {
      yesterday.push(c);
    } else {
      earlier.push(c);
    }
  }

  return { today, yesterday, earlier };
}

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
  onRenameConv,
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
  const [showDocPicker, setShowDocPicker] = useState(false);

  // Clean Chat History Drawer (Section 15)
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);

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

  // Filtered & Grouped Chat History (Section 15)
  const filteredConvs = useMemo(() => {
    const term = historySearch.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(term));
  }, [conversations, historySearch]);

  const groupedHistory = useMemo(() => {
    return groupConversationsByDate(filteredConvs);
  }, [filteredConvs]);

  const suggestions = docsToSearch.length > 1
    ? [
        `Compare the methodologies used in the selected papers`,
        `What are the common topics and strategic themes across these files?`,
        `Summarize the key differences and contrasting points`,
        `Extract all important findings and conclusions`,
      ]
    : activeDoc
    ? [
        `What are the main findings of this research paper?`,
        `Summarize the key takeaways of ${activeDoc.name}`,
        `What are the core metrics, methodologies, and limitations?`,
        `Explain the essential concepts for a student`,
      ]
    : [
        'Summarize the primary objectives across all uploaded documents',
        'Compare the key findings and conclusions in our knowledge base',
        'What critical metrics, dates, and conclusions are specified?',
        'Extract important definitions and findings',
      ];

  const answerModes: Array<{ id: AIMode; label: string; icon: React.ElementType; tip: string }> = [
    { id: 'grounded', label: 'Grounded', icon: Target, tip: 'Strict zero-hallucination facts with citations' },
    { id: 'simple', label: 'Simple', icon: Sparkles, tip: 'Explain simply in plain language' },
    { id: 'student', label: 'Student', icon: BookOpen, tip: 'Educational explanations with study context' },
    { id: 'technical', label: 'Technical', icon: Cpu, tip: 'In-depth architectural and technical analysis' },
  ];

  return (
    <div className="flex-1 flex bg-[#f4f7f7] min-w-0 relative h-full overflow-hidden">
      {/* SECTION 15: CLEAN CHAT HISTORY DRAWER / SIDEBAR */}
      {showHistoryDrawer && (
        <div className="w-72 bg-white border-r border-[#e2ece9] flex flex-col h-full flex-shrink-0 z-20 shadow-md animate-fade-in">
          {/* History Header */}
          <div className="p-3.5 border-b border-[#e2ece9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#3c8b7e]" />
              <span className="text-xs font-bold text-[#183237] uppercase tracking-wider">Chat History</span>
            </div>
            <button
              onClick={() => setShowHistoryDrawer(false)}
              className="p-1 rounded text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3] cursor-pointer"
              title="Close history"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3 pb-2">
            <button
              onClick={() => {
                onNewConversation?.();
                setShowHistoryDrawer(false);
              }}
              className="w-full py-2 px-3 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#7dd3c4]" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Search Chats (Section 15) */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5e7a76] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search chats…"
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[#d4e0dd] text-xs focus:outline-none focus:ring-1 focus:ring-[#3c8b7e] bg-[#f8fbfa]"
              />
            </div>
          </div>

          {/* Grouped History List (Section 15: Today, Yesterday, Earlier) */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
            {/* Group: Today */}
            {groupedHistory.today.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-[#5e7a76] uppercase tracking-wider px-2 py-1">
                  Today
                </div>
                <div className="space-y-0.5">
                  {groupedHistory.today.map((c) => (
                    <div
                      key={c.id}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition cursor-pointer ${
                        c.id === activeConvId
                          ? 'bg-[#e8f4f1] text-[#1c4e48] font-semibold border border-[#d2ebe5]'
                          : 'hover:bg-[#f4f7f7] text-[#183237]'
                      }`}
                    >
                      {editingConvId === c.id ? (
                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onRenameConv?.(c.id, editingTitle);
                                setEditingConvId(null);
                              } else if (e.key === 'Escape') {
                                setEditingConvId(null);
                              }
                            }}
                            className="flex-1 px-1.5 py-0.5 rounded border border-[#3c8b7e] text-xs bg-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              onRenameConv?.(c.id, editingTitle);
                              setEditingConvId(null);
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              onSelectConv?.(c.id);
                              setShowHistoryDrawer(false);
                            }}
                            className="flex-1 text-left truncate cursor-pointer mr-1"
                            title={c.title}
                          >
                            {c.title}
                          </button>

                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConvId(c.id);
                                setEditingTitle(c.title);
                              }}
                              className="p-1 rounded text-[#5e7a76] hover:text-[#183237] hover:bg-white"
                              title="Rename chat"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${c.title}"?`)) onDeleteConv?.(c.id);
                              }}
                              className="p-1 rounded text-[#5e7a76] hover:text-red-600 hover:bg-white"
                              title="Delete chat"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Group: Yesterday */}
            {groupedHistory.yesterday.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-[#5e7a76] uppercase tracking-wider px-2 py-1">
                  Yesterday
                </div>
                <div className="space-y-0.5">
                  {groupedHistory.yesterday.map((c) => (
                    <div
                      key={c.id}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition cursor-pointer ${
                        c.id === activeConvId
                          ? 'bg-[#e8f4f1] text-[#1c4e48] font-semibold border border-[#d2ebe5]'
                          : 'hover:bg-[#f4f7f7] text-[#183237]'
                      }`}
                    >
                      {editingConvId === c.id ? (
                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onRenameConv?.(c.id, editingTitle);
                                setEditingConvId(null);
                              } else if (e.key === 'Escape') {
                                setEditingConvId(null);
                              }
                            }}
                            className="flex-1 px-1.5 py-0.5 rounded border border-[#3c8b7e] text-xs bg-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              onRenameConv?.(c.id, editingTitle);
                              setEditingConvId(null);
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              onSelectConv?.(c.id);
                              setShowHistoryDrawer(false);
                            }}
                            className="flex-1 text-left truncate cursor-pointer mr-1"
                            title={c.title}
                          >
                            {c.title}
                          </button>

                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConvId(c.id);
                                setEditingTitle(c.title);
                              }}
                              className="p-1 rounded text-[#5e7a76] hover:text-[#183237] hover:bg-white"
                              title="Rename chat"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${c.title}"?`)) onDeleteConv?.(c.id);
                              }}
                              className="p-1 rounded text-[#5e7a76] hover:text-red-600 hover:bg-white"
                              title="Delete chat"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Group: Earlier */}
            {groupedHistory.earlier.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-[#5e7a76] uppercase tracking-wider px-2 py-1">
                  Earlier
                </div>
                <div className="space-y-0.5">
                  {groupedHistory.earlier.map((c) => (
                    <div
                      key={c.id}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition cursor-pointer ${
                        c.id === activeConvId
                          ? 'bg-[#e8f4f1] text-[#1c4e48] font-semibold border border-[#d2ebe5]'
                          : 'hover:bg-[#f4f7f7] text-[#183237]'
                      }`}
                    >
                      {editingConvId === c.id ? (
                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onRenameConv?.(c.id, editingTitle);
                                setEditingConvId(null);
                              } else if (e.key === 'Escape') {
                                setEditingConvId(null);
                              }
                            }}
                            className="flex-1 px-1.5 py-0.5 rounded border border-[#3c8b7e] text-xs bg-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              onRenameConv?.(c.id, editingTitle);
                              setEditingConvId(null);
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              onSelectConv?.(c.id);
                              setShowHistoryDrawer(false);
                            }}
                            className="flex-1 text-left truncate cursor-pointer mr-1"
                            title={c.title}
                          >
                            {c.title}
                          </button>

                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConvId(c.id);
                                setEditingTitle(c.title);
                              }}
                              className="p-1 rounded text-[#5e7a76] hover:text-[#183237] hover:bg-white"
                              title="Rename chat"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${c.title}"?`)) onDeleteConv?.(c.id);
                              }}
                              className="p-1 rounded text-[#5e7a76] hover:text-red-600 hover:bg-white"
                              title="Delete chat"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-[#e2ece9] bg-white flex items-center justify-between gap-3 shadow-2xs z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Toggle History Button */}
            <button
              onClick={() => setShowHistoryDrawer((prev) => !prev)}
              className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                showHistoryDrawer
                  ? 'border-[#3c8b7e] bg-[#e8f4f1] text-[#1c4e48]'
                  : 'border-[#d4e0dd] text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3]'
              }`}
              title="Toggle chat history (Grouped by Today, Yesterday, Earlier)"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>

            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base text-[#183237] truncate" title={conversationTitle}>
                {conversationTitle}
              </h2>

              {/* RAG Scope indicator */}
              <div className="text-[11px] text-[#5e7a76] truncate">
                {docsToSearch.length > 1 ? (
                  <span className="text-[#1c4e48] font-medium">
                    Searching across {docsToSearch.length} selected documents
                  </span>
                ) : activeDoc ? (
                  <span className="text-[#1c4e48] font-medium truncate">
                    Focused on {activeDoc.name}
                  </span>
                ) : (
                  <span>Searching all documents in knowledge base</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Multi-Document Selection Dropdown (Section 8) */}
            {documents.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowDocPicker((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    selectedDocIds.length > 0
                      ? 'border-[#3c8b7e] bg-[#e8f4f1] text-[#1c4e48]'
                      : 'border-[#d4e0dd] hover:border-[#9bbcb6] bg-white text-[#5e7a76] hover:text-[#183237]'
                  }`}
                  title="Select documents for Multi-Document RAG"
                >
                  <FileText className="w-3.5 h-3.5 text-[#3c8b7e]" />
                  <span className="hidden sm:inline">Select Documents</span>
                  <span className="text-[10px] bg-[#1c4e48] text-white px-1.5 py-0.2 rounded-full font-bold">
                    {docsToSearch.length}
                  </span>
                </button>

                {showDocPicker && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-[#d2ebe5] rounded-xl shadow-xl p-3 z-30 animate-fade-in">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#e8f0ee]">
                      <span className="text-xs font-bold text-[#183237]">Target Documents (RAG)</span>
                      {selectedDocIds.length > 0 && onClearSelectedDocIds && (
                        <button
                          onClick={onClearSelectedDocIds}
                          className="text-[11px] text-[#3c8b7e] hover:underline cursor-pointer"
                        >
                          Reset to all
                        </button>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1.5">
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
                          </label>
                        );
                      })}
                    </div>
                    <div className="pt-2 mt-2 border-t border-[#e8f0ee] flex justify-between items-center text-[11px] text-[#5e7a76]">
                      <span>{docsToSearch.length} active for queries</span>
                      <button
                        onClick={() => setShowDocPicker(false)}
                        className="px-2.5 py-1 bg-[#1c4e48] text-white rounded-lg text-xs font-semibold"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                  </button>
                </div>
              </div>
            )}

            {/* New Chat Button */}
            {onNewConversation && (
              <button
                onClick={onNewConversation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c4e48] hover:bg-[#163d38] text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
                title="Start a new chat session"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages Thread */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
        >
          {messages.length === 0 ? (
            /* Professional Empty State (Section 4, 7, 17) */
            <div className="max-w-2xl mx-auto text-center py-12 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-[#e8f4f1] border border-[#d2ebe5] flex items-center justify-center mx-auto mb-4 shadow-2xs">
                <MessageSquare className="w-6 h-6 text-[#1c4e48]" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-[#183237] mb-2 tracking-tight">
                {docsToSearch.length > 1
                  ? `Ask across ${docsToSearch.length} selected documents`
                  : activeDoc
                  ? `Ask anything about ${activeDoc.name}`
                  : 'No conversations yet'}
              </h3>

              <p className="text-[#5e7a76] text-xs sm:text-sm mb-6 max-w-md mx-auto leading-relaxed">
                DocuMind AI answers questions using your uploaded documents and provides exact grounded source citations.
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
                <div className="pt-2">
                  <button
                    onClick={onUploadClick}
                    className="px-4 py-2 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Upload your first document
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, idx) => {
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
                      {/* Assistant Header */}
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-[11px] font-bold text-[#1c4e48]">DocuMind AI</span>
                          {msg.latencyMs !== undefined && (
                            <span className="text-[10px] text-[#5e7a76] font-mono">
                              {msg.latencyMs}ms
                            </span>
                          )}
                        </div>
                      )}

                      <div
                        className={`px-4.5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-2xs transition ${
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

                      {/* Assistant Action Controls (Section 7: Copy, Regenerate, Export) */}
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

                          {/* Export */}
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
                            <span className="text-[11px]">{speakingId === msg.id ? 'Stop' : 'Listen'}</span>
                          </button>

                          {/* Regenerate */}
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

                      {/* Source Citations (Section 7: Only display citations when real, never fabricate) */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#5e7a76] flex items-center gap-1 px-1">
                            <Quote className="w-3 h-3 text-[#3c8b7e]" />
                            <span>Sources</span>
                          </div>
                          <div className="grid gap-2">
                            {msg.citations.map((c, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-xl bg-white border border-[#e2ece9] hover:border-[#3c8b7e] transition text-left"
                              >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FileText className="w-3.5 h-3.5 text-[#3c8b7e] flex-shrink-0" />
                                    <span className="text-xs font-bold text-[#183237] truncate">
                                      {c.document_name}
                                    </span>
                                    {c.chunkIndex !== undefined && (
                                      <span className="text-[10px] text-[#5e7a76] font-mono">
                                        — Page {c.chunkIndex + 1}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {/* View Source Button */}
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

              {/* Busy state */}
              {busy && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-xl bg-[#1c4e48] flex items-center justify-center flex-shrink-0 text-white shadow-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-[#7dd3c4]" />
                  </div>
                  <div className="p-3.5 rounded-2xl rounded-tl-xs bg-white border border-[#e2ece9] text-xs text-[#5e7a76] flex items-center gap-2 shadow-2xs">
                    <span>Searching documents & generating grounded response…</span>
                  </div>
                </div>
              )}

              {/* Follow-up suggestions */}
              {!busy && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (
                <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 animate-fade-in">
                  <span className="text-[11px] font-semibold text-[#5e7a76] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#3c8b7e]" />
                    Follow-up:
                  </span>
                  {(docsToSearch.length > 1
                    ? [
                        `What are the most significant differences?`,
                        `Extract common conclusions across these files`,
                      ]
                    : [
                        `Summarize main conclusions`,
                        `What are the limitations mentioned?`,
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
            {/* Answer Mode Selector */}
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
                  Listening…
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
                    ? `Ask across ${docsToSearch.length} selected documents…`
                    : activeDoc
                    ? `Ask about ${activeDoc.name}…`
                    : 'Ask a question about your documents…'
                }
                className="flex-1 bg-transparent px-3 py-2 text-sm text-[#183237] placeholder:text-[#5e7a76] focus:outline-none resize-none max-h-40"
              />

              {/* Voice Input */}
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
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
