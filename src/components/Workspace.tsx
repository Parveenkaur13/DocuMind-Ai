import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu,
  UploadCloud,
  Upload,
  Search,
  X,
  FileText,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import {
  fetchDocuments,
  fetchConversations,
  createConversation,
  updateConversation,
  fetchMessages,
  saveMessage,
  deleteDocument,
  deleteConversation,
} from '../lib/db';
import { Sidebar, type DocItem, type ConvItem, type MainNavView } from './Sidebar';
import { ChatPanel, type ChatMessage } from './ChatPanel';
import { DashboardView } from './DashboardView';
import { DocumentsView } from './DocumentsView';
import { StudyModeView } from './StudyModeView';
import { CompareView } from './CompareView';
import { KnowledgeMapView } from './KnowledgeMapView';
import { PipelineView } from './PipelineView';
import { EvaluationView } from './EvaluationView';
import { UploadModal } from './UploadModal';
import { SettingsModal } from './SettingsModal';
import { HelpModal } from './HelpModal';
import { ToastProvider, useToast } from './Toast';

const VIEW_TITLES: Record<MainNavView, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Intelligent Overview & Knowledge Metrics',
  },
  documents: {
    title: 'Document Intelligence',
    subtitle: 'Multi-Format Management, Extraction & Chunks',
  },
  chat: {
    title: 'AI Chat & RAG',
    subtitle: 'Zero-Hallucination Retrieval Grounded with Citations',
  },
  study: {
    title: 'Study & Personalized Learning',
    subtitle: 'Adaptive Notes, MCQs, Flashcards, Viva & Audio',
  },
  compare: {
    title: 'Document Comparison',
    subtitle: '9-Dimensional Side-by-Side Architectural Analysis',
  },
  'knowledge-map': {
    title: 'Knowledge Map',
    subtitle: 'Topic Taxonomy & Extracted Entity Graph',
  },
  evaluation: {
    title: 'RAG Evaluation & Telemetry',
    subtitle: 'Citation Coverage, Retrieval Latency & Live Benchmark',
  },
  pipeline: {
    title: 'RAG Pipeline Architecture',
    subtitle: 'End-to-End Processing Flow Simulator',
  },
};

