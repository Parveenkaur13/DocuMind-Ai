import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  GraduationCap,
  Sparkles,
  Layers,
  HelpCircle,
  Headphones,
  CheckCircle2,
  XCircle,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Loader2,
  Check,
  Award,
} from 'lucide-react';
import type { DocItem } from './Sidebar';
import {
  generateFlashcardsAI,
  generateQuizAI,
  generatePodcastAI,
  type Flashcard,
  type QuizQuestion,
  type PodcastDialogue,
} from '../lib/ai';
import { useToast } from './Toast';

interface StudySuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: DocItem | null;
  initialTab?: 'flashcards' | 'quiz' | 'podcast';
}

export function StudySuiteModal({
  isOpen,
  onClose,
  doc,
  initialTab = 'flashcards',
}: StudySuiteModalProps) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'flashcards' | 'quiz' | 'podcast'>(initialTab);

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

  // Sync tab on open
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab, isOpen]);

  // Load Flashcards
  useEffect(() => {
    if (!isOpen || !doc || flashcards.length > 0) return;
    const fetchCards = async () => {
      setLoadingCards(true);
      try {
        const cards = await generateFlashcardsAI(doc.extracted_text || '', doc.name);
        setFlashcards(cards);
      } catch {
        showToast('Failed to generate flashcards', 'error');
      } finally {
        setLoadingCards(false);
      }
    };
    fetchCards();
  }, [isOpen, doc, flashcards.length, showToast]);

  // Load Quiz
  useEffect(() => {
    if (!isOpen || !doc || tab !== 'quiz' || quizQuestions.length > 0) return;
    const fetchQuiz = async () => {
      setLoadingQuiz(true);
      try {
        const qs = await generateQuizAI(doc.extracted_text || '', doc.name);
        setQuizQuestions(qs);
      } catch {
        showToast('Failed to generate quiz', 'error');
      } finally {
        setLoadingQuiz(false);
      }
    };
    fetchQuiz();
  }, [isOpen, doc, tab, quizQuestions.length, showToast]);

  // Load Podcast
  useEffect(() => {
    if (!isOpen || !doc || tab !== 'podcast' || podcastTurns.length > 0) return;
    const fetchPodcast = async () => {
      setLoadingPodcast(true);
      try {
        const turns = await generatePodcastAI(doc.extracted_text || '', doc.name);
        setPodcastTurns(turns);
      } catch {
        showToast('Failed to generate audio overview', 'error');
      } finally {
        setLoadingPodcast(false);
      }
    };
    fetchPodcast();
  }, [isOpen, doc, tab, podcastTurns.length, showToast]);

  // Cleanup speech synthesis on close/tab switch
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [tab, isOpen]);

  if (!isOpen || !doc) return null;

  // Flashcards Actions
  const currentCard = flashcards[cardIndex];
  const toggleMastered = (id: string) => {
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const nextCard = () => {
    setIsFlipped(false);
    setCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  // Quiz Actions
  const handleAnswerSelect = (questionId: string, optionIdx: number) => {
    if (selectedAnswers[questionId] !== undefined) return; // Locked once answered
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const quizScore = quizQuestions.reduce((acc, q) => {
    return acc + (selectedAnswers[q.id] === q.correctIndex ? 1 : 0);
  }, 0);

  // Podcast Audio Playback
  const playPodcastTurn = (index: number) => {
    if (index >= podcastTurns.length) {
      setIsPlayingPodcast(false);
      setActiveTurnIndex(-1);
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast('Text-to-speech is not supported in this browser.', 'info');
      return;
    }

    window.speechSynthesis.cancel();
    setActiveTurnIndex(index);
    setIsPlayingPodcast(true);

    const turn = podcastTurns[index];
    const utterance = new SpeechSynthesisUtterance(turn.text);

    // Differentiate Alex vs Jordan pitch and rate
    if (turn.speaker === 'Alex') {
      utterance.pitch = 0.95;
      utterance.rate = 1.05;
    } else {
      utterance.pitch = 1.25;
      utterance.rate = 1.08;
    }

    utterance.onend = () => {
      playPodcastTurn(index + 1);
    };

    utterance.onerror = () => {
      setIsPlayingPodcast(false);
      setActiveTurnIndex(-1);
    };

    window.speechSynthesis.speak(utterance);
  };

  const togglePlayPodcast = () => {
    if (isPlayingPodcast) {
      window.speechSynthesis.cancel();
      setIsPlayingPodcast(false);
    } else {
      const startIndex = activeTurnIndex >= 0 ? activeTurnIndex : 0;
      playPodcastTurn(startIndex);
    }
  };

  const resetPodcast = () => {
    window.speechSynthesis.cancel();
    setIsPlayingPodcast(false);
    setActiveTurnIndex(-1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#d4e0dd] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-[#e2ece9] flex items-center justify-between bg-gradient-to-r from-[#1c4e48] to-[#25635b] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <GraduationCap className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-base flex items-center gap-2">
                AI Learning & Audio Studio
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  NotebookLM Engine
                </span>
              </h2>
              <p className="text-xs text-[#b8d6d0] truncate max-w-md">
                Active Document: <span className="font-semibold text-white">{doc.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 border-b border-[#e2ece9] bg-[#f8fbfa] flex gap-3 text-xs font-semibold">
          <button
            onClick={() => setTab('flashcards')}
            className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              tab === 'flashcards'
                ? 'border-[#1c4e48] text-[#1c4e48]'
                : 'border-transparent text-[#5e7a76] hover:text-[#183237]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive Flashcards</span>
            {flashcards.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#e8f4f1] text-[#1c4e48] font-bold">
                {flashcards.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('quiz')}
            className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              tab === 'quiz'
                ? 'border-[#1c4e48] text-[#1c4e48]'
                : 'border-transparent text-[#5e7a76] hover:text-[#183237]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Comprehension Quiz</span>
            {quizQuestions.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#e8f4f1] text-[#1c4e48] font-bold">
                {quizQuestions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('podcast')}
            className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              tab === 'podcast'
                ? 'border-[#1c4e48] text-[#1c4e48]'
                : 'border-transparent text-[#5e7a76] hover:text-[#183237]'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Audio Overview (Podcast)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              2 Hosts
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: FLASHCARDS */}
          {tab === 'flashcards' && (
            <div className="space-y-6">
              {loadingCards ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#3c8b7e] animate-spin mx-auto" />
                  <p className="text-xs text-[#5e7a76]">Generating concept flashcards with AI grounding…</p>
                </div>
              ) : flashcards.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#5e7a76]">No flashcards available.</div>
              ) : (
                <div className="space-y-4">
                  {/* Progress & Mastered Stats */}
                  <div className="flex items-center justify-between text-xs text-[#5e7a76]">
                    <span>
                      Card <strong className="text-[#183237]">{cardIndex + 1}</strong> of{' '}
                      <strong>{flashcards.length}</strong>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Award className="w-3.5 h-3.5" />
                      {masteredIds.size} Mastered
                    </span>
                  </div>

                  {/* 3D Flip Card Container */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="min-h-[220px] sm:min-h-[260px] p-6 rounded-3xl bg-gradient-to-br from-[#f8fbfa] to-[#eaf3f1] border-2 border-[#d2ebe5] shadow-md flex flex-col justify-between cursor-pointer hover:border-[#3c8b7e] transition-all transform select-none relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#3c8b7e] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        {isFlipped ? 'Answer' : 'Question'}
                      </span>
                      <span className="text-[11px] text-[#5e7a76] font-medium flex items-center gap-1 group-hover:text-[#1c4e48]">
                        <RotateCw className="w-3 h-3" />
                        Click to flip
                      </span>
                    </div>

                    <div className="py-6 text-center">
                      <p className="text-base sm:text-lg font-bold text-[#183237] leading-relaxed">
                        {isFlipped ? currentCard?.answer : currentCard?.question}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#d4e0dd]">
                      <span className="text-[10px] text-[#5e7a76] truncate max-w-[280px]">
                        {currentCard?.sourceSnippet ? `Source: "${currentCard.sourceSnippet.slice(0, 50)}…"` : 'DocuMind Grounded Flashcard'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentCard) toggleMastered(currentCard.id);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition ${
                          currentCard && masteredIds.has(currentCard.id)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-[#5e7a76] hover:text-[#1c4e48] border border-[#d4e0dd]'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{currentCard && masteredIds.has(currentCard.id) ? 'Mastered' : 'Mark Mastered'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={prevCard}
                      className="p-2.5 rounded-2xl bg-white border border-[#d4e0dd] hover:bg-[#eaf3f1] text-[#1c4e48] transition cursor-pointer shadow-xs"
                      title="Previous Card"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="px-5 py-2.5 rounded-2xl bg-[#1c4e48] hover:bg-[#163d38] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Flip Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={nextCard}
                      className="p-2.5 rounded-2xl bg-white border border-[#d4e0dd] hover:bg-[#eaf3f1] text-[#1c4e48] transition cursor-pointer shadow-xs"
                      title="Next Card"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMPREHENSION QUIZ */}
          {tab === 'quiz' && (
            <div className="space-y-6">
              {loadingQuiz ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#3c8b7e] animate-spin mx-auto" />
                  <p className="text-xs text-[#5e7a76]">Generating comprehension quiz questions…</p>
                </div>
              ) : quizQuestions.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#5e7a76]">No quiz questions available.</div>
              ) : (
                <div className="space-y-6">
                  {/* Score Banner when completed */}
                  {Object.keys(selectedAnswers).length === quizQuestions.length && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-[#1c4e48] text-white flex items-center justify-between shadow-md animate-fade-in">
                      <div>
                        <h4 className="font-bold text-sm">Quiz Completed!</h4>
                        <p className="text-xs text-emerald-100">
                          You scored {quizScore} out of {quizQuestions.length} (
                          {Math.round((quizScore / quizQuestions.length) * 100)}%)
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedAnswers({})}
                        className="px-3 py-1.5 rounded-xl bg-white text-[#1c4e48] text-xs font-bold hover:bg-emerald-50 transition cursor-pointer"
                      >
                        Retake Quiz
                      </button>
                    </div>
                  )}

                  {/* Questions List */}
                  <div className="space-y-5">
                    {quizQuestions.map((q, qIdx) => {
                      const userChoice = selectedAnswers[q.id];
                      const isAnswered = userChoice !== undefined;

                      return (
                        <div key={q.id} className="p-5 rounded-2xl bg-[#f8fbfa] border border-[#e2ece9] space-y-3">
                          <h4 className="font-bold text-xs sm:text-sm text-[#183237] leading-relaxed">
                            {qIdx + 1}. {q.question}
                          </h4>

                          <div className="grid gap-2">
                            {q.options.map((opt, optIdx) => {
                              const isSelected = userChoice === optIdx;
                              const isCorrect = optIdx === q.correctIndex;

                              let btnStyle = 'bg-white border-[#d4e0dd] text-[#183237] hover:border-[#3c8b7e]';
                              if (isAnswered) {
                                if (isCorrect) {
                                  btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold';
                                } else if (isSelected) {
                                  btnStyle = 'bg-red-50 border-red-500 text-red-950 font-bold';
                                } else {
                                  btnStyle = 'bg-white/50 border-[#e2ece9] text-[#5e7a76] opacity-60';
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => handleAnswerSelect(q.id, optIdx)}
                                  disabled={isAnswered}
                                  className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center justify-between cursor-pointer ${btnStyle}`}
                                >
                                  <span>{opt}</span>
                                  {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                                  {isAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                                </button>
                              );
                            })}
                          </div>

                          {isAnswered && (
                            <div className="p-3 rounded-xl bg-white border border-[#e2ece9] text-xs text-[#28504b] leading-relaxed animate-fade-in">
                              <span className="font-bold text-[#1c4e48]">Explanation: </span>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUDIO PODCAST STUDIO */}
          {tab === 'podcast' && (
            <div className="space-y-6">
              {loadingPodcast ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#3c8b7e] animate-spin mx-auto" />
                  <p className="text-xs text-[#5e7a76]">Generating multi-host audio dialogue between Alex & Jordan…</p>
                </div>
              ) : podcastTurns.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#5e7a76]">No audio discussion generated yet.</div>
              ) : (
                <div className="space-y-5">
                  {/* Podcast Media Player Strip */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1c4e48] to-[#25635b] text-white flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                        <Volume2 className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm">NotebookLM Deep Dive Audio Overview</h4>
                        <p className="text-[11px] text-[#b8d6d0]">
                          Featuring <strong className="text-white">Alex</strong> (Lead Host) &{' '}
                          <strong className="text-white">Jordan</strong> (Analyst)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={resetPodcast}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                        title="Reset playback to beginning"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={togglePlayPodcast}
                        className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#183237] text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        {isPlayingPodcast ? (
                          <>
                            <Pause className="w-4 h-4" />
                            <span>Pause Discussion</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current" />
                            <span>Play Discussion</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Dialogue Script Cards */}
                  <div className="space-y-3">
                    {podcastTurns.map((turn, idx) => {
                      const isCurrent = activeTurnIndex === idx;
                      const isAlex = turn.speaker === 'Alex';

                      return (
                        <div
                          key={idx}
                          onClick={() => playPodcastTurn(idx)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-50/80 border-emerald-400 shadow-md ring-2 ring-emerald-300'
                              : isAlex
                              ? 'bg-white border-[#e2ece9] hover:border-[#3c8b7e]'
                              : 'bg-[#f8fbfa] border-[#e2ece9] hover:border-[#3c8b7e]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isAlex
                                  ? 'bg-[#1c4e48] text-white'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {turn.speaker} {isAlex ? '(Lead Host)' : '(Co-Host)'}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
                                <Volume2 className="w-3.5 h-3.5" />
                                Speaking…
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#183237] leading-relaxed font-medium">
                            "{turn.text}"
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
