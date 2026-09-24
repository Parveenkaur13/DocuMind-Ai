import { useState, useEffect, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { demoDocuments, demoMessages } from '@/lib/demo-data';
import { Sidebar, type DocItem, type ConvItem } from '@/components/Sidebar';
import { ChatPanel, type ChatMessage } from '@/components/ChatPanel';
import { DocumentView } from '@/components/DocumentView';
import { UploadModal } from '@/components/UploadModal';

export function Workspace() {
  const { user } = useAuth();
  const isDemo = !user;

  const [documents, setDocuments] = useState<DocItem[]>(demoDocuments as DocItem[]);
  const [conversations, setConversations] = useState<ConvItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(demoMessages as ChatMessage[]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [convLoaded, setConvLoaded] = useState<Record<string, ChatMessage[]>>({});

  const seedDemoDocuments = useCallback(async () => {
    if (!user) return;
    for (const doc of demoDocuments) {
      await supabase.from('documents').insert({
        name: doc.name,
        file_type: doc.file_type,
        file_size: doc.file_size,
        status: 'ready',
        extracted_text: doc.extracted_text,
        summary: doc.summary,
        user_id: user.id,
      });
    }
  }, [user]);

  const loadDocuments = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('documents')
      .select('id, name, file_type, file_size, status, summary, extracted_text, created_at')
      .order('created_at', { ascending: false });
    if (!error && data) {
      if (data.length === 0) {
        await seedDemoDocuments();
        const { data: seeded } = await supabase
          .from('documents')
          .select('id, name, file_type, file_size, status, summary, extracted_text, created_at')
          .order('created_at', { ascending: false });
        if (seeded) setDocuments(seeded as DocItem[]);
      } else {
        setDocuments(data as DocItem[]);
      }
    }
  }, [user, seedDemoDocuments]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false });
    if (!error && data) setConversations(data as ConvItem[]);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDocuments();
      loadConversations();
    }
  }, [user, loadDocuments, loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    if (convLoaded[convId]) {
      setMessages(convLoaded[convId]);
      return;
    }
    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, citations, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      const msgs = data as ChatMessage[];
      setConvLoaded((prev) => ({ ...prev, [convId]: msgs }));
      setMessages(msgs);
    } else {
      setMessages([]);
    }
  }, [convLoaded]);

  const persistMessage = useCallback(async (msg: ChatMessage, convId: string) => {
    if (!user) return;
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: msg.role,
      content: msg.content,
      citations: msg.citations,
      user_id: user.id,
    });
  }, [user]);

  const handleSendMessage = useCallback(async (msg: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      if (user && activeConvId) {
        convLoaded[activeConvId] = next;
        persistMessage(msg, activeConvId);
        if (msg.role === 'user' && prev.length === 0) {
          supabase.from('conversations').update({ title: msg.content.slice(0, 60), updated_at: new Date().toISOString() }).eq('id', activeConvId).then(() => loadConversations());
        } else {
          supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvId).then(() => loadConversations());
        }
      }
      return next;
    });
  }, [user, activeConvId, persistMessage, loadConversations, convLoaded]);

  const handleNewConversation = useCallback(async () => {
    if (!user) {
      setMessages([]);
      setActiveConvId(null);
      return;
    }
    const title = 'New conversation';
    const { data, error } = await supabase
      .from('conversations')
      .insert({ title, user_id: user.id })
      .select('id, title, updated_at')
      .single();
    if (!error && data) {
      const newConv = data as ConvItem;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      setMessages([]);
      setConvLoaded((prev) => ({ ...prev, [newConv.id]: [] }));
    }
  }, [user]);

  const handleSelectConv = useCallback((convId: string) => {
    setActiveConvId(convId);
    loadMessages(convId);
    setSidebarOpen(false);
  }, [loadMessages]);

  const handleDeleteDoc = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('documents').delete().eq('id', id);
    loadDocuments();
  }, [user, loadDocuments]);

  const activeDoc = activeDocId ? documents.find((d) => d.id === activeDocId) ?? null : null;
  const conversationTitle = conversations.find((c) => c.id === activeConvId)?.title ?? (messages.length > 0 ? 'Conversation' : 'New conversation');

  return (
    <div className="h-screen flex bg-[#f4f7f7] overflow-hidden">
      <Sidebar
        documents={documents}
        conversations={conversations}
        activeDocId={activeDocId}
        activeConvId={activeConvId}
        onSelectDoc={(id) => { setActiveDocId(id); setSidebarOpen(false); }}
        onSelectConv={handleSelectConv}
        onNewConversation={handleNewConversation}
        onUploadClick={() => setUploadOpen(true)}
        isDemo={isDemo}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex min-w-0">
        <div className="flex-1 flex flex-col min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden absolute top-3 left-3 z-20 w-9 h-9 rounded-lg bg-white border border-[#e8efed] flex items-center justify-center text-[#183237] shadow-sm"
          >
            <Menu className="w-5 h-5" />
          </button>
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            documents={documents}
            selectedDocId={activeDocId}
            onSelectDoc={setActiveDocId}
            isDemo={isDemo}
            conversationTitle={conversationTitle}
          />
        </div>

        {activeDoc && (
          <DocumentView
            doc={activeDoc}
            onClose={() => setActiveDocId(null)}
            onDelete={handleDeleteDoc}
            onUploadClick={() => setUploadOpen(true)}
          />
        )}
      </div>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={loadDocuments}
      />

    </div>
  );
}