function WorkspaceInner() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [currentView, setCurrentView] = useState<MainNavView>('dashboard');
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [conversations, setConversations] = useState<ConvItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const activeConvIdRef = useRef<string | null>(null);
  activeConvIdRef.current = activeConvId;

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [targetDocHighlightQuery, setTargetDocHighlightQuery] = useState<string | undefined>(undefined);

  // Modals
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Global search & drag-and-drop
  const [globalSearch, setGlobalSearch] = useState('');
  const [showGlobalSearchDropdown, setShowGlobalSearchDropdown] = useState(false);
  const [isWindowDragOver, setIsWindowDragOver] = useState(false);

  const loadDocs = useCallback(async () => {
    const docs = await fetchDocuments(user?.id);
    setDocuments(docs);
  }, [user]);

  const loadConvs = useCallback(async () => {
    const convs = await fetchConversations(user?.id);
    setConversations(convs);
    if (!activeConvIdRef.current && convs.length > 0) {
      const initialId = convs[0].id;
      activeConvIdRef.current = initialId;
      setActiveConvId(initialId);
      const msgs = await fetchMessages(initialId, user?.id);
      setMessages(msgs);
    }
  }, [user]);

  useEffect(() => {
    loadDocs();
    loadConvs();
  }, [loadDocs, loadConvs]);

  const loadMsgs = useCallback(
    async (convId: string) => {
      const msgs = await fetchMessages(convId, user?.id);
      setMessages(msgs);
    },
    [user],
  );

  const handleSelectConv = useCallback(
    async (convId: string) => {
      activeConvIdRef.current = convId;
      setActiveConvId(convId);
      await loadMsgs(convId);
      setSidebarOpen(false);
    },
    [loadMsgs],
  );

  const handleNewConversation = useCallback(async () => {
    const title = 'New conversation';
    const newConv = await createConversation(title, user?.id);
    activeConvIdRef.current = newConv.id;
    setActiveConvId(newConv.id);
    setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
    setMessages([]);
    showToast('Started new conversation', 'info');
    setCurrentView('chat');
  }, [user, showToast]);

  const handleDeleteConv = useCallback(
    async (convId: string) => {
      await deleteConversation(convId, user?.id);
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== convId);
        if (activeConvIdRef.current === convId) {
          const nextActive = remaining[0] ? remaining[0].id : null;
          activeConvIdRef.current = nextActive;
          setActiveConvId(nextActive);
          if (nextActive) {
            loadMsgs(nextActive);
          } else {
            setMessages([]);
          }
        }
        return remaining;
      });
      showToast('Conversation deleted', 'info');
    },
    [user, loadMsgs, showToast],
  );

  const handleSendMessage = useCallback(
    async (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);

      let convId = activeConvIdRef.current;
      if (!convId) {
        const title = msg.role === 'user' ? (msg.content.slice(0, 45).trim() || 'New conversation') : 'New conversation';
        const created = await createConversation(title, user?.id);
        convId = created.id;
        activeConvIdRef.current = convId;
        setActiveConvId(convId);
        setConversations((prev) => [created, ...prev.filter((c) => c.id !== convId)]);
      } else if (msg.role === 'user') {
        const currentConv = conversations.find((c) => c.id === convId);
        if (!currentConv || currentConv.title === 'New conversation' || currentConv.title === 'New chat') {
          const newTitle = msg.content.slice(0, 45).trim();
          if (newTitle) {
            await updateConversation(convId, newTitle, user?.id);
            setConversations((prev) =>
              prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c)),
            );
          }
        }
      }

      await saveMessage(msg, convId, user?.id);
    },
    [user, conversations],
  );

  const handleDeleteDoc = useCallback(
    async (id: string) => {
      await deleteDocument(id, user?.id);
      if (activeDocId === id) setActiveDocId(null);
      setSelectedDocIds((prev) => prev.filter((x) => x !== id));
      await loadDocs();
      showToast('Document removed', 'info');
    },
    [user, activeDocId, loadDocs, showToast],
  );

  const handleToggleSelectDocId = useCallback((id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleClearSelectedDocIds = useCallback(() => {
    setSelectedDocIds([]);
  }, []);

  const handleSelectCitation = (docId: string, snippet: string) => {
    setActiveDocId(docId);
    setTargetDocHighlightQuery(snippet);
    setCurrentView('documents');
    showToast('Navigated to grounded source passage in document inspector', 'info');
  };

  // Window drag & drop
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsWindowDragOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) {
        setIsWindowDragOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsWindowDragOver(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        setUploadOpen(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        setUploadOpen(true);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const activeDoc = activeDocId ? documents.find((d) => d.id === activeDocId) ?? null : null;
  const conversationTitle =
    conversations.find((c) => c.id === activeConvId)?.title ??
    (messages.length > 0 ? 'Conversation' : 'New conversation');

  // Filter documents for global quick-search
  const globalSearchResults = globalSearch.trim()
    ? documents.filter(
        (d) =>
          d.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
          d.summary?.toLowerCase().includes(globalSearch.toLowerCase())
      )
    : [];

  return (
    <div className="h-screen flex bg-[#f4f7f7] overflow-hidden relative font-sans text-[#183237]">
      {/* Global Drag and Drop Overlay */}
      {isWindowDragOver && (
        <div className="fixed inset-0 z-50 bg-[#0f322d]/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white animate-fade-in pointer-events-none">
          <div className="w-20 h-20 rounded-3xl bg-white/15 border-2 border-dashed border-[#7dd3c4] flex items-center justify-center mb-4">
            <UploadCloud className="w-10 h-10 text-[#7dd3c4] animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Drop Documents Anywhere</h2>
          <p className="text-white/80 text-sm max-w-sm text-center">
            Release your PDF, DOCX, or TXT files to automatically parse, chunk, embed, and index into your knowledge base.
          </p>
        </div>
      )}

      {/* Main Professional Sidebar (Section 15) */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          setSidebarOpen(false);
        }}
        documentsCount={documents.length}
        onOpenUpload={() => setUploadOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar (Clean, Uncluttered, Professional AI SaaS per Section 15) */}
        <header className="h-14 px-4 sm:px-6 bg-white border-b border-[#e2ece9] flex items-center justify-between gap-4 z-20 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3] transition cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#5e7a76] hidden sm:inline">DocuMind AI /</span>
                <h1 className="font-bold text-sm sm:text-base text-[#183237] truncate">
                  {VIEW_TITLES[currentView]?.title || 'DocuMind AI'}
                </h1>
              </div>
              <p className="text-[11px] text-[#5e7a76] hidden md:block truncate">
                {VIEW_TITLES[currentView]?.subtitle}
              </p>
            </div>
          </div>

          {/* Center / Right: Global Search & Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Global Search Input */}
            <div className="relative hidden sm:block">
              <div className="flex items-center gap-2 bg-[#f4f7f7] border border-[#d2ebe5] focus-within:border-[#3c8b7e] focus-within:bg-white rounded-xl px-3 py-1.5 transition w-56 lg:w-72">
                <Search className="w-3.5 h-3.5 text-[#5e7a76] flex-shrink-0" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    setShowGlobalSearchDropdown(true);
                  }}
                  onFocus={() => setShowGlobalSearchDropdown(true)}
                  placeholder="Quick search documents…"
                  className="bg-transparent text-xs text-[#183237] placeholder:text-[#5e7a76] focus:outline-none w-full"
                />
                {globalSearch && (
                  <button
                    onClick={() => {
                      setGlobalSearch('');
                      setShowGlobalSearchDropdown(false);
                    }}
                    className="text-[#5e7a76] hover:text-[#183237] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Global search results dropdown */}
              {showGlobalSearchDropdown && globalSearch.trim() && (
                <div className="absolute right-0 mt-1.5 w-80 bg-white border border-[#d2ebe5] rounded-xl shadow-xl p-2 z-40 max-h-72 overflow-y-auto animate-fade-in">
                  <div className="text-[10px] font-bold text-[#5e7a76] uppercase px-2 py-1">
                    Matching Documents ({globalSearchResults.length})
                  </div>
                  {globalSearchResults.length === 0 ? (
                    <div className="text-xs text-[#5e7a76] p-3 text-center">No documents matched "{globalSearch}"</div>
                  ) : (
                    globalSearchResults.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2 rounded-lg hover:bg-[#f4f7f7] transition flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-[#3c8b7e] flex-shrink-0" />
                          <span className="font-semibold text-[#183237] truncate">{doc.name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => {
                              setActiveDocId(doc.id);
                              setCurrentView('documents');
                              setShowGlobalSearchDropdown(false);
                              setGlobalSearch('');
                            }}
                            className="px-2 py-0.5 rounded bg-[#e8f4f1] text-[#1c4e48] text-[10px] font-bold hover:bg-[#d2ebe5] cursor-pointer"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => {
                              setActiveDocId(doc.id);
                              setCurrentView('chat');
                              setShowGlobalSearchDropdown(false);
                              setGlobalSearch('');
                            }}
                            className="px-2 py-0.5 rounded bg-[#1c4e48] text-white text-[10px] font-bold hover:bg-[#163d38] cursor-pointer"
                          >
                            Chat
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* RAG Status Indicator */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e8f4f1] border border-[#d2ebe5] text-xs font-semibold text-[#1c4e48]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Grounded RAG Ready</span>
            </div>

            {/* Quick Upload Action */}
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] text-white text-xs font-bold transition shadow-2xs cursor-pointer group"
              title="Upload PDF, DOCX, or TXT files (Ctrl+U)"
            >
              <Upload className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
              <span className="hidden sm:inline">Upload</span>
            </button>
          </div>
        </header>

        {/* Dynamic View Body */}
        <main className="flex-1 overflow-hidden relative">
          {currentView === 'dashboard' && (
            <div className="h-full overflow-y-auto">
              <DashboardView
                documents={documents}
                conversations={conversations}
                onNavigate={(v) => setCurrentView(v as MainNavView)}
                onOpenUpload={() => setUploadOpen(true)}
                onSelectDoc={(id) => {
                  setActiveDocId(id);
                  setCurrentView('documents');
                }}
                onSelectConv={(id) => {
                  handleSelectConv(id);
                  setCurrentView('chat');
                }}
              />
            </div>
          )}

          {currentView === 'documents' && (
            <div className="h-full overflow-y-auto">
              <DocumentsView
                documents={documents}
                selectedDocIds={selectedDocIds}
                onToggleSelectDocId={handleToggleSelectDocId}
                onClearSelectedDocIds={handleClearSelectedDocIds}
                onSelectDocForChat={(id) => {
                  setActiveDocId(id);
                  setCurrentView('chat');
                }}
                onDeleteDoc={handleDeleteDoc}
                onOpenUpload={() => setUploadOpen(true)}
                onNavigateToStudy={(doc) => {
                  setActiveDocId(doc.id);
                  setCurrentView('study');
                }}
                onNavigateToCompare={() => setCurrentView('compare')}
                onNavigateToChat={() => setCurrentView('chat')}
                initialDocId={activeDocId}
                initialQuery={targetDocHighlightQuery}
              />
            </div>
          )}

          {currentView === 'chat' && (
            <div className="h-full flex flex-col">
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                documents={documents}
                selectedDocId={activeDocId}
                selectedDocIds={selectedDocIds}
                onClearSelectedDocIds={handleClearSelectedDocIds}
                onToggleSelectDocId={handleToggleSelectDocId}
                onSelectDoc={setActiveDocId}
                onSelectCitation={handleSelectCitation}
                conversationTitle={conversationTitle}
                conversations={conversations}
                activeConvId={activeConvId}
                onSelectConv={handleSelectConv}
                onNewConversation={handleNewConversation}
                onDeleteConv={handleDeleteConv}
                onUploadClick={() => setUploadOpen(true)}
                onOpenStudyModal={(doc) => {
                  setActiveDocId(doc.id);
                  setCurrentView('study');
                }}
                onOpenCompare={() => setCurrentView('compare')}
              />
            </div>
          )}

          {currentView === 'study' && (
            <div className="h-full overflow-y-auto">
              <StudyModeView
                documents={documents}
                selectedDoc={activeDoc}
                onSelectDoc={(doc) => setActiveDocId(doc.id)}
                onNavigateToChat={() => setCurrentView('chat')}
                onOpenUpload={() => setUploadOpen(true)}
              />
            </div>
          )}

          {currentView === 'compare' && (
            <div className="h-full overflow-y-auto">
              <CompareView
                documents={documents}
                initialDocAId={selectedDocIds[0] || activeDocId || undefined}
                initialDocBId={selectedDocIds[1] || undefined}
                onNavigateToChat={() => setCurrentView('chat')}
                onOpenUpload={() => setUploadOpen(true)}
              />
            </div>
          )}

          {currentView === 'knowledge-map' && (
            <div className="h-full overflow-hidden">
              <KnowledgeMapView
                documents={documents}
                onSelectDoc={(id) => {
                  setActiveDocId(id);
                  setCurrentView('documents');
                }}
                onNavigateToChat={() => setCurrentView('chat')}
              />
            </div>
          )}

          {currentView === 'pipeline' && (
            <div className="h-full overflow-y-auto">
              <PipelineView />
            </div>
          )}

          {currentView === 'evaluation' && (
            <div className="h-full overflow-y-auto">
              <EvaluationView documents={documents} messages={messages} />
            </div>
          )}
        </main>
      </div>

      {/* Upload Dialog */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={loadDocs}
      />

      {/* Settings Dialog (Section 15 & 17) */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Help & System Documentation Dialog (Section 15) */}
      <HelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  );
}

export function Workspace() {
  return (
    <ToastProvider>
      <WorkspaceInner />
    </ToastProvider>
  );
}
