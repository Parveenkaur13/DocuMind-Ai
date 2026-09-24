import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, FileText, Loader2, MessageSquare, Quote } from 'lucide-react';
import { askDocuMind } from '@/lib/ai';
import type { DocItem } from './Sidebar';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Array<{ document_id: string; document_name: string; snippet: string }>;
  created_at: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (msg: ChatMessage) => void;
  documents: DocItem[];
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  isDemo: boolean;
  conversationTitle: string;
}

const suggestions = [
  'What was the revenue growth in Q3?',
  'Summarize the product launch strategy',
  'What are the PTO policies?',
  'What are the top customer pain points?',
];

export function ChatPanel({ messages, onSendMessage, documents, selectedDocId, onSelectDoc, isDemo, conversationTitle }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      citations: [],
      created_at: new Date().toISOString(),
    };
    onSendMessage(userMsg);
    setInput('');

    const docsToSearch = selectedDocId
      ? documents.filter((d) => d.id === selectedDocId)
      : documents;

    try {
      const result = await askDocuMind(
        text,
        docsToSearch.map((d) => ({ id: d.id, name: d.name, extracted_text: d.extracted_text })),
      );
      onSendMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer,
        citations: result.citations,
        created_at: new Date().toISOString(),
      });
    } catch {
      onSendMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Something went wrong generating a response. Please try again.',
        citations: [],
        created_at: new Date().toISOString(),
      });
    } finally {
      setBusy(false);
    }
  };

  const activeDoc = selectedDocId ? documents.find((d) => d.id === selectedDocId) : null;

  return (
    <div className="flex-1 flex flex-col bg-[#f4f7f7] min-w-0">
      <div className="px-5 py-3.5 border-b border-[#e8efed] bg-white flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#e8f4f1] flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-[#1c4e48]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="display font-700 text-[#183237] truncate">{conversationTitle}</h2>
          <p className="text-xs text-[#5e7a76]">
            {activeDoc ? `Scoped to: ${activeDoc.name}` : `Searching across ${documents.length} document${documents.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {isDemo && (
          <div className="text-xs px-2.5 py-1 rounded-full bg-[#e8f4f1] text-[#1c4e48] font-600">
            Demo
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[#e8f4f1] flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-8 h-8 text-[#1c4e48]" />
            </div>
            <h3 className="display text-xl font-700 text-[#183237] mb-2">Ask anything about your documents</h3>
            <p className="text-[#5e7a76] text-sm mb-6 max-w-md mx-auto">
              I'll search through your uploaded files and give you grounded answers with citations.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-xl bg-white border border-[#e8efed] hover:border-[#9bbcb6] hover:shadow-sm transition text-sm text-[#183237] font-500"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-[#1c4e48] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1c4e48] text-white rounded-tr-sm'
                      : 'bg-white border border-[#e8efed] text-[#183237] rounded-tl-sm'
                  }`}>
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                    ))}
                  </div>
                  {msg.citations.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="text-xs font-600 text-[#5e7a76] flex items-center gap-1.5">
                        <Quote className="w-3.5 h-3.5" /> Sources
                      </div>
                      {msg.citations.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => onSelectDoc(c.document_id)}
                          className="block w-full text-left px-3 py-2 rounded-lg bg-[#f0f7f5] border border-[#d4e0dd] hover:border-[#9bbcb6] transition"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-[#3c8b7e] flex-shrink-0" />
                            <span className="text-xs font-600 text-[#183237] truncate">{c.document_name}</span>
                          </div>
                          <p className="text-xs text-[#5e7a76] mt-1 line-clamp-2">{c.snippet}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1c4e48] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-[#e8efed]">
                  <Loader2 className="w-4 h-4 text-[#3c8b7e] animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 py-4 border-t border-[#e8efed] bg-white">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents…"
              className="flex-1 px-4 py-3 rounded-xl border border-[#d4e0dd] bg-[#f8fbfa] text-[#183237] focus:outline-none focus:ring-2 focus:ring-[#3c8b7e] focus:border-transparent transition"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="px-4 py-3 rounded-xl bg-[#1c4e48] text-white hover:bg-[#163d38] transition disabled:opacity-40 flex items-center gap-2 font-600"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          <p className="text-xs text-[#9bbcb6] text-center mt-2">
            Answers are generated from your documents. Always verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
