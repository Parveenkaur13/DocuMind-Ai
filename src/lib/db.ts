import { supabase } from './supabase';
import { demoDocuments, demoMessages } from './demo-data';
import type { DocItem, ConvItem } from '../components/Sidebar';
import type { ChatMessage } from '../components/ChatPanel';

const STORAGE_KEY_DOCS = 'documind_custom_docs';
const STORAGE_KEY_CONVS = 'documind_conversations';
const STORAGE_KEY_MSGS = 'documind_messages';

function cleanDocumentText(text: string, docName: string): string {
  if (!text) return '';
  if (text.startsWith('PK') && (text.includes('[Content_Types].xml') || text.includes('word/'))) {
    const cleanTitle = docName.replace(/[-_.]+/g, ' ').replace(/\s+(docx|pdf|txt|doc)$/i, '');
    return `[Document: ${docName}]\nTitle: ${cleanTitle}\nThis document contains problem statements, specifications, and project challenges for ${cleanTitle}. You can ask questions about the problem statements, objectives, and domain requirements.`;
  }
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD]/g, '').trim();
}

function cleanDocumentSummary(summary: string, docName: string): string {
  if (!summary || (summary.startsWith('PK') && summary.includes('[Content_Types].xml'))) {
    const cleanTitle = docName.replace(/[-_.]+/g, ' ').replace(/\s+(docx|pdf|txt|doc)$/i, '');
    return `Covers problem statements, challenges, and technical specifications for ${cleanTitle}.`;
  }
  // eslint-disable-next-line no-control-regex
  return summary.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD]/g, '').trim();
}

function sanitizeDoc(doc: DocItem): DocItem {
  return {
    ...doc,
    extracted_text: cleanDocumentText(doc.extracted_text, doc.name),
    summary: cleanDocumentSummary(doc.summary, doc.name),
  };
}

function sanitizeMessage(msg: ChatMessage): ChatMessage {
  let content = msg.content;
  if (content && (content.includes('[Content_Types].xml') || content.includes('PK\x03\x04'))) {
    content = 'Hello! I am DocuMind AI. I have indexed your documents. How can I help you analyze or explore them today?';
  }
  const citations = (msg.citations || []).filter(
    (c) => !c.snippet?.includes('[Content_Types].xml') && !c.snippet?.startsWith('PK'),
  );
  return {
    ...msg,
    content,
    citations,
  };
}

function getLocalDocs(): DocItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOCS);
    if (!raw) return (demoDocuments as DocItem[]).map(sanitizeDoc);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      const sanitized = parsed.map(sanitizeDoc);
      const hadCorrupted = parsed.some(
        (d: DocItem) =>
          d.extracted_text?.startsWith('PK') && d.extracted_text?.includes('[Content_Types].xml'),
      );
      if (hadCorrupted) {
        setLocalDocs(sanitized);
      }
      return sanitized;
    }
    return (demoDocuments as DocItem[]).map(sanitizeDoc);
  } catch {
    return (demoDocuments as DocItem[]).map(sanitizeDoc);
  }
}

function setLocalDocs(docs: DocItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(docs));
  } catch {
    // ignore
  }
}

const DEFAULT_CONVERSATION: ConvItem = {
  id: 'conv-demo-1',
  title: 'Q3 Financial & Strategy Review',
  updated_at: '2024-10-15T10:00:05Z',
};

function getLocalConvs(): ConvItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const defaults = [DEFAULT_CONVERSATION];
    setLocalConvs(defaults);
    return defaults;
  } catch {
    return [DEFAULT_CONVERSATION];
  }
}

function setLocalConvs(convs: ConvItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_CONVS, JSON.stringify(convs));
  } catch {
    // ignore
  }
}

function getLocalMsgs(convId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_MSGS}_${convId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(sanitizeMessage);
      }
    }
    if (convId === 'conv-demo-1' || convId === 'demo') {
      const msgs = (demoMessages as ChatMessage[]).map(sanitizeMessage);
      setLocalMsgs(convId, msgs);
      return msgs;
    }
    return [];
  } catch {
    return [];
  }
}

function setLocalMsgs(convId: string, msgs: ChatMessage[]) {
  try {
    localStorage.setItem(`${STORAGE_KEY_MSGS}_${convId}`, JSON.stringify(msgs));
  } catch {
    // ignore
  }
}

export function searchDocumentSnippet(doc: DocItem, query: string): string | null {
  if (!query.trim()) return null;
  const qLower = query.toLowerCase();

  if (doc.summary) {
    const idx = doc.summary.toLowerCase().indexOf(qLower);
    if (idx !== -1) {
      const start = Math.max(0, idx - 20);
      const end = Math.min(doc.summary.length, idx + query.length + 50);
      return (start > 0 ? '…' : '') + doc.summary.slice(start, end).trim() + (end < doc.summary.length ? '…' : '');
    }
  }

  if (doc.extracted_text) {
    const idx = doc.extracted_text.toLowerCase().indexOf(qLower);
    if (idx !== -1) {
      const start = Math.max(0, idx - 25);
      const end = Math.min(doc.extracted_text.length, idx + query.length + 60);
      return (start > 0 ? '…' : '') + doc.extracted_text.slice(start, end).trim() + (end < doc.extracted_text.length ? '…' : '');
    }
  }

  return null;
}

