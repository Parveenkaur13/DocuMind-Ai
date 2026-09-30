import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  HelpCircle,
  Layers,
  Award,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  Copy,
  Check,
  FileText,
  Volume2,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  LayoutGrid,
  FileDown,
  ArrowRight,
} from 'lucide-react';
import type { DocItem } from './Sidebar';
import {
  generateStudyMaterialAI,
  generateFlashcardsAI,
  generateQuizAI,
  generatePodcastAI,
  type StudyMaterialType,
  type StudyDifficulty,
  type Flashcard,
  type QuizQuestion,
  type PodcastDialogue,
} from '../lib/ai';
import { useToast } from './Toast';
import { exportToMarkdown, exportToPrint, exportToTxt } from '../lib/export';
import { MarkdownContent } from './MarkdownContent';

interface StudyModeViewProps {
  documents: DocItem[];
  selectedDoc: DocItem | null;
  onSelectDoc: (doc: DocItem) => void;
  onNavigateToChat: () => void;
  onOpenUpload?: () => void;
}

type StudyTab =
  | 'summary'
  | 'short_notes'
  | 'mcq'
  | 'flashcards'
  | 'viva_questions'
  | 'important_questions'
  | 'explain_beginner'
  | 'podcast';

const TAB_CONFIG: Array<{ id: StudyTab; label: string; icon: React.ElementType; description: string }> = [
  { id: 'summary', label: 'AI Summary', icon: Sparkles, description: 'Executive & Academic Overview' },
  { id: 'short_notes', label: 'Short Notes', icon: FileText, description: 'High-Retention Revision Notes' },
  { id: 'mcq', label: 'MCQs', icon: CheckCircle2, description: 'Practice Quiz with Explanations' },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, description: 'Interactive Concept Cards' },
  { id: 'viva_questions', label: 'Viva Questions', icon: MessageSquare, description: 'Oral Examination Prep & Criteria' },
  { id: 'important_questions', label: 'Important Questions', icon: HelpCircle, description: 'Core Questions with Model Answers' },
  { id: 'explain_beginner', label: 'Explain Topic', icon: GraduationCap, description: 'Intuitive Feynman Technique Breakdown' },
  { id: 'podcast', label: 'Audio Podcast', icon: Headphones, description: 'Two-Host Audio Discussion' },
];

