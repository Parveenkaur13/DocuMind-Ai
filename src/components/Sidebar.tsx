import React from 'react';
import {
  FileText,
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  GitCompare,
  Compass,
  BarChart3,
  Cpu,
  Settings,
  HelpCircle,
  LogOut,
  X,
  Upload,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';

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

export type MainNavView =
  | 'dashboard'
  | 'documents'
  | 'chat'
  | 'study'
  | 'compare'
  | 'knowledge-map'
  | 'evaluation'
  | 'pipeline';

interface SidebarProps {
  currentView: MainNavView;
  onNavigate: (view: MainNavView) => void;
  documentsCount: number;
  onOpenUpload: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  currentView,
  onNavigate,
  documentsCount,
  onOpenUpload,
  onOpenSettings,
  onOpenHelp,
  open,
  onClose,
}: SidebarProps) {
  const { signOut, user } = useAuth();

  const navItems: Array<{
    id: MainNavView;
    label: string;
    icon: React.ElementType;
    badge?: string | number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', label: 'Documents', icon: FileText, badge: documentsCount },
    { id: 'chat', label: 'AI Chat (RAG)', icon: MessageSquare },
    { id: 'study', label: 'Study Mode', icon: BookOpen },
    { id: 'compare', label: 'Compare', icon: GitCompare },
    { id: 'knowledge-map', label: 'Knowledge Map', icon: Compass },
    { id: 'evaluation', label: 'Evaluation', icon: BarChart3 },
    { id: 'pipeline', label: 'AI Pipeline', icon: Cpu },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#0f322d] text-white flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-[#1c4e48]/40 shadow-xl lg:shadow-none flex-shrink-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3c8b7e] to-[#1c4e48] flex items-center justify-center text-white shadow-xs">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight leading-tight flex items-center gap-1.5">
                <span>DocuMind</span>
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-[#3c8b7e]/30 text-[#7dd3c4] border border-[#3c8b7e]/40">
                  AI
                </span>
              </div>
              <div className="text-[11px] text-white/60 tracking-wide mt-0.5">
                Document & Learning Assistant
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Upload Action */}
        <div className="p-3.5 pb-2">
          <button
            onClick={() => {
              onOpenUpload();
              onClose();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#3c8b7e] to-[#24635a] hover:from-[#439b8d] hover:to-[#2c776c] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer group"
          >
            <Upload className="w-3.5 h-3.5 text-[#a8ede1] group-hover:-translate-y-0.5 transition-transform" />
            <span>Upload Document</span>
          </button>
        </div>

        {/* Main Navigation (Section 15) */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-3 py-1">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-white/15 text-white shadow-2xs font-bold border border-white/15'
                    : 'text-white/70 hover:text-white hover:bg-white/8'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#7dd3c4]' : 'text-white/60'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#3c8b7e] text-white'
                        : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section: Settings, Help & Session (Section 15) */}
        <div className="p-3 border-t border-white/10 bg-[#0c2824]/60 space-y-1 flex-shrink-0">
          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/8 text-xs font-medium transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-[#7dd3c4]" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => {
              onOpenHelp();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/8 text-xs font-medium transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#7dd3c4]" />
            <span>Help & About</span>
          </button>

          {/* User profile / session */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between px-2 text-xs">
            <div className="min-w-0 pr-2">
              <div className="text-[11px] font-bold text-white truncate">
                {user?.email || 'Active Session'}
              </div>
              <div className="text-[10px] text-[#7dd3c4] flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3c8b7e] animate-pulse" />
                <span>Grounded RAG Active</span>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Sign Out / Switch Account"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