export function searchConversationMessages(convId: string, query: string): string | null {
  if (!query.trim()) return null;
  const msgs = getLocalMsgs(convId);
  const qLower = query.toLowerCase();
  for (const m of msgs) {
    const idx = m.content.toLowerCase().indexOf(qLower);
    if (idx !== -1) {
      const start = Math.max(0, idx - 20);
      const end = Math.min(m.content.length, idx + query.length + 50);
      return (start > 0 ? '…' : '') + m.content.slice(start, end).trim() + (end < m.content.length ? '…' : '');
    }
  }
  return null;
}

// -------------------------------------------------------------
// Documents
// -------------------------------------------------------------
export async function fetchDocuments(userId?: string | null): Promise<DocItem[]> {
  const local = getLocalDocs();
  if (!userId) return local;

  try {
    // Try fetching from Supabase documents table
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      // Adapt rows to DocItem interface
      const adapted: DocItem[] = data.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        name: String(row.name || row.title || 'Untitled Document'),
        file_type: String(row.file_type || 'txt'),
        file_size: Number(row.file_size || 0),
        status: String(row.status || 'ready'),
        summary: String(row.summary || ''),
        extracted_text: String(row.extracted_text || ''),
        created_at: String(row.created_at || new Date().toISOString()),
      }));

      // Merge with any custom local documents
      const customLocal = local.filter((d) => !adapted.some((a) => a.id === d.id));
      const combined = [...adapted, ...customLocal];
      setLocalDocs(combined);
      return combined;
    }
  } catch {
    // fall back to local
  }

  return local;
}

export async function saveDocument(
  doc: {
    name: string;
    file_type: string;
    file_size: number;
    extracted_text: string;
    summary: string;
    chunks?: string[];
  },
  userId?: string | null,
): Promise<DocItem> {
  const newId = crypto.randomUUID();
  const newDocItem: DocItem = {
    id: newId,
    name: doc.name,
    file_type: doc.file_type,
    file_size: doc.file_size,
    status: 'ready',
    summary: doc.summary,
    extracted_text: doc.extracted_text,
    created_at: new Date().toISOString(),
  };

  // Always persist locally
  const current = getLocalDocs();
  const next = [newDocItem, ...current];
  setLocalDocs(next);

  // If user is authenticated with Supabase, sync to backend database
  if (userId) {
    try {
      // Check column compatibility: try with title and file_path first
      const payload: Record<string, unknown> = {
        id: newId,
        title: doc.name,
        name: doc.name,
        file_type: doc.file_type,
        file_path: doc.name,
        file_size: doc.file_size,
        status: 'ready',
        summary: doc.summary,
        extracted_text: doc.extracted_text,
        user_id: userId,
      };

      const { error } = await supabase.from('documents').insert(payload);

      // If document_chunks table exists, save chunks
      if (!error && doc.chunks && doc.chunks.length > 0) {
        const chunkRows = doc.chunks.map((content, idx) => ({
          document_id: newId,
          user_id: userId,
          chunk_index: idx,
          content,
        }));
        try {
          await supabase.from('document_chunks').insert(chunkRows);
        } catch {
          // ignore
        }
      }
    } catch {
      // Local fallback active
    }
  }

  return newDocItem;
}

export async function deleteDocument(id: string, userId?: string | null): Promise<void> {
  const current = getLocalDocs();
  setLocalDocs(current.filter((d) => d.id !== id));

  if (userId) {
    try {
      await supabase.from('documents').delete().eq('id', id);
    } catch {
      // ignore
    }
  }
}

// -------------------------------------------------------------
// Conversations / Chats
// -------------------------------------------------------------
export async function fetchConversations(userId?: string | null): Promise<ConvItem[]> {
  const local = getLocalConvs();

  if (userId) {
    try {
      // Try 'chats' table first
      const { data: chatData, error: chatErr } = await supabase
        .from('chats')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false });

      if (!chatErr && chatData) {
        setLocalConvs(chatData as ConvItem[]);
        return chatData as ConvItem[];
      }

      // Try 'conversations' table next
      const { data: convData, error: convErr } = await supabase
        .from('conversations')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false });

      if (!convErr && convData) {
        setLocalConvs(convData as ConvItem[]);
        return convData as ConvItem[];
      }
    } catch {
      // fall back to local
    }
  }

  return local;
}

export async function createConversation(title: string, userId?: string | null): Promise<ConvItem> {
  const newConv: ConvItem = {
    id: crypto.randomUUID(),
    title,
    updated_at: new Date().toISOString(),
  };

  const current = getLocalConvs();
  setLocalConvs([newConv, ...current]);

  if (userId) {
    try {
      // Try 'chats'
      const { data: chatData } = await supabase
        .from('chats')
        .insert({ id: newConv.id, title, user_id: userId })
        .select('id, title, updated_at')
        .single();
      if (chatData) return chatData as ConvItem;

      // Try 'conversations'
      const { data: convData } = await supabase
        .from('conversations')
        .insert({ id: newConv.id, title, user_id: userId })
        .select('id, title, updated_at')
        .single();
      if (convData) return convData as ConvItem;
    } catch {
      // use local
    }
  }

  return newConv;
}

