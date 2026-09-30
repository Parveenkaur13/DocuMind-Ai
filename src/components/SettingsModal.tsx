import React, { useState } from 'react';
import {
  X,
  User,
  Sparkles,
  Award,
  Sliders,
  Sun,
  Moon,
  Monitor,
  Trash2,
  Info,
  Check,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useToast } from './Toast';
import { clearAllChatHistory, clearAllDocuments } from '../lib/db';
import type { AIMode, StudyDifficulty } from '../lib/ai';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onClearChatHistory?: () => void;
  onClearDocumentData?: () => void;
}

type SettingsSection =
  | 'profile'
  | 'ai_style'
  | 'study'
  | 'preferences'
  | 'appearance'
  | 'data'
  | 'about';

interface UserProfile {
  name: string;
  role: string;
  field: string;
  language: string;
}

interface DocSettings {
  autoSummarizeOnUpload: boolean;
  citationCount: number;
  strictGrounding: boolean;
}

interface ChatPrefs {
  showCitationSnippets: boolean;
  streamAnimation: boolean;
  sendOnEnter: boolean;
}

export function SettingsModal({
  open,
  onClose,
  onClearChatHistory,
  onClearDocumentData,
}: SettingsModalProps) {
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<SettingsSection>('ai_style');

  // Profile State
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('documind_user_profile');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { name: 'Learner', role: 'Student', field: 'General Studies', language: 'English' };
  });

  // AI Response Style State
  const [aiStyle, setAiStyle] = useState<AIMode>(() => {
    const saved = localStorage.getItem('documind_ai_mode') as AIMode;
    return saved || 'student';
  });

  // Default Study Difficulty State
  const [studyDifficulty, setStudyDifficulty] = useState<StudyDifficulty>(() => {
    const saved = localStorage.getItem('documind_study_difficulty') as StudyDifficulty;
    return saved || 'intermediate';
  });

  // Document Settings State
  const [docSettings, setDocSettings] = useState<DocSettings>(() => {
    try {
      const saved = localStorage.getItem('documind_doc_settings');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { autoSummarizeOnUpload: true, citationCount: 5, strictGrounding: true };
  });

  // Chat Preferences State
  const [chatPrefs, setChatPrefs] = useState<ChatPrefs>(() => {
    try {
      const saved = localStorage.getItem('documind_chat_prefs');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { showCitationSnippets: true, streamAnimation: true, sendOnEnter: true };
  });

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('documind_theme') as 'light' | 'dark' | 'system') || 'light';
  });

  // Confirmation dialogs
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [showClearDocsConfirm, setShowClearDocsConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Apply theme change
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('documind_theme', newTheme);

    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
    showToast(`Theme set to ${newTheme}`, 'info');
  };

  // Save profile
  const handleSaveProfile = () => {
    localStorage.setItem('documind_user_profile', JSON.stringify(profile));
    showToast('Profile updated successfully', 'success');
  };

  // Save AI style
  const handleAiStyleChange = (style: AIMode) => {
    setAiStyle(style);
    localStorage.setItem('documind_ai_mode', style);
    showToast(`AI Response style set to ${style.toUpperCase()}`, 'success');
  };

  // Save Study Difficulty
  const handleDifficultyChange = (diff: StudyDifficulty) => {
    setStudyDifficulty(diff);
    localStorage.setItem('documind_study_difficulty', diff);
    showToast(`Default study difficulty set to ${diff.toUpperCase()}`, 'success');
  };

  // Save doc settings
  const handleDocSettingsChange = (partial: Partial<DocSettings>) => {
    const updated = { ...docSettings, ...partial };
    setDocSettings(updated);
    localStorage.setItem('documind_doc_settings', JSON.stringify(updated));
    showToast('Document settings saved', 'success');
  };

  // Save chat prefs
  const handleChatPrefsChange = (partial: Partial<ChatPrefs>) => {
    const updated = { ...chatPrefs, ...partial };
    setChatPrefs(updated);
    localStorage.setItem('documind_chat_prefs', JSON.stringify(updated));
    showToast('Chat preferences saved', 'success');
  };

  // Clear chat history
  const handleClearChatHistory = async () => {
    setIsClearing(true);
    try {
      await clearAllChatHistory();
      if (onClearChatHistory) onClearChatHistory();
      setShowClearChatConfirm(false);
      showToast('All chat history cleared successfully', 'success');
    } catch {
      showToast('Failed to clear chat history', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  // Clear document data
  const handleClearDocumentData = async () => {
    setIsClearing(true);
    try {
      await clearAllDocuments();
      if (onClearDocumentData) onClearDocumentData();
      setShowClearDocsConfirm(false);
      showToast('All document data removed', 'success');
    } catch {
      showToast('Failed to clear document data', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0e2a27]/60 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-[#d4e0dd] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8efed] bg-gradient-to-b from-white to-[#fbfdfd] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center">
              <Sliders className="w-4 h-4 text-[#3c8b7e]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#183237]">DocuMind AI Settings</h3>
              <p className="text-xs text-[#5e7a76]">Customize AI behavior, preferences & study defaults</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Sidebar Navigation + Settings Panel */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Settings Nav */}
          <nav className="w-full md:w-52 p-3 bg-[#f8fbfa] border-r border-[#e8efed] flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto flex-shrink-0 text-xs">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'ai_style', label: 'AI Response Style', icon: Sparkles },
              { id: 'study', label: 'Study Difficulty', icon: Award },
              { id: 'preferences', label: 'Document & Chat', icon: Sliders },
              { id: 'appearance', label: 'Theme / Appearance', icon: Sun },
              { id: 'data', label: 'Data & Storage', icon: Trash2 },
              { id: 'about', label: 'About DocuMind AI', icon: Info },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as SettingsSection)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1c4e48] text-white shadow-2xs'
                      : 'text-[#5e7a76] hover:text-[#183237] hover:bg-[#edf3f1]'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Section Detail Panel */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto text-xs space-y-5">
            {/* 1. PROFILE */}
            {activeSection === 'profile' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">Learner Profile</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Personalize how DocuMind AI addresses and tailors explanations to your field.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-[#183237] block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#f8fbfa] border border-[#d4e0dd] text-xs text-[#183237] focus:outline-none focus:border-[#3c8b7e]"
                      placeholder="e.g. Alex Morgan"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[#183237] block mb-1">Role / Persona</label>
                      <select
                        value={profile.role}
                        onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#f8fbfa] border border-[#d4e0dd] text-xs text-[#183237] focus:outline-none focus:border-[#3c8b7e]"
                      >
                        <option value="Student">Student (Undergrad / Postgrad)</option>
                        <option value="Researcher">Researcher / Academic</option>
                        <option value="Professional">Corporate / Professional</option>
                        <option value="Educator">Educator / Instructor</option>
                        <option value="General Learner">Self-Directed Learner</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-[#183237] block mb-1">Field of Study / Domain</label>
                      <input
                        type="text"
                        value={profile.field}
                        onChange={(e) => setProfile({ ...profile, field: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#f8fbfa] border border-[#d4e0dd] text-xs text-[#183237] focus:outline-none focus:border-[#3c8b7e]"
                        placeholder="e.g. Computer Science, Medicine, Law"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#183237] block mb-1">Preferred Language</label>
                    <select
                      value={profile.language}
                      onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#f8fbfa] border border-[#d4e0dd] text-xs text-[#183237] focus:outline-none focus:border-[#3c8b7e]"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish (Español)</option>
                      <option value="French">French (Français)</option>
                      <option value="German">German (Deutsch)</option>
                      <option value="Hindi">Hindi (हिन्दी)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-[#7dd3c4]" />
                    <span>Save Profile</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. AI RESPONSE STYLE */}
            {activeSection === 'ai_style' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">AI Response Style</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Select how DocuMind AI answers questions and structures knowledge retrieval.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'simple',
                      title: 'Simple',
                      badge: 'Everyday',
                      desc: 'Everyday terms, concise answers, and easy-to-grasp takeaways without jargon.',
                    },
                    {
                      id: 'student',
                      title: 'Student',
                      badge: 'Recommended',
                      desc: 'Educational, guided step-by-step reasoning with intuitive analogies and clear summaries.',
                    },
                    {
                      id: 'technical',
                      title: 'Technical',
                      badge: 'Rigorous',
                      desc: 'Engineering-level precision, exact formulas, architectural details, and strict metrics.',
                    },
                    {
                      id: 'detailed',
                      title: 'Detailed',
                      badge: 'Exhaustive',
                      desc: 'Comprehensive deep dives, multi-paragraph context, edge cases, and systemic implications.',
                    },
                  ].map((style) => {
                    const isSelected = aiStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        onClick={() => handleAiStyleChange(style.id as AIMode)}
                        className={`p-3.5 rounded-2xl border text-left transition cursor-pointer space-y-1.5 flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#f0f7f5] border-[#3c8b7e] shadow-2xs ring-1 ring-[#3c8b7e]'
                            : 'bg-white border-[#d4e0dd] hover:border-[#3c8b7e]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#183237]">{style.title}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-[#1c4e48] text-white'
                                : 'bg-[#e8f4f1] text-[#1c4e48]'
                            }`}
                          >
                            {style.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5e7a76] leading-relaxed">{style.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. DEFAULT STUDY DIFFICULTY */}
            {activeSection === 'study' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">Default Study Difficulty</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Sets the default academic depth when generating flashcards, MCQs, and revision notes.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'beginner',
                      title: 'Beginner (Foundational)',
                      desc: 'Intuitive definitions, fundamental rules, and clear conceptual grounding.',
                    },
                    {
                      id: 'intermediate',
                      title: 'Intermediate (Standard)',
                      desc: 'Standard academic rigor balancing practical examples and analytical depth.',
                    },
                    {
                      id: 'advanced',
                      title: 'Advanced (Deep Dive)',
                      desc: 'Complex system dynamics, architectural nuances, edge cases, and metric proofs.',
                    },
                    {
                      id: 'exam_oriented',
                      title: 'Exam-Oriented (High-Yield)',
                      desc: 'Revision-focused bullet points, marking schemes, definitions, and frequent questions.',
                    },
                  ].map((diff) => {
                    const isSelected = studyDifficulty === diff.id;
                    return (
                      <button
                        key={diff.id}
                        onClick={() => handleDifficultyChange(diff.id as StudyDifficulty)}
                        className={`p-3.5 rounded-2xl border text-left transition cursor-pointer space-y-1.5 ${
                          isSelected
                            ? 'bg-[#f0f7f5] border-[#3c8b7e] shadow-2xs ring-1 ring-[#3c8b7e]'
                            : 'bg-white border-[#d4e0dd] hover:border-[#3c8b7e]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#183237]">{diff.title}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#3c8b7e]" />}
                        </div>
                        <p className="text-[11px] text-[#5e7a76] leading-relaxed">{diff.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. DOCUMENT & CHAT PREFERENCES */}
            {activeSection === 'preferences' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">Default Document Settings</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Configure extraction and indexing behavior for uploaded files.
                  </p>
                </div>

                <div className="space-y-3 bg-[#f8fbfa] p-4 rounded-2xl border border-[#e8efed]">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="font-bold text-[#183237] block">Auto-Generate Summary on Upload</span>
                      <span className="text-[11px] text-[#5e7a76]">
                        Automatically summarize key insights immediately when a file is processed.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={docSettings.autoSummarizeOnUpload}
                      onChange={(e) => handleDocSettingsChange({ autoSummarizeOnUpload: e.target.checked })}
                      className="w-4 h-4 text-[#1c4e48] rounded accent-[#1c4e48] cursor-pointer"
                    />
                  </label>

                  <div className="border-t border-[#e8efed] pt-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#183237] block">Citations Retrieved per Query</span>
                      <span className="text-[11px] text-[#5e7a76]">
                        Number of relevant excerpts retrieved for RAG grounding.
                      </span>
                    </div>
                    <select
                      value={docSettings.citationCount}
                      onChange={(e) => handleDocSettingsChange({ citationCount: Number(e.target.value) })}
                      className="bg-white border border-[#d4e0dd] rounded-lg px-2.5 py-1 text-xs text-[#183237]"
                    >
                      <option value={3}>3 excerpts (Fast)</option>
                      <option value={5}>5 excerpts (Balanced)</option>
                      <option value={8}>8 excerpts (Deep)</option>
                    </select>
                  </div>

                  <label className="border-t border-[#e8efed] pt-2 flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="font-bold text-[#183237] block">Strict Grounding Guardrails</span>
                      <span className="text-[11px] text-[#5e7a76]">
                        Enforce zero hallucination — reply strictly from documents and disclaim missing data.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={docSettings.strictGrounding}
                      onChange={(e) => handleDocSettingsChange({ strictGrounding: e.target.checked })}
                      className="w-4 h-4 text-[#1c4e48] rounded accent-[#1c4e48] cursor-pointer"
                    />
                  </label>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#183237]">Chat Preferences</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Customize your interactive conversational workspace.
                  </p>
                </div>

                <div className="space-y-3 bg-[#f8fbfa] p-4 rounded-2xl border border-[#e8efed]">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="font-bold text-[#183237] block">Show Citation Snippets in Chat</span>
                      <span className="text-[11px] text-[#5e7a76]">
                        Display verified source previews directly below AI answers.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={chatPrefs.showCitationSnippets}
                      onChange={(e) => handleChatPrefsChange({ showCitationSnippets: e.target.checked })}
                      className="w-4 h-4 text-[#1c4e48] rounded accent-[#1c4e48] cursor-pointer"
                    />
                  </label>

                  <label className="border-t border-[#e8efed] pt-2 flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="font-bold text-[#183237] block">Press Enter to Send</span>
                      <span className="text-[11px] text-[#5e7a76]">
                        Use Enter to submit questions, Shift + Enter for newline.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={chatPrefs.sendOnEnter}
                      onChange={(e) => handleChatPrefsChange({ sendOnEnter: e.target.checked })}
                      className="w-4 h-4 text-[#1c4e48] rounded accent-[#1c4e48] cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 5. THEME / APPEARANCE */}
            {activeSection === 'appearance' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">Appearance & Theme</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Select your preferred interface display mode.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Monitor },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleThemeChange(t.id as 'light' | 'dark' | 'system')}
                        className={`p-4 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 ${
                          isSelected
                            ? 'bg-[#f0f7f5] border-[#3c8b7e] shadow-2xs ring-1 ring-[#3c8b7e] font-bold text-[#1c4e48]'
                            : 'bg-white border-[#d4e0dd] text-[#5e7a76] hover:border-[#3c8b7e] hover:text-[#183237]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. DATA & STORAGE MANAGEMENT */}
            {activeSection === 'data' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-bold text-[#183237]">Data & Storage Management</h4>
                  <p className="text-xs text-[#5e7a76] mt-0.5">
                    Manage your locally indexed conversations and uploaded document cache.
                  </p>
                </div>

                {/* Clear Chat History Section */}
                <div className="p-4 rounded-2xl bg-white border border-[#e2ece9] shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-[#183237] text-xs">Clear Chat History</h5>
                      <p className="text-[11px] text-[#5e7a76]">
                        Deletes all saved conversation threads and messages from this workspace.
                      </p>
                    </div>
                    {!showClearChatConfirm ? (
                      <button
                        onClick={() => setShowClearChatConfirm(true)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                      >
                        Clear Chats
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleClearChatHistory}
                          disabled={isClearing}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Confirm Clear
                        </button>
                        <button
                          onClick={() => setShowClearChatConfirm(false)}
                          className="px-2 py-1.5 rounded-xl text-[#5e7a76] hover:text-[#183237] text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Clear Document Data Section */}
                <div className="p-4 rounded-2xl bg-white border border-[#e2ece9] shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-[#183237] text-xs">Clear Document Data</h5>
                      <p className="text-[11px] text-[#5e7a76]">
                        Removes all indexed document records, text chunks, and cached study materials.
                      </p>
                    </div>
                    {!showClearDocsConfirm ? (
                      <button
                        onClick={() => setShowClearDocsConfirm(true)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                      >
                        Clear Documents
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleClearDocumentData}
                          disabled={isClearing}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Confirm Clear
                        </button>
                        <button
                          onClick={() => setShowClearDocsConfirm(false)}
                          className="px-2 py-1.5 rounded-xl text-[#5e7a76] hover:text-[#183237] text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 7. ABOUT DOCUMIND AI */}
            {activeSection === 'about' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-2xl bg-[#f0f7f5] border border-[#d2ebe5] space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#1c4e48] text-white flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4 text-[#7dd3c4]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#183237]">DocuMind AI</h4>
                      <span className="text-[10px] text-[#3c8b7e] font-semibold">Version 2.4.0 (Production Grounded)</span>
                    </div>
                  </div>
                  <p className="text-[#235850] text-xs leading-relaxed font-medium">
                    “DocuMind AI is an AI-powered document intelligence and personalized learning assistant that uses document retrieval and generative AI to help users understand, search, summarize, compare, and learn from their documents.”
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <h5 className="font-bold text-[#183237] uppercase tracking-wider text-[11px]">System Architecture</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-[#f8fbfa] border border-[#e8efed]">
                      <span className="font-bold text-[#1c4e48] block">Hybrid Retrieval</span>
                      <span className="text-[#5e7a76]">Dense embeddings + BM25 keyword index</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#f8fbfa] border border-[#e8efed]">
                      <span className="font-bold text-[#1c4e48] block">Zero-Hallucination Guard</span>
                      <span className="text-[#5e7a76]">Grounded citations with relevance scoring</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#f8fbfa] border border-[#e8efed]">
                      <span className="font-bold text-[#1c4e48] block">Study Studio</span>
                      <span className="text-[#5e7a76]">MCQs, Flashcards, Summaries, and Viva prep</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#f8fbfa] border border-[#e8efed]">
                      <span className="font-bold text-[#1c4e48] block">Local Privacy</span>
                      <span className="text-[#5e7a76]">Private workspace isolation</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#f0f4f3] bg-[#fafcfb] flex items-center justify-between text-xs text-[#5e7a76] flex-shrink-0">
          <span className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>DocuMind AI Grounded Workspace</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#1c4e48] text-white hover:bg-[#163d38] font-bold text-xs cursor-pointer transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
