import { useState } from 'react';
import { FileText, FilePlus2, MessageSquarePlus, LogOut, Search, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export interface DocItem {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  status: string;
  summary: string;
  extracted_text: string;
  created_at: string;
}

export interface ConvItem {
  id: string;
  title: string;
  updated_at: string;
}

interface SidebarProps {
  documents: DocItem[];
  conversations: ConvItem[];
  activeDocId: string | null;
  activeConvId: string | null;
  onSelectDoc: (id: string) => void;
  onSelectConv: (id: string) => void;
  onNewConversation: () => void;
  onUploadClick: () => void;
  isDemo: boolean;
  open: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  const colors: Record<string, string> = {
    pdf: 'bg-[#fbe9e8] text-[#c0413b]',
    docx: 'bg-[#e8f0fc] text-[#2563eb]',
    txt: 'bg-[#f3f4f6] text-[#5e7a76]',
    md: 'bg-[#f3f4f6] text-[#5e7a76]',
    csv: 'bg-[#ecfdf3] text-[#16a34a]',
    json: 'bg-[#fef9e8] text-[#b45309]',
  };
  return colors[type] ?? 'bg-[#f3f4f6] text-[#5e7a76]';
}

export function Sidebar(props: SidebarProps) {
  const { signOut } = useAuth();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'docs' | 'chats'>('docs');

  const filteredDocs = props.documents.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      {props.open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={props.onClose} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-[#0f322d] text-white flex flex-col transition-transform duration-300 ${props.open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/12 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="display text-lg font-700">DocuMind</span>
          </div>
          <button onClick={props.onClose} className="lg:hidden text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-2">
          <button
            onClick={props.onUploadClick}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#3c8b7e] hover:bg-[#4a9d8f] transition font-600 text-sm"
          >
            <FilePlus2 className="w-4 h-4" /> Upload document
          </button>
          <button
            onClick={props.onNewConversation}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/8 hover:bg-white/15 transition font-600 text-sm"
          >
            <MessageSquarePlus className="w-4 h-4" /> New conversation
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/8 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#3c8b7e]/50 transition"
            />
          </div>
        </div>

        <div className="flex gap-1 px-4 mb-1">
          <button
            onClick={() => setTab('docs')}
            className={`flex-1 text-sm py-1.5 rounded-md font-600 transition ${tab === 'docs' ? 'bg-white/12 text-white' : 'text-white/50 hover:text-white/80'}`}
          >
            Documents
          </button>
          <button
            onClick={() => setTab('chats')}
            className={`flex-1 text-sm py-1.5 rounded-md font-600 transition ${tab === 'chats' ? 'bg-white/12 text-white' : 'text-white/50 hover:text-white/80'}`}
          >
            Chats
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {tab === 'docs' ? (
            filteredDocs.length === 0 ? (
              <div className="text-center text-white/40 text-sm py-8">No documents found</div>
            ) : (
              <div className="space-y-1">
                {filteredDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => props.onSelectDoc(doc.id)}
                    className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition text-left ${props.activeDocId === doc.id ? 'bg-white/12' : 'hover:bg-white/8'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-700 uppercase ${fileIcon(doc.file_type)}`}>
                      {doc.file_type.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-500 truncate">{doc.name}</div>
                      <div className="text-xs text-white/40">{formatBytes(doc.file_size)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : props.conversations.length === 0 ? (
            <div className="text-center text-white/40 text-sm py-8">No conversations yet</div>
          ) : (
            <div className="space-y-1">
              {props.conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => props.onSelectConv(conv.id)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition text-left ${props.activeConvId === conv.id ? 'bg-white/12' : 'hover:bg-white/8'}`}
                >
                  <Sparkles className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-500 truncate">{conv.title}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/10">
          {props.isDemo && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-[#3c8b7e]/20 border border-[#3c8b7e]/30 text-xs text-[#7dd3c4]">
              Demo mode — sign up to save your own documents
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition text-sm font-500"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