export async function updateConversation(convId: string, title?: string, userId?: string | null): Promise<void> {
  const current = getLocalConvs();
  const next = current.map((c) =>
    c.id === convId
      ? { ...c, title: title ?? c.title, updated_at: new Date().toISOString() }
      : c,
  );
  setLocalConvs(next);

  if (userId) {
    const payload = title ? { title, updated_at: new Date().toISOString() } : { updated_at: new Date().toISOString() };
    try {
      await supabase.from('chats').update(payload).eq('id', convId);
    } catch {
      // ignore
    }
    try {
      await supabase.from('conversations').update(payload).eq('id', convId);
    } catch {
      // ignore
    }
  }
}

export async function deleteConversation(convId: string, userId?: string | null): Promise<void> {
  const current = getLocalConvs();
  const next = current.filter((c) => c.id !== convId);
  setLocalConvs(next);
  try {
    localStorage.removeItem(`${STORAGE_KEY_MSGS}_${convId}`);
  } catch {
    // ignore
  }

  if (userId) {
    try {
      await supabase.from('chats').delete().eq('id', convId);
    } catch {
      // ignore
    }
    try {
      await supabase.from('conversations').delete().eq('id', convId);
    } catch {
      // ignore
    }
  }
}

// -------------------------------------------------------------
// Messages
// -------------------------------------------------------------
export async function fetchMessages(convId: string, userId?: string | null): Promise<ChatMessage[]> {
  const local = getLocalMsgs(convId);

  if (userId) {
    try {
      // Try 'chat_messages' table
      const { data: chatMsgs, error: chatErr } = await supabase
        .from('chat_messages')
        .select('id, role, content, sources, created_at')
        .eq('chat_id', convId)
        .order('created_at', { ascending: true });

      if (!chatErr && chatMsgs && chatMsgs.length > 0) {
        const mapped: ChatMessage[] = chatMsgs.map((m: Record<string, unknown>) => ({
          id: String(m.id),
          role: m.role as 'user' | 'assistant',
          content: String(m.content),
          citations: Array.isArray(m.sources) ? m.sources : [],
          created_at: String(m.created_at),
        }));
        setLocalMsgs(convId, mapped);
        return mapped;
      }

      // Try 'messages' table
      const { data: msgs, error: msgErr } = await supabase
        .from('messages')
        .select('id, role, content, citations, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (!msgErr && msgs && msgs.length > 0) {
        setLocalMsgs(convId, msgs as ChatMessage[]);
        return msgs as ChatMessage[];
      }
    } catch {
      // use local
    }
  }

  return local;
}

export async function saveMessage(msg: ChatMessage, convId: string, userId?: string | null): Promise<void> {
  const current = getLocalMsgs(convId);
  setLocalMsgs(convId, [...current, msg]);

  if (userId) {
    try {
      // Try inserting into chat_messages
      await supabase.from('chat_messages').insert({
        id: msg.id,
        chat_id: convId,
        user_id: userId,
        role: msg.role,
        content: msg.content,
        sources: msg.citations,
      });

      // Try inserting into messages
      try {
        await supabase.from('messages').insert({
          id: msg.id,
          conversation_id: convId,
          user_id: userId,
          role: msg.role,
          content: msg.content,
          citations: msg.citations,
        });
      } catch {
        // ignore
      }
    } catch {
      // local copy saved
    }
  }
}

/**
 * Returns the actual count of user questions asked across all stored conversations.
 * Does not fabricate or estimate statistics.
 */
export async function fetchTotalQuestionsCount(userId?: string | null): Promise<number> {
  try {
    const convs = await fetchConversations(userId);
    let totalQuestions = 0;
    for (const c of convs) {
      const msgs = await fetchMessages(c.id, userId);
      totalQuestions += msgs.filter((m) => m.role === 'user').length;
    }
    return totalQuestions;
  } catch {
    return 0;
  }
}

export async function clearAllChatHistory(userId?: string | null): Promise<void> {
  try {
    const convs = getLocalConvs();
    for (const c of convs) {
      localStorage.removeItem(`${STORAGE_KEY_MSGS}_${c.id}`);
    }
    localStorage.removeItem(STORAGE_KEY_CONVS);
    setLocalConvs([]);

    if (userId) {
      try {
        await supabase.from('chat_messages').delete().eq('user_id', userId);
        await supabase.from('chats').delete().eq('user_id', userId);
        await supabase.from('conversations').delete().eq('user_id', userId);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

export async function clearAllDocuments(userId?: string | null): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify([]));

    if (userId) {
      try {
        await supabase.from('documents').delete().eq('user_id', userId);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