export function StudyModeView({
  documents,
  selectedDoc,
  onSelectDoc,
  onNavigateToChat,
  onOpenUpload,
}: StudyModeViewProps) {
  const { showToast } = useToast();

  // Read saved difficulty preference if available
  const savedDifficulty = (typeof window !== 'undefined'
    ? localStorage.getItem('documind_study_difficulty')
    : null) as StudyDifficulty | null;

  const [activeDocId, setActiveDocId] = useState<string>(selectedDoc?.id || '');
  const [difficulty, setDifficulty] = useState<StudyDifficulty>(savedDifficulty || 'intermediate');
  const [activeTab, setActiveTab] = useState<StudyTab>('summary');

  // Currently selected document object
  const currentDoc = activeDocId ? documents.find((d) => d.id === activeDocId) || null : null;

  // Study Material Text States (Summary, Short Notes, Viva, Important Qs, Explain Topic)
  const [generatedText, setGeneratedText] = useState<Record<string, string>>({});
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Flashcards State
  const [flashcardsByDoc, setFlashcardsByDoc] = useState<Record<string, Flashcard[]>>({});
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [flashcardViewMode, setFlashcardViewMode] = useState<'single' | 'grid'>('single');

  // Quiz / MCQs State
  const [quizByDoc, setQuizByDoc] = useState<Record<string, QuizQuestion[]>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Podcast State
  const [podcastByDoc, setPodcastByDoc] = useState<Record<string, PodcastDialogue[]>>({});
  const [loadingPodcast, setLoadingPodcast] = useState(false);
  const [podcastError, setPodcastError] = useState<string | null>(null);
  const [isPlayingPodcast, setIsPlayingPodcast] = useState(false);
  const [activeTurnIndex, setActiveTurnIndex] = useState<number>(-1);
  const activeTurnRef = useRef<number>(-1);
  activeTurnRef.current = activeTurnIndex;

  // Sync with prop when selectedDoc changes externally
  useEffect(() => {
    if (selectedDoc?.id && selectedDoc.id !== activeDocId) {
      setActiveDocId(selectedDoc.id);
      setCardIndex(0);
      setIsFlipped(false);
      setSelectedAnswers({});
      setTextError(null);
      setCardsError(null);
      setQuizError(null);
      setPodcastError(null);
    }
  }, [selectedDoc?.id]);

  // Handle document switch from dropdown or selection card
  const handleDocumentChange = (docId: string) => {
    setActiveDocId(docId);
    setCardIndex(0);
    setIsFlipped(false);
    setSelectedAnswers({});
    setTextError(null);
    setCardsError(null);
    setQuizError(null);
    setPodcastError(null);

    const doc = documents.find((d) => d.id === docId);
    if (doc) {
      onSelectDoc(doc);
    }
  };

  // Load standard textual study material
  const fetchTextMaterial = useCallback(
    async (type: StudyMaterialType, force = false) => {
      if (!currentDoc) return;

      if (!currentDoc.extracted_text || currentDoc.extracted_text.trim().length < 20) {
        setTextError('This document has no extracted text to generate study material. Please re-upload or select another document.');
        return;
      }

      const cacheKey = `${currentDoc.id}_${type}_${difficulty}`;
      if (!force && generatedText[cacheKey]) {
        setTextError(null);
        return;
      }

      setLoadingText(true);
      setTextError(null);

      try {
        const res = await generateStudyMaterialAI(
          currentDoc.extracted_text,
          currentDoc.name,
          type,
          difficulty,
        );
        setGeneratedText((prev) => ({ ...prev, [cacheKey]: res }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error generating study material';
        setTextError(msg);
        showToast(msg, 'error');
      } finally {
        setLoadingText(false);
      }
    },
    [currentDoc, difficulty, generatedText, showToast],
  );

  // Load Flashcards
  const fetchFlashcards = useCallback(
    async (force = false) => {
      if (!currentDoc) return;

      if (!currentDoc.extracted_text || currentDoc.extracted_text.trim().length < 20) {
        setCardsError('This document has no extracted text to generate flashcards.');
        return;
      }

      if (!force && flashcardsByDoc[currentDoc.id]?.length > 0) {
        setCardsError(null);
        return;
      }

      setLoadingCards(true);
      setCardsError(null);

      try {
        const cards = await generateFlashcardsAI(currentDoc.extracted_text, currentDoc.name, 6);
        setFlashcardsByDoc((prev) => ({ ...prev, [currentDoc.id]: cards }));
        setCardIndex(0);
        setIsFlipped(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to generate flashcards';
        setCardsError(msg);
        showToast(msg, 'error');
      } finally {
        setLoadingCards(false);
      }
    },
    [currentDoc, flashcardsByDoc, showToast],
  );

  // Load MCQs
  const fetchQuiz = useCallback(
    async (force = false) => {
      if (!currentDoc) return;

      if (!currentDoc.extracted_text || currentDoc.extracted_text.trim().length < 20) {
        setQuizError('This document has no extracted text to generate MCQs.');
        return;
      }

      if (!force && quizByDoc[currentDoc.id]?.length > 0) {
        setQuizError(null);
        return;
      }

      setLoadingQuiz(true);
      setQuizError(null);

      try {
        const qs = await generateQuizAI(currentDoc.extracted_text, currentDoc.name, 10);
        setQuizByDoc((prev) => ({ ...prev, [currentDoc.id]: qs }));
        setSelectedAnswers({});
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to generate MCQs';
        setQuizError(msg);
        showToast(msg, 'error');
      } finally {
        setLoadingQuiz(false);
      }
    },
    [currentDoc, quizByDoc, showToast],
  );

  // Load Podcast
  const fetchPodcast = useCallback(
    async (force = false) => {
      if (!currentDoc) return;

      if (!currentDoc.extracted_text || currentDoc.extracted_text.trim().length < 20) {
        setPodcastError('This document has no extracted text to generate audio podcast.');
        return;
      }

      if (!force && podcastByDoc[currentDoc.id]?.length > 0) {
        setPodcastError(null);
        return;
      }

      setLoadingPodcast(true);
      setPodcastError(null);

      try {
        const turns = await generatePodcastAI(currentDoc.extracted_text, currentDoc.name);
        setPodcastByDoc((prev) => ({ ...prev, [currentDoc.id]: turns }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to generate podcast dialogue';
        setPodcastError(msg);
        showToast(msg, 'error');
      } finally {
        setLoadingPodcast(false);
      }
    },
    [currentDoc, podcastByDoc, showToast],
  );

  // Auto-fetch data on active tab or doc change
  useEffect(() => {
    if (!currentDoc) return;

    if (activeTab === 'flashcards') {
      fetchFlashcards(false);
    } else if (activeTab === 'mcq') {
      fetchQuiz(false);
    } else if (activeTab === 'podcast') {
      fetchPodcast(false);
    } else {
      fetchTextMaterial(activeTab as StudyMaterialType, false);
    }
  }, [activeTab, currentDoc?.id, difficulty, fetchFlashcards, fetchQuiz, fetchPodcast, fetchTextMaterial]);

  // Audio Speech Synthesis for Podcast
  const stopPodcastAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingPodcast(false);
    setActiveTurnIndex(-1);
  };

  const playPodcastAudio = () => {
    const currentPodcast = currentDoc ? podcastByDoc[currentDoc.id] || [] : [];
    if (!('speechSynthesis' in window) || currentPodcast.length === 0) {
      showToast('Audio narration is not supported in this browser.', 'info');
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlayingPodcast(true);

    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
    const alexVoice = englishVoices[0] || voices[0];
    const jordanVoice = englishVoices[1] || englishVoices[0] || voices[0];

    const speakTurn = (index: number) => {
      if (index >= currentPodcast.length) {
        setIsPlayingPodcast(false);
        setActiveTurnIndex(-1);
        return;
      }

      setActiveTurnIndex(index);
      const turn = currentPodcast[index];
      const utterance = new SpeechSynthesisUtterance(turn.text);
      utterance.voice = turn.speaker === 'Alex' ? alexVoice : jordanVoice;
      utterance.pitch = turn.speaker === 'Alex' ? 1.05 : 0.95;
      utterance.rate = 1.0;

      utterance.onend = () => {
        if (activeTurnRef.current === index) {
          speakTurn(index + 1);
        }
      };

      utterance.onerror = () => {
        setIsPlayingPodcast(false);
      };

      window.speechSynthesis.speak(utterance);
    };

    speakTurn(0);
  };

  // Content for current text tab
  const currentCacheKey = `${currentDoc?.id}_${activeTab}_${difficulty}`;
  const currentContent = generatedText[currentCacheKey] || '';
  const currentFlashcards = currentDoc ? flashcardsByDoc[currentDoc.id] || [] : [];
  const currentQuiz = currentDoc ? quizByDoc[currentDoc.id] || [] : [];
  const currentPodcastTurns = currentDoc ? podcastByDoc[currentDoc.id] || [] : [];

  // Export handlers
  const handleExportText = (format: 'md' | 'txt' | 'print') => {
    if (!currentDoc || !currentContent) return;
    const title = `${currentDoc.name} - ${activeTab.replace(/_/g, ' ').toUpperCase()}`;
    if (format === 'md') exportToMarkdown(title, currentContent);
    else if (format === 'txt') exportToTxt(title, currentContent);
    else exportToPrint(title, currentContent);
    showToast(`Exported as ${format.toUpperCase()}`, 'success');
  };

  const handleCopyText = () => {
    if (!currentContent) return;
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    showToast('Copied study material to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFlashcards = () => {
    if (currentFlashcards.length === 0) return;
    const formatted = currentFlashcards
      .map((c, i) => `Card ${i + 1}:\nQuestion: ${c.question}\nAnswer: ${c.answer}${c.sourceSnippet ? `\nSource: "${c.sourceSnippet}"` : ''}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(formatted);
    showToast('Copied all flashcards to clipboard', 'success');
  };

  const handleExportFlashcards = (format: 'md' | 'txt') => {
    if (!currentDoc || currentFlashcards.length === 0) return;
    const title = `${currentDoc.name} - FLASHCARDS`;
    const formatted = currentFlashcards
      .map((c, i) => `### Card ${i + 1}: ${c.question}\n**Answer:** ${c.answer}${c.sourceSnippet ? `\n> *Source: "${c.sourceSnippet}"*` : ''}`)
      .join('\n\n');
    if (format === 'md') exportToMarkdown(title, formatted);
    else exportToTxt(title, formatted);
    showToast(`Exported flashcards as ${format.toUpperCase()}`, 'success');
  };

  const handleCopyMCQs = () => {
    if (currentQuiz.length === 0) return;
    const formatted = currentQuiz
      .map(
        (q, i) =>
          `Q${i + 1}. ${q.question}\n` +
          q.options.map((opt, oIdx) => `   ${String.fromCharCode(65 + oIdx)}. ${opt}`).join('\n') +
          `\nCorrect Answer: ${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}` +
          `\nExplanation: ${q.explanation}`,
      )
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(formatted);
    showToast('Copied all MCQs with explanations to clipboard', 'success');
  };

  const handleExportMCQs = (format: 'md' | 'txt') => {
    if (!currentDoc || currentQuiz.length === 0) return;
    const title = `${currentDoc.name} - MULTIPLE CHOICE QUESTIONS`;
    const formatted = currentQuiz
      .map(
        (q, i) =>
          `### Q${i + 1}. ${q.question}\n` +
          q.options.map((opt, oIdx) => `- **${String.fromCharCode(65 + oIdx)}.** ${opt}`).join('\n') +
          `\n\n**Correct Answer:** Option ${String.fromCharCode(65 + q.correctIndex)} (${q.options[q.correctIndex]})\n\n` +
          `**Explanation:** ${q.explanation}`,
      )
      .join('\n\n---\n\n');
    if (format === 'md') exportToMarkdown(title, formatted);
    else exportToTxt(title, formatted);
    showToast(`Exported MCQs as ${format.toUpperCase()}`, 'success');
  };

  // =========================================================================
  // VIEW: NO DOCUMENT SELECTED STATE (Prevent premature generation)
  // =========================================================================
  if (!currentDoc) {
    return (
      <div className="flex-1 p-6 sm:p-10 flex flex-col items-center justify-center min-h-[500px] max-w-2xl mx-auto my-auto text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-[#e8f4f1] text-[#1c4e48] border-2 border-[#d2ebe5] flex items-center justify-center shadow-xs">
          <GraduationCap className="w-8 h-8 text-[#3c8b7e]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#183237]">Select a Document to Start Studying</h2>
          <p className="text-xs sm:text-sm text-[#5e7a76] max-w-lg leading-relaxed">
            DocuMind AI uses real document retrieval to synthesize grounded AI Summaries, Short Notes, MCQs with explanations, Flashcards, Viva Questions, and Topic Explanations.
          </p>
        </div>

        {documents.length > 0 ? (
          <div className="w-full space-y-3 pt-2 text-left">
            <label className="text-xs font-bold text-[#5e7a76] uppercase tracking-wider block text-center">
              Available Documents in Your Workspace ({documents.length}):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleDocumentChange(doc.id)}
                  className="p-3.5 rounded-2xl bg-white border border-[#d4e0dd] hover:border-[#3c8b7e] hover:shadow-md transition text-left cursor-pointer group flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-[#183237] group-hover:text-[#1c4e48] line-clamp-1">
                      {doc.name}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#e8f4f1] text-[#1c4e48] flex-shrink-0">
                      {doc.file_type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#5e7a76]">
                    <span>{(doc.extracted_text?.length || 0).toLocaleString()} chars</span>
                    <span className="text-[#3c8b7e] font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      <span>Study now</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white border border-[#e2ece9] text-center space-y-3">
            <FileText className="w-8 h-8 text-[#5e7a76] mx-auto" />
            <p className="text-xs text-[#5e7a76]">No documents have been uploaded to your workspace yet.</p>
            {onOpenUpload && (
              <button
                onClick={onOpenUpload}
                className="px-4 py-2 rounded-xl bg-[#1c4e48] text-white hover:bg-[#163d38] font-bold text-xs transition cursor-pointer flex items-center gap-2 mx-auto"
              >
                <FileText className="w-3.5 h-3.5 text-[#7dd3c4]" />
                <span>Upload First Document</span>
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 rounded-xl bg-[#1c4e48] text-white hover:bg-[#163d38] font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-[#7dd3c4]" />
              <span>Upload New Document</span>
            </button>
          )}
          <button
            onClick={onNavigateToChat}
            className="px-4 py-2 rounded-xl bg-white border border-[#d4e0dd] hover:border-[#3c8b7e] text-[#183237] font-semibold text-xs transition cursor-pointer"
          >
            Go to AI Chat
          </button>
        </div>
      </div>
    );
  }

  // Calculate Quiz Score
  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = currentQuiz.filter((q) => selectedAnswers[q.id] === q.correctIndex).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fbfa] overflow-hidden">
      {/* =========================================================================
          TOP HEADER: DOCUMENT SELECTOR, DIFFICULTY, TAB SWITCHER
          ========================================================================= */}
      <div className="p-4 sm:p-5 bg-white border-b border-[#e2ece9] flex-shrink-0 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title & Document Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center font-bold flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-[#3c8b7e]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-[#183237] truncate">
                  Personalized Study Studio
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e8f4f1] text-[#1c4e48] uppercase tracking-wider">
                  AI Grounded
                </span>
              </div>
              <p className="text-xs text-[#5e7a76] truncate">
                Active Document: <strong className="text-[#183237]">{currentDoc.name}</strong> •{' '}
                {(currentDoc.extracted_text?.length || 0).toLocaleString()} characters extracted
              </p>
            </div>
          </div>

          {/* Controls: Document Dropdown, Difficulty Dropdown, Export/Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Document Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#f8fbfa] border border-[#d4e0dd] px-2.5 py-1.5 rounded-xl text-xs">
              <FileText className="w-3.5 h-3.5 text-[#3c8b7e] flex-shrink-0" />
              <select
                value={activeDocId}
                onChange={(e) => handleDocumentChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#183237] focus:outline-none cursor-pointer max-w-[170px] truncate"
                title="Switch active document"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#f8fbfa] border border-[#d4e0dd] px-2.5 py-1.5 rounded-xl text-xs">
              <Award className="w-3.5 h-3.5 text-[#3c8b7e] flex-shrink-0" />
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as StudyDifficulty)}
                className="bg-transparent text-xs font-semibold text-[#183237] focus:outline-none cursor-pointer"
                title="Select study depth / difficulty"
              >
                <option value="beginner">Beginner (Foundational)</option>
                <option value="intermediate">Intermediate (Standard)</option>
                <option value="advanced">Advanced (Deep Dive)</option>
                <option value="exam_oriented">Exam-Oriented (High-Yield)</option>
              </select>
            </div>

            {/* Ask in Chat */}
            <button
              onClick={onNavigateToChat}
              className="px-3 py-1.5 rounded-xl bg-[#e8f4f1] hover:bg-[#d8ece8] border border-[#c5e1da] text-[#1c4e48] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Discuss this document in Chat"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#3c8b7e]" />
              <span className="hidden sm:inline">Ask in Chat</span>
            </button>
          </div>
        </div>

        {/* Study Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {TAB_CONFIG.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#1c4e48] text-white shadow-2xs'
                    : 'bg-[#f0f4f3] text-[#5e7a76] hover:text-[#183237] hover:bg-[#e4edea]'
                }`}
                title={tab.description}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          MAIN CONTENT VIEWER
          ========================================================================= */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* -----------------------------------------------------------------------
            TAB 1: MCQs (Multiple Choice Questions)
            ----------------------------------------------------------------------- */}
        {activeTab === 'mcq' && (
          <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
            {/* MCQ Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e2ece9] shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#183237]">
                    Multiple-Choice Questions ({currentQuiz.length})
                  </h3>
                  {answeredCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {correctCount} / {answeredCount} Correct
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#5e7a76] mt-0.5">
                  10 exam-style questions testing concepts directly from {currentDoc.name}.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {currentQuiz.length > 0 && (
                  <>
                    <button
                      onClick={handleCopyMCQs}
                      className="px-2.5 py-1.5 rounded-lg bg-[#f0f4f3] hover:bg-[#e4edea] text-[#183237] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      title="Copy all questions and answers to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#3c8b7e]" />
                      <span className="hidden sm:inline">Copy</span>
                    </button>
                    <button
                      onClick={() => handleExportMCQs('md')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#f0f4f3] hover:bg-[#e4edea] text-[#183237] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      title="Download as Markdown"
                    >
                      <Download className="w-3.5 h-3.5 text-[#3c8b7e]" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                    {answeredCount > 0 && (
                      <button
                        onClick={() => setSelectedAnswers({})}
                        className="p-1.5 rounded-lg bg-[#f0f4f3] hover:bg-[#e4edea] text-[#5e7a76] hover:text-[#183237] transition cursor-pointer"
                        title="Reset Quiz Answers"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => fetchQuiz(true)}
                  disabled={loadingQuiz}
                  className="px-3 py-1.5 rounded-xl bg-[#1c4e48] text-white hover:bg-[#163d38] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#7dd3c4] ${loadingQuiz ? 'animate-spin' : ''}`} />
                  <span>{loadingQuiz ? 'Generating…' : 'Regenerate 10 MCQs'}</span>
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loadingQuiz && (
              <div className="p-16 text-center bg-white rounded-3xl border border-[#e2ece9] shadow-sm space-y-3">
                <Loader2 className="w-8 h-8 text-[#3c8b7e] animate-spin mx-auto" />
                <h4 className="text-sm font-bold text-[#183237]">Formulating 10 Exam-Level MCQs…</h4>
                <p className="text-xs text-[#5e7a76] max-w-sm mx-auto">
                  Analyzing facts, numbers, and core rules in "{currentDoc.name}" to create 4-choice questions with full explanations.
                </p>
              </div>
            )}

            {/* Error State */}
            {quizError && !loadingQuiz && (
              <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-3 text-center">
                <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                <h4 className="text-sm font-bold">Failed to Generate Questions</h4>
                <p className="text-xs text-rose-700 max-w-md mx-auto">{quizError}</p>
                <button
                  onClick={() => fetchQuiz(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            )}

            {/* Questions List */}
            {!loadingQuiz && !quizError && currentQuiz.length > 0 && (
              <div className="space-y-4">
                {currentQuiz.map((q, qIdx) => {
                  const selected = selectedAnswers[q.id];
                  const isAnswered = selected !== undefined;
                  const isCorrect = selected === q.correctIndex;

                  return (
                    <div
                      key={q.id || qIdx}
                      className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e2ece9] shadow-2xs space-y-4 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-bold text-[#183237] leading-relaxed">
                          <span className="text-[#3c8b7e] mr-2">Q{qIdx + 1}.</span>
                          {q.question}
                        </h3>
                        {isAnswered && (
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Correct</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Incorrect</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          let btnStyle = 'bg-white border-[#d4e0dd] text-[#183237] hover:border-[#3c8b7e] hover:bg-[#f8fbfa]';
                          if (isAnswered) {
                            if (optIdx === q.correctIndex) {
                              btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                            } else if (selected === optIdx) {
                              btnStyle = 'bg-rose-50 border-rose-300 text-rose-950 line-through opacity-85';
                            } else {
                              btnStyle = 'bg-[#fbfcfc] border-[#e8efed] text-[#5e7a76] opacity-70';
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={isAnswered}
                              onClick={() =>
                                setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                              }
                              className={`w-full text-left p-3 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${btnStyle}`}
                            >
                              <span className="flex items-center gap-2">
                                <strong className="w-5 h-5 rounded-full bg-[#f0f4f3] text-[#1c4e48] flex items-center justify-center text-[10px] font-bold">
                                  {String.fromCharCode(65 + optIdx)}
                                </strong>
                                <span>{opt}</span>
                              </span>
                              {isAnswered && optIdx === q.correctIndex && (
                                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {isAnswered && (
                        <div className="p-3.5 rounded-xl bg-[#f0f7f5] border border-[#d2ebe5] text-xs text-[#1c4e48] space-y-1 animate-fade-in">
                          <div className="font-bold flex items-center gap-1.5 text-xs text-[#1c4e48]">
                            <Sparkles className="w-3.5 h-3.5 text-[#3c8b7e]" />
                            <span>Verified Grounded Explanation</span>
                          </div>
                          <p className="leading-relaxed text-[11px] text-[#235850]">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* -----------------------------------------------------------------------
            TAB 2: FLASHCARDS
            ----------------------------------------------------------------------- */}
        {activeTab === 'flashcards' && (
          <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
            {/* Flashcards Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e2ece9] shadow-2xs">
              <div>
                <h3 className="text-sm font-bold text-[#183237]">
                  Study Flashcards ({currentFlashcards.length})
                </h3>
                <p className="text-xs text-[#5e7a76] mt-0.5">
                  High-yield conceptual terms and definitions from {currentDoc.name}.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {currentFlashcards.length > 0 && (
                  <>
                    <button
                      onClick={() => setFlashcardViewMode(flashcardViewMode === 'single' ? 'grid' : 'single')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#f0f4f3] hover:bg-[#e4edea] text-[#183237] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      title="Toggle Single Card vs Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-[#3c8b7e]" />
                      <span className="hidden sm:inline">
                        {flashcardViewMode === 'single' ? 'Grid' : 'Card'}
                      </span>
                    </button>
                    <button
                      onClick={handleCopyFlashcards}
                      className="px-2.5 py-1.5 rounded-lg bg-[#f0f4f3] hover:bg-[#e4edea] text-[#183237] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      title="Copy all flashcards to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#3c8b7e]" />
                      <span className="hidden sm:inline">Copy</span>
                    </button>
                    <button
                      onClick={() => handleExportFlashcards('md')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#f0f4f3] hover:bg-[#e4edea] text-[#183237] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      title="Download as Markdown"
                    >
                      <Download className="w-3.5 h-3.5 text-[#3c8b7e]" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => fetchFlashcards(true)}
                  disabled={loadingCards}
                  className="px-3 py-1.5 rounded-xl bg-[#1c4e48] text-white hover:bg-[#163d38] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#7dd3c4] ${loadingCards ? 'animate-spin' : ''}`} />
                  <span>{loadingCards ? 'Generating…' : 'Regenerate Flashcards'}</span>
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loadingCards && (
              <div className="p-16 text-center bg-white rounded-3xl border border-[#e2ece9] shadow-sm space-y-3">
                <Loader2 className="w-8 h-8 text-[#3c8b7e] animate-spin mx-auto" />
                <h4 className="text-sm font-bold text-[#183237]">Synthesizing High-Yield Flashcards…</h4>
                <p className="text-xs text-[#5e7a76] max-w-sm mx-auto">
                  Extracting core definitions and factual assertions from "{currentDoc.name}".
                </p>
              </div>
            )}

            {/* Error State */}
            {cardsError && !loadingCards && (
              <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-3 text-center">
                <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                <h4 className="text-sm font-bold">Failed to Generate Flashcards</h4>
                <p className="text-xs text-rose-700 max-w-md mx-auto">{cardsError}</p>
                <button
                  onClick={() => fetchFlashcards(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            )}

            {/* Flashcard Single Mode */}
            {!loadingCards && !cardsError && currentFlashcards.length > 0 && flashcardViewMode === 'single' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-[#5e7a76]">
                  <span>
                    Card <strong>{cardIndex + 1}</strong> of <strong>{currentFlashcards.length}</strong>
                  </span>
                  <span>
                    <strong>{masteredIds.size}</strong> of {currentFlashcards.length} Mastered
                  </span>
                </div>

                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="min-h-[280px] p-8 rounded-3xl bg-white border-2 border-[#d2ebe5] shadow-md flex flex-col justify-between cursor-pointer hover:border-[#3c8b7e] transition transform select-none relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#3c8b7e]">
                      {isFlipped ? '💡 Grounded Explanation / Answer' : '❓ Question / Concept Term'}
                    </span>
                    <span className="text-[10px] text-[#5e7a76] group-hover:text-[#1c4e48] transition flex items-center gap-1">
                      <RotateCw className="w-3 h-3" />
                      <span>Click to flip</span>
                    </span>
                  </div>

                  <div className="my-auto py-4">
                    <p className="text-base sm:text-lg font-bold text-[#183237] leading-relaxed">
                      {isFlipped
                        ? currentFlashcards[cardIndex].answer
                        : currentFlashcards[cardIndex].question}
                    </p>
                    {isFlipped && currentFlashcards[cardIndex].sourceSnippet && (
                      <blockquote className="mt-4 p-3 rounded-xl bg-[#f0f7f5] border-l-3 border-[#3c8b7e] text-xs text-[#1c4e48] italic">
                        "{currentFlashcards[cardIndex].sourceSnippet}"
                      </blockquote>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#5e7a76] pt-2 border-t border-[#f0f4f3]">
                    <span className="truncate max-w-[200px]">{currentDoc.name}</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        masteredIds.has(currentFlashcards[cardIndex].id)
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-[#f0f4f3] text-[#5e7a76]'
                      }`}
                    >
                      {masteredIds.has(currentFlashcards[cardIndex].id) ? '✓ Mastered' : 'Unmastered'}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-2.5">
                  <button
                    onClick={() => {
                      setIsFlipped(false);
                      setCardIndex((prev) => (prev > 0 ? prev - 1 : currentFlashcards.length - 1));
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-[#d4e0dd] text-xs font-semibold hover:border-[#3c8b7e] transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={() => {
                      const currentId = currentFlashcards[cardIndex].id;
                      setMasteredIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(currentId)) next.delete(currentId);
                        else next.add(currentId);
                        return next;
                      });
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      masteredIds.has(currentFlashcards[cardIndex].id)
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-white border border-[#d4e0dd] text-[#183237] hover:border-[#3c8b7e]'
                    }`}
                  >
                    {masteredIds.has(currentFlashcards[cardIndex].id) ? '✓ Marked Mastered' : 'Mark as Mastered'}
                  </button>

                  <button
                    onClick={() => {
                      setCardIndex(0);
                      setIsFlipped(false);
                      setMasteredIds(new Set());
                    }}
                    className="p-2 rounded-xl bg-white border border-[#d4e0dd] text-xs font-semibold hover:border-[#3c8b7e] transition text-[#5e7a76] hover:text-[#183237] cursor-pointer"
                    title="Reset flashcard progress"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setIsFlipped(false);
                      setCardIndex((prev) => (prev < currentFlashcards.length - 1 ? prev + 1 : 0));
                    }}
                    className="px-4 py-2 rounded-xl bg-[#1c4e48] text-white text-xs font-semibold hover:bg-[#163d38] transition flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Flashcard Grid Mode */}
            {!loadingCards && !cardsError && currentFlashcards.length > 0 && flashcardViewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentFlashcards.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    className="p-5 rounded-2xl bg-white border border-[#d4e0dd] shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#5e7a76]">
                        <span className="font-bold text-[#3c8b7e]">Card {idx + 1}</span>
                        <button
                          onClick={() => {
                            setMasteredIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(c.id)) next.delete(c.id);
                              else next.add(c.id);
                              return next;
                            });
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition ${
                            masteredIds.has(c.id)
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-[#f0f4f3] text-[#5e7a76] hover:bg-[#e4edea]'
                          }`}
                        >
                          {masteredIds.has(c.id) ? '✓ Mastered' : 'Mark Mastered'}
                        </button>
                      </div>
                      <h4 className="text-xs font-bold text-[#183237] leading-snug">
                        {c.question}
                      </h4>
                      <p className="text-xs text-[#235850] bg-[#f0f7f5] p-2.5 rounded-xl border border-[#d2ebe5] leading-relaxed">
                        {c.answer}
                      </p>
                    </div>
                    {c.sourceSnippet && (
                      <p className="text-[10px] text-[#5e7a76] italic truncate">
                        Source: "{c.sourceSnippet}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* -----------------------------------------------------------------------
            TAB 3: AUDIO PODCAST
            ----------------------------------------------------------------------- */}
        {activeTab === 'podcast' && (
          <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
            <div className="p-6 rounded-2xl bg-white border border-[#e2ece9] shadow-2xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#e8f4f1] text-[#3c8b7e] flex items-center justify-center">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#183237]">AI Audio Discussion</h3>
                    <p className="text-xs text-[#5e7a76] mt-0.5">
                      Conversational dialogue between Alex (contextual summary) and Jordan (critical breakdown).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchPodcast(true)}
                    disabled={loadingPodcast}
                    className="p-2 rounded-xl bg-[#f0f4f3] hover:bg-[#e4edea] text-[#183237] transition cursor-pointer"
                    title="Regenerate Podcast Dialogue"
                  >
                    <RefreshCw className={`w-4 h-4 text-[#3c8b7e] ${loadingPodcast ? 'animate-spin' : ''}`} />
                  </button>

                  {isPlayingPodcast ? (
                    <button
                      onClick={stopPodcastAudio}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Narration</span>
                    </button>
                  ) : (
                    <button
                      onClick={playPodcastAudio}
                      disabled={loadingPodcast || currentPodcastTurns.length === 0}
                      className="px-4 py-2 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 text-[#7dd3c4]" />
                      <span>Play Discussion</span>
                    </button>
                  )}
                </div>
              </div>

              {loadingPodcast && (
                <div className="p-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#3c8b7e] animate-spin mx-auto" />
                  <p className="text-xs text-[#5e7a76]">Scripting educational podcast dialogue…</p>
                </div>
              )}

              {podcastError && !loadingPodcast && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-center space-y-2">
                  <p>{podcastError}</p>
                  <button
                    onClick={() => fetchPodcast(true)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loadingPodcast && !podcastError && currentPodcastTurns.length > 0 && (
                <div className="space-y-3 pt-2">
                  {currentPodcastTurns.map((turn, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs transition ${
                        activeTurnIndex === idx
                          ? 'bg-[#e8f4f1] border-[#3c8b7e] shadow-2xs'
                          : 'bg-[#f8fbfa] border-[#e8efed]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 font-bold text-[11px]">
                        <span className={turn.speaker === 'Alex' ? 'text-[#1c4e48]' : 'text-[#3c8b7e]'}>
                          {turn.speaker}
                        </span>
                        {turn.topic && (
                          <span className="text-[10px] text-[#5e7a76] font-normal uppercase">
                            {turn.topic}
                          </span>
                        )}
                      </div>
                      <p className="text-[#183237] leading-relaxed">{turn.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -----------------------------------------------------------------------
            TAB 4-8: TEXTUAL STUDY MATERIAL (Summary, Short Notes, Viva, Important Qs, Explain Topic)
            ----------------------------------------------------------------------- */}
        {activeTab !== 'flashcards' && activeTab !== 'mcq' && activeTab !== 'podcast' && (
          <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
            {/* Toolbar for text tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e2ece9] shadow-2xs">
              <div>
                <h3 className="text-sm font-bold text-[#183237]">
                  {TAB_CONFIG.find((t) => t.id === activeTab)?.label || 'Study Material'}
                </h3>
                <p className="text-xs text-[#5e7a76] mt-0.5">
                  Document: <strong>{currentDoc.name}</strong> • Level: <strong>{difficulty.toUpperCase()}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {currentContent && (
                  <>
                    <button
                      onClick={handleCopyText}
                      className="px-2.5 py-1.5 rounded-lg bg-[#f0f4f3] hover:bg-[#e4edea] text-[#183237] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#3c8b7e]" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => handleExportText('md')}
                      className="p-1.5 rounded-lg bg-[#f0f4f3] hover:bg-[#e4edea] text-[#183237] transition cursor-pointer"
                      title="Download Markdown (.md)"
                    >
                      <Download className="w-3.5 h-3.5 text-[#3c8b7e]" />
                    </button>
                    <button
                      onClick={() => handleExportText('txt')}
                      className="p-1.5 rounded-lg bg-[#f0f4f3] hover:bg-[#e4edea] text-[#183237] transition cursor-pointer"
                      title="Download Text (.txt)"
                    >
                      <FileDown className="w-3.5 h-3.5 text-[#3c8b7e]" />
                    </button>
                    <button
                      onClick={() => handleExportText('print')}
                      className="p-1.5 rounded-lg bg-[#f0f4f3] hover:bg-[#e4edea] text-[#183237] transition cursor-pointer"
                      title="Print or Save as PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#3c8b7e]" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => fetchTextMaterial(activeTab as StudyMaterialType, true)}
                  disabled={loadingText}
                  className="px-3 py-1.5 rounded-xl bg-[#1c4e48] text-white hover:bg-[#163d38] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#7dd3c4] ${loadingText ? 'animate-spin' : ''}`} />
                  <span>{loadingText ? 'Generating…' : 'Regenerate'}</span>
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loadingText && (
              <div className="p-16 text-center bg-white rounded-3xl border border-[#e2ece9] shadow-sm space-y-3">
                <Loader2 className="w-8 h-8 text-[#3c8b7e] animate-spin mx-auto" />
                <h4 className="text-sm font-bold text-[#183237]">
                  Generating grounded {TAB_CONFIG.find((t) => t.id === activeTab)?.label}…
                </h4>
                <p className="text-xs text-[#5e7a76] max-w-sm mx-auto">
                  Extracting facts and synthesizing high-yield content from "{currentDoc.name}".
                </p>
              </div>
            )}

            {/* Error State */}
            {textError && !loadingText && (
              <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-3 text-center">
                <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                <h4 className="text-sm font-bold">Failed to Generate Content</h4>
                <p className="text-xs text-rose-700 max-w-md mx-auto">{textError}</p>
                <button
                  onClick={() => fetchTextMaterial(activeTab as StudyMaterialType, true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            )}

            {/* Content View */}
            {!loadingText && !textError && currentContent && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2ece9] shadow-2xs space-y-4">
                <div className="prose prose-sm max-w-none text-xs sm:text-sm text-[#183237] leading-relaxed">
                  <MarkdownContent content={currentContent} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
