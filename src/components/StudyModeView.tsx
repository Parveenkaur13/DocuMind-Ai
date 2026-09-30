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
  | 'important_questions'
  | 'mcq'
  | 'flashcards'
  | 'viva_questions'
  | 'exam_questions'
  | 'key_concepts'
  | 'explain_beginner'
  | 'podcast';

export function StudyModeView({
  documents,
  selectedDoc,
  onSelectDoc,
  onNavigateToChat,
  onOpenUpload,
}: StudyModeViewProps) {
  const { showToast } = useToast();

  const [activeDocId, setActiveDocId] = useState<string>(
    selectedDoc?.id || documents[0]?.id || '',
  );

  const [difficulty, setDifficulty] = useState<StudyDifficulty>('intermediate');
  const [activeTab, setActiveTab] = useState<StudyTab>('short_notes');

  const currentDoc = documents.find((d) => d.id === activeDocId) || documents[0] || null;

  // Study Material Text Cache
  const [generatedText, setGeneratedText] = useState<Record<string, string>>({});
  const [loadingText, setLoadingText] = useState(false);
  const [copied, setCopied] = useState(false);

  // Flashcards State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [loadingCards, setLoadingCards] = useState(false);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // Podcast State
  const [podcastTurns, setPodcastTurns] = useState<PodcastDialogue[]>([]);
  const [loadingPodcast, setLoadingPodcast] = useState(false);
  const [isPlayingPodcast, setIsPlayingPodcast] = useState(false);
  const [activeTurnIndex, setActiveTurnIndex] = useState<number>(-1);
  const activeTurnRef = useRef<number>(-1);
  activeTurnRef.current = activeTurnIndex;

  // Reset states on doc change
  useEffect(() => {
    if (selectedDoc?.id) {
      setActiveDocId(selectedDoc.id);
    }
  }, [selectedDoc]);

  // Load standard textual study material
  const fetchTextMaterial = useCallback(
    async (type: StudyMaterialType) => {
      if (!currentDoc?.extracted_text) return;
      const cacheKey = `${currentDoc.id}_${type}_${difficulty}`;
      if (generatedText[cacheKey]) return;

      setLoadingText(true);
      try {
        const res = await generateStudyMaterialAI(
          currentDoc.extracted_text,
          currentDoc.name,
          type,
          difficulty,
        );
        setGeneratedText((prev) => ({ ...prev, [cacheKey]: res }));
      } catch {
        showToast('Error generating study material', 'error');
      } finally {
        setLoadingText(false);
      }
    },
    [currentDoc, difficulty, generatedText, showToast],
  );

  // Trigger loads based on active tab
  useEffect(() => {
    if (!currentDoc) return;

    if (activeTab === 'flashcards' && flashcards.length === 0) {
      setLoadingCards(true);
      generateFlashcardsAI(currentDoc.extracted_text, currentDoc.name)
        .then((cards) => setFlashcards(cards))
        .catch(() => showToast('Failed to load flashcards', 'error'))
        .finally(() => setLoadingCards(false));
    } else if (activeTab === 'mcq' && quizQuestions.length === 0) {
      setLoadingQuiz(true);
      generateQuizAI(currentDoc.extracted_text, currentDoc.name, 10)
        .then((qs) => setQuizQuestions(qs))
        .catch(() => showToast('Failed to load MCQs', 'error'))
        .finally(() => setLoadingQuiz(false));
    } else if (activeTab === 'podcast' && podcastTurns.length === 0) {
      setLoadingPodcast(true);
      generatePodcastAI(currentDoc.extracted_text, currentDoc.name)
        .then((turns) => setPodcastTurns(turns))
        .catch(() => showToast('Failed to load podcast dialogue', 'error'))
        .finally(() => setLoadingPodcast(false));
    } else if (
      activeTab === 'summary' ||
      activeTab === 'short_notes' ||
      activeTab === 'important_questions' ||
      activeTab === 'viva_questions' ||
      activeTab === 'exam_questions' ||
      activeTab === 'key_concepts' ||
      activeTab === 'explain_beginner'
    ) {
      fetchTextMaterial(activeTab as StudyMaterialType);
    }
  }, [
    activeTab,
    currentDoc,
    difficulty,
    fetchTextMaterial,
    flashcards.length,
    podcastTurns.length,
    quizQuestions.length,
    showToast,
  ]);

  // Handle Podcast Speech Synthesis
  const stopPodcastAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingPodcast(false);
    setActiveTurnIndex(-1);
  };

  const playPodcastAudio = () => {
    if (!('speechSynthesis' in window) || podcastTurns.length === 0) {
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
      if (index >= podcastTurns.length) {
        setIsPlayingPodcast(false);
        setActiveTurnIndex(-1);
        return;
      }

      setActiveTurnIndex(index);
      const turn = podcastTurns[index];
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

  const currentCacheKey = `${currentDoc?.id}_${activeTab}_${difficulty}`;
  const currentContent = generatedText[currentCacheKey] || '';

  const handleExport = (format: 'md' | 'txt' | 'print') => {
    if (!currentDoc) return;
    const title = `${currentDoc.name} - ${activeTab.replace(/_/g, ' ').toUpperCase()}`;
    if (format === 'md') exportToMarkdown(title, currentContent);
    else if (format === 'txt') exportToTxt(title, currentContent);
    else exportToPrint(title, currentContent);
  };

  if (!currentDoc) {
    return (
      <div className="flex-1 p-8 text-center flex flex-col items-center justify-center space-y-4 max-w-md mx-auto my-auto">
        <div className="w-14 h-14 rounded-2xl bg-[#e8f4f1] text-[#3c8b7e] flex items-center justify-center">
          <GraduationCap className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#183237]">No Documents Selected</h2>
          <p className="text-xs text-[#5e7a76] mt-1 leading-relaxed">
            Upload or select a document to generate personalized flashcards, MCQs, and structured study notes.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 rounded-xl bg-[#1c4e48] text-white hover:bg-[#163d38] font-bold text-xs transition cursor-pointer flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          )}
          <button
            onClick={onNavigateToChat}
            className="px-4 py-2 rounded-xl bg-white border border-[#d4e0dd] hover:border-[#3c8b7e] text-[#183237] font-semibold text-xs transition cursor-pointer"
          >
            Go to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fbfa] overflow-hidden">
      {/* Top Header & Settings */}
      <div className="p-4 sm:p-6 bg-white border-b border-[#e2ece9] flex-shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5 text-[#3c8b7e]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#183237]">Personalized Learning Studio</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e8f4f1] text-[#1c4e48] uppercase tracking-wider">
                  AI Grounded
                </span>
              </div>
              <p className="text-xs text-[#5e7a76]">
                Generate revision notes, quizzes, flashcards, and viva prep from your documents.
              </p>
            </div>
          </div>

          {/* Document & Difficulty Selectors */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Document Selector */}
            <div className="flex items-center gap-1.5 bg-[#f8fbfa] border border-[#d4e0dd] px-3 py-1.5 rounded-xl text-xs">
              <FileText className="w-3.5 h-3.5 text-[#3c8b7e]" />
              <select
                value={activeDocId}
                onChange={(e) => {
                  setActiveDocId(e.target.value);
                  const d = documents.find((doc) => doc.id === e.target.value);
                  if (d) onSelectDoc(d);
                }}
                className="bg-transparent text-xs font-semibold text-[#183237] focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Selector */}
            <div className="flex items-center gap-1.5 bg-[#f8fbfa] border border-[#d4e0dd] px-3 py-1.5 rounded-xl text-xs">
              <Award className="w-3.5 h-3.5 text-[#3c8b7e]" />
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as StudyDifficulty)}
                className="bg-transparent text-xs font-semibold text-[#183237] focus:outline-none cursor-pointer"
              >
                <option value="beginner">Beginner (Foundational)</option>
                <option value="intermediate">Intermediate (Standard)</option>
                <option value="advanced">Advanced (Deep Dive)</option>
                <option value="exam_oriented">Exam-Oriented (High-Yield)</option>
              </select>
            </div>

            {/* Export & Chat Menu */}
            <div className="flex items-center gap-2">
              <button
                onClick={onNavigateToChat}
                className="px-3 py-1.5 rounded-xl bg-[#e8f4f1] hover:bg-[#d8ece8] border border-[#c5e1da] text-[#1c4e48] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Discuss this document in Chat"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#3c8b7e]" />
                <span className="hidden sm:inline">Ask in Chat</span>
              </button>
              <button
                onClick={() => handleExport('md')}
                className="p-2 rounded-xl bg-white border border-[#d4e0dd] hover:border-[#3c8b7e] text-[#183237] text-xs font-semibold transition cursor-pointer"
                title="Export as Markdown"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleExport('print')}
                className="p-2 rounded-xl bg-white border border-[#d4e0dd] hover:border-[#3c8b7e] text-[#183237] text-xs font-semibold transition cursor-pointer"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Study Navigation Tabs (Section 9) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'summary', label: 'Summary', icon: Sparkles },
            { id: 'short_notes', label: 'Short Notes', icon: FileText },
            { id: 'mcq', label: 'MCQs', icon: CheckCircle2 },
            { id: 'flashcards', label: 'Flashcards', icon: Layers },
            { id: 'viva_questions', label: 'Viva Questions', icon: MessageSquare },
            { id: 'important_questions', label: 'Important Questions', icon: HelpCircle },
            { id: 'explain_beginner', label: 'Explain Topic', icon: GraduationCap },
            { id: 'podcast', label: 'Audio Podcast', icon: Headphones },
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as StudyTab)}
                className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#1c4e48] text-white shadow-2xs'
                    : 'bg-[#f0f4f3] text-[#5e7a76] hover:text-[#183237] hover:bg-[#e4edea]'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Viewer */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* TAB 1: Flashcards Viewer */}
        {activeTab === 'flashcards' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="flex items-center justify-between text-xs text-[#5e7a76]">
              <span>
                Card {cardIndex + 1} of {flashcards.length}
              </span>
              <span>{masteredIds.size} Mastered</span>
            </div>

            {loadingCards ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-[#e2ece9] shadow-sm space-y-3">
                <Loader2 className="w-8 h-8 text-[#3c8b7e] animate-spin mx-auto" />
                <p className="text-xs text-[#5e7a76]">Synthesizing high-yield flashcards from document…</p>
              </div>
            ) : flashcards.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-[#e2ece9]">
                <p className="text-xs text-[#5e7a76]">No flashcards generated.</p>
              </div>
            ) : (
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="min-h-[260px] p-8 rounded-3xl bg-white border-2 border-[#d2ebe5] shadow-md flex flex-col justify-between cursor-pointer hover:border-[#3c8b7e] transition transform select-none relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#3c8b7e]">
                    {isFlipped ? '💡 Grounded Explanation' : '❓ Question / Concept'}
                  </span>
                  <span className="text-[10px] text-[#5e7a76] group-hover:text-[#1c4e48] transition flex items-center gap-1">
                    <RotateCw className="w-3 h-3" />
                    <span>Click to flip</span>
                  </span>
                </div>

                <div className="my-auto py-4">
                  <p className="text-base sm:text-lg font-bold text-[#183237] leading-relaxed">
                    {isFlipped ? flashcards[cardIndex].answer : flashcards[cardIndex].question}
                  </p>
                  {isFlipped && flashcards[cardIndex].sourceSnippet && (
                    <blockquote className="mt-4 p-2.5 rounded-lg bg-[#f0f7f5] border-l-3 border-[#3c8b7e] text-xs text-[#1c4e48] italic">
                      "{flashcards[cardIndex].sourceSnippet}"
                    </blockquote>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-[#5e7a76]">
                  <span>Source: {currentDoc.name}</span>
                  <span className="text-[11px] text-[#3c8b7e] font-semibold">
                    {masteredIds.has(flashcards[cardIndex].id) ? '✓ Mastered' : 'Unmastered'}
                  </span>
                </div>
              </div>
            )}

            {/* Flashcard Controls */}
            {flashcards.length > 0 && (
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setCardIndex((prev) => (prev > 0 ? prev - 1 : flashcards.length - 1));
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-[#d4e0dd] text-xs font-semibold hover:border-[#3c8b7e] transition flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => {
                    const currentId = flashcards[cardIndex].id;
                    setMasteredIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(currentId)) next.delete(currentId);
                      else next.add(currentId);
                      return next;
                    });
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    masteredIds.has(flashcards[cardIndex].id)
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-white border border-[#d4e0dd] text-[#183237] hover:border-[#3c8b7e]'
                  }`}
                >
                  {masteredIds.has(flashcards[cardIndex].id) ? '✓ Marked Mastered' : 'Mark as Mastered'}
                </button>

                <button
                  onClick={() => {
                    setCardIndex(0);
                    setIsFlipped(false);
                    setMasteredIds(new Set());
                  }}
                  className="p-2 rounded-xl bg-white border border-[#d4e0dd] text-xs font-semibold hover:border-[#3c8b7e] transition text-[#5e7a76] hover:text-[#183237] cursor-pointer"
                  title="Reset flashcards"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setCardIndex((prev) => (prev < flashcards.length - 1 ? prev + 1 : 0));
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1c4e48] text-white text-xs font-semibold hover:bg-[#163d38] transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Multiple Choice Questions (MCQ) Viewer (Section 9) */}
        {activeTab === 'mcq' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#e2ece9]">
              <span className="text-xs font-bold text-[#183237]">
                Multiple-Choice Questions ({quizQuestions.length})
              </span>
              <button
                onClick={() => {
                  if (!currentDoc?.extracted_text) return;
                  setLoadingQuiz(true);
                  setSelectedAnswers({});
                  generateQuizAI(currentDoc.extracted_text, currentDoc.name, 10)
                    .then((qs) => {
                      setQuizQuestions(qs);
                      showToast(`Generated ${qs.length} MCQs`, 'success');
                    })
                    .catch(() => showToast('Failed to load MCQs', 'error'))
                    .finally(() => setLoadingQuiz(false));
                }}
                disabled={loadingQuiz}
                className="px-3 py-1.5 rounded-lg bg-[#1c4e48] text-white hover:bg-[#163d38] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#7dd3c4]" />
                <span>Regenerate 10 MCQs</span>
              </button>
            </div>

            {loadingQuiz ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-[#e2ece9] shadow-sm space-y-3">
                <Loader2 className="w-8 h-8 text-[#3c8b7e] animate-spin mx-auto" />
                <p className="text-xs text-[#5e7a76]">Generating 10 multiple-choice questions with explanations…</p>
              </div>
            ) : quizQuestions.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-[#e2ece9]">
                <p className="text-xs text-[#5e7a76]">No quiz questions available.</p>
              </div>
            ) : (
              quizQuestions.map((q, qIdx) => {
                const selected = selectedAnswers[q.id];
                const isAnswered = selected !== undefined;
                const isCorrect = selected === q.correctIndex;

                return (
                  <div
                    key={q.id}
                    className="p-6 rounded-2xl bg-white border border-[#e2ece9] shadow-2xs space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-bold text-[#183237] leading-relaxed">
                        <span className="text-[#3c8b7e] mr-2">Q{qIdx + 1}.</span>
                        {q.question}
                      </h3>
                      {isAnswered && (
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                            isCorrect
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isCorrect ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Correct</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Incorrect</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        let btnStyle = 'bg-white border-[#d4e0dd] text-[#183237] hover:border-[#3c8b7e]';
                        if (isAnswered) {
                          if (optIdx === q.correctIndex) {
                            btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                          } else if (selected === optIdx) {
                            btnStyle = 'bg-rose-50 border-rose-300 text-rose-950 line-through';
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
                            <span>
                              <strong className="mr-2 text-[#5e7a76]">
                                {String.fromCharCode(65 + optIdx)}.
                              </strong>
                              {opt}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <div className="p-3.5 rounded-xl bg-[#f0f7f5] border border-[#d2ebe5] text-xs text-[#1c4e48] space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#3c8b7e]" />
                          <span>Explanation</span>
                        </div>
                        <p className="leading-relaxed text-[11px] text-[#235850]">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: Audio Podcast Studio */}
        {activeTab === 'podcast' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-[#e2ece9] shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#e8f4f1] text-[#3c8b7e] flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#183237]">AI Audio Discussion</h3>
                    <p className="text-xs text-[#5e7a76] mt-0.5">
                      Conversational dialogue between Alex (context) and Jordan (analytical analysis).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isPlayingPodcast ? (
                    <button
                      onClick={stopPodcastAudio}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Narration</span>
                    </button>
                  ) : (
                    <button
                      onClick={playPodcastAudio}
                      className="px-4 py-2 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 text-[#7dd3c4]" />
                      <span>Play Discussion</span>
                    </button>
                  )}
                </div>
              </div>

              {loadingPodcast ? (
                <div className="p-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#3c8b7e] animate-spin mx-auto" />
                  <p className="text-xs text-[#5e7a76]">Scripting educational podcast dialogue…</p>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {podcastTurns.map((turn, idx) => (
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

        {/* TAB 4-8: Textual Study Material Viewer */}
        {activeTab !== 'flashcards' && activeTab !== 'mcq' && activeTab !== 'podcast' && (
          <div className="max-w-3xl mx-auto">
            {loadingText ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-[#e2ece9] shadow-sm space-y-3">
                <Loader2 className="w-8 h-8 text-[#3c8b7e] animate-spin mx-auto" />
                <p className="text-xs text-[#5e7a76]">Generating grounded {activeTab.replace(/_/g, ' ')}…</p>
              </div>
            ) : (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2ece9] shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#f0f4f3] pb-3">
                  <div className="text-xs text-[#5e7a76]">
                    Document: <strong>{currentDoc.name}</strong> • Level: <strong>{difficulty.toUpperCase()}</strong>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentContent);
                      setCopied(true);
                      showToast('Copied study material to clipboard', 'success');
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-xs text-[#3c8b7e] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

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
