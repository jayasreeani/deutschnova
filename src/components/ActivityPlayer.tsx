"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Volume2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Mic,
  Send,
  BookOpen,
  Award,
  HelpCircle,
  AlertCircle,
  Check,
  X,
  Brain,
  Headphones,
  MessageSquare,
  Compass,
  MapPin,
  Play,
  Radio,
} from "lucide-react";
import {
  LearningDay,
  LessonActivity,
  DetectedMistake,
  MissionCompletionFeedback,
} from "@/types/learning";
import { useLearning } from "@/context/LearningContext";
import WhyWasIWrongCard from "./WhyWasIWrongCard";
import { UniversalVoiceSession } from "@/lib/voiceRecorder";

interface ActivityPlayerProps {
  day: LearningDay;
  activity: LessonActivity;
  onClose: () => void;
  onNextActivity: (nextActivityId: string | null) => void;
}

export function speakGerman(text: string, rate = 0.92) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const deVoice = voices.find((v) => v.lang.toLowerCase().startsWith("de"));
    if (deVoice) utterance.voice = deVoice;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech synthesis errors on unsupported environments
  }
}

export function speakEnglish(text: string, rate = 0.95) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("en-us") ||
        v.lang.toLowerCase().startsWith("en-gb") ||
        v.lang.toLowerCase().startsWith("en")
    );
    if (enVoice) utterance.voice = enVoice;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech synthesis errors on unsupported environments
  }
}

export function speakBilingual(germanText: string, englishText: string, rate = 0.92) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    if (!germanText) {
      if (englishText) speakEnglish(englishText);
      return;
    }
    const deUtterance = new SpeechSynthesisUtterance(germanText);
    deUtterance.lang = "de-DE";
    deUtterance.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const deVoice = voices.find((v) => v.lang.toLowerCase().startsWith("de"));
    if (deVoice) deUtterance.voice = deVoice;

    if (englishText) {
      deUtterance.onend = () => {
        try {
          const enUtterance = new SpeechSynthesisUtterance(englishText);
          enUtterance.lang = "en-US";
          enUtterance.rate = 0.95;
          const enVoice = voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith("en-us") ||
              v.lang.toLowerCase().startsWith("en-gb") ||
              v.lang.toLowerCase().startsWith("en")
          );
          if (enVoice) enUtterance.voice = enVoice;
          window.speechSynthesis.speak(enUtterance);
        } catch {}
      };
    }

    window.speechSynthesis.speak(deUtterance);
  } catch {
    // Ignore speech synthesis errors on unsupported environments
  }
}

export default function ActivityPlayer({
  day,
  activity,
  onClose,
  onNextActivity,
}: ActivityPlayerProps) {
  const {
    plan,
    completeActivity,
    recordGrammarAttempt,
    recordVocabularyAttempt,
    recordLearnerMistake,
    recordCorrectStructuresUsage,
    saveMissionFeedback,
  } = useLearning();

  // Shared state
  const [vocabIndex, setVocabIndex] = useState(0);
  const [practicedWords, setPracticedWords] = useState<Record<string, boolean>>(
    {}
  );

  // Grammar check state
  const [grammarAnswers, setGrammarAnswers] = useState<Record<string, string>>(
    {}
  );
  const [showWhyWrongDemo, setShowWhyWrongDemo] = useState<
    Record<string, boolean>
  >({});

  // Listening state
  const [showTranslations, setShowTranslations] = useState(true);
  const [listeningAnswers, setListeningAnswers] = useState<
    Record<string, string>
  >({});

  // Sentence Building state
  const [selectedWordsByItem, setSelectedWordsByItem] = useState<
    Record<string, string[]>
  >({});
  const [sentenceChecked, setSentenceChecked] = useState<
    Record<string, boolean>
  >({});

  // Speaking state (Universal Voice Recorder with live waveform + real STT)
  const [speakingWordMatchRatio, setSpeakingWordMatchRatio] = useState<
    Record<string, string>
  >({});
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [spokenTranscript, setSpokenTranscript] = useState<
    Record<string, string>
  >({});
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [typedPronunciationFallback, setTypedPronunciationFallback] = useState<
    Record<string, string>
  >({});
  const [speakingVoiceNotes, setSpeakingVoiceNotes] = useState<
    Record<string, string>
  >({});
  const [speakingAudioLevel, setSpeakingAudioLevel] = useState<number>(0);
  const [speakingDuration, setSpeakingDuration] = useState<number>(0);
  const speakingVoiceSessionRef = useRef<UniversalVoiceSession | null>(null);

  // AI Conversation / Real-Life Mission state (Dynamic /api/ai-mission)
  const [missionMode, setMissionMode] = useState<"coach" | "real_life">("coach");
  const [missionAudioLanguage, setMissionAudioLanguage] = useState<
    "english" | "bilingual" | "german"
  >("english");
  const [chatHistory, setChatHistory] = useState<
    {
      sender: "ai" | "user";
      german: string;
      english?: string;
      feedback?: string;
      mistake?: DetectedMistake | null;
      requiresRetry?: boolean;
      audioUrl?: string;
    }[]
  >([
    {
      sender: "ai",
      german: day.aiConversation.openingMessageDe,
      english: day.aiConversation.openingMessageEn,
    },
  ]);
  const [customInput, setCustomInput] = useState("");
  const [usedPromptIndexes, setUsedPromptIndexes] = useState<number[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isMissionListening, setIsMissionListening] = useState(false);
  const [missionAudioLevel, setMissionAudioLevel] = useState<number>(0);
  const [missionRecordSeconds, setMissionRecordSeconds] = useState<number>(0);
  const [missionPendingVoiceNote, setMissionPendingVoiceNote] = useState<{
    audioUrl: string;
    durationSeconds: number;
  } | null>(null);
  const missionVoiceSessionRef = useRef<UniversalVoiceSession | null>(null);

  // Clean up any active voice recording session on unmount
  useEffect(() => {
    return () => {
      if (speakingVoiceSessionRef.current) {
        speakingVoiceSessionRef.current.cancel();
      }
      if (missionVoiceSessionRef.current) {
        missionVoiceSessionRef.current.cancel();
      }
    };
  }, []);
  const [activeCoachCorrection, setActiveCoachCorrection] = useState<{
    headline: string;
    mistake: DetectedMistake;
  } | null>(null);
  const [activeRecoverySupport, setActiveRecoverySupport] = useState<{
    type: "not_understood" | "slower" | "repeat";
    simplifiedGerman: string;
    englishExplanation: string;
    suggestedReplies: string[];
  } | null>(null);
  const [missionMistakes, setMissionMistakes] = useState<DetectedMistake[]>([]);
  const [missionUsedWords, setMissionUsedWords] = useState<string[]>([]);
  const [missionStrengths, setMissionStrengths] = useState<string[]>([]);
  const [missionCompleteData, setMissionCompleteData] =
    useState<MissionCompletionFeedback | null>(null);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const findNextActivityId = (): string | null => {
    const idx = day.activities.findIndex((a) => a.id === activity.id);
    if (idx >= 0 && idx + 1 < day.activities.length) {
      return day.activities[idx + 1].id;
    }
    return null;
  };

  const handleFinishActivity = (
    customScore = 92,
    mistakeCategories: string[] = []
  ) => {
    completeActivity({
      dayNumber: day.dayNumber,
      activityId: activity.id,
      score: customScore,
      grammarMistakeCategories: mistakeCategories,
    });
    const nextId = findNextActivityId();
    if (nextId) {
      onNextActivity(nextId);
    } else {
      onClose();
    }
  };

  const getArticleBadgeColor = (article?: string) => {
    if (article === "der")
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    if (article === "die")
      return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    if (article === "das")
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  };

  // STEP 1: TODAY'S MISSION VIEW
  if (activity.type === "todays_mission") {
    const mb = day.missionBriefing;
    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full mb-1.5">
              <Compass className="w-3.5 h-3.5" /> Step {activity.order} of{" "}
              {day.activities.length} • Today&apos;s Mission Briefing
            </span>
            <h3 className="text-xl font-extrabold text-white">
              {mb?.missionTitle || `Mission: ${day.goalTitle}`}
            </h3>
            {mb?.locationBadge && (
              <p className="text-xs text-amber-300 font-semibold mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {mb.locationBadge}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800"
          >
            Close Player
          </button>
        </div>

        {/* Real-Life Goal */}
        <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
            Real-Life Readiness Goal
          </div>
          <p className="text-sm sm:text-base font-medium text-white leading-relaxed">
            {mb?.realLifeGoal || day.description}
          </p>
        </div>

        {/* What You Will Be Able To Do */}
        {mb?.whatYouWillBeAbleToDo && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              What You Will Master Today:
            </div>
            {mb.whatYouWillBeAbleToDo.map((cap, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        )}

        {/* Key Capabilities Preview with Audio */}
        {mb?.keyCapabilities && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Target Expressions for Today&apos;s Mission (Tap to Hear):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {mb.keyCapabilities.map((kc, idx) => (
                <button
                  key={idx}
                  onClick={() => speakGerman(kc.german)}
                  className="text-left p-3.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-between gap-2 transition"
                >
                  <div>
                    <div className="text-sm font-bold text-white">
                      {kc.german}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {kc.english}
                    </div>
                  </div>
                  <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cultural Coach Note */}
        {mb?.culturalTipAustria && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-200">
            <strong className="text-amber-300 uppercase tracking-wider mr-1.5">
              🇦🇹 Coach Tip:
            </strong>
            {mb.culturalTipAustria}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={() => handleFinishActivity(100)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            Start Mission Vocabulary (+{activity.xpReward} XP){" "}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // STEP 2: VOCABULARY VIEW (With strict Article + Plural + Meaning + Example + Learning Status)
  if (activity.type === "vocabulary") {
    const currentWord = day.vocabulary[vocabIndex] || day.vocabulary[0];
    const trackedStatus =
      plan.vocabularyProgress[currentWord.id]?.status ||
      currentWord.learningStatus ||
      "Learning";

    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full mb-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Step {activity.order} of{" "}
              {day.activities.length} • Vocabulary &amp; Phrases
            </span>
            <h3 className="text-xl font-bold text-white">
              Nouns with Articles, Plurals &amp; Useful Chunks
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800"
          >
            Close Player
          </button>
        </div>

        {/* Word Selector Pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {day.vocabulary.map((item, idx) => {
            const isPracticed = practicedWords[item.id];
            const isCurrent = idx === vocabIndex;
            return (
              <button
                key={item.id}
                onClick={() => setVocabIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  isCurrent
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-lg shadow-emerald-500/20"
                    : isPracticed
                    ? "bg-emerald-950/50 text-emerald-300 border-emerald-700/50"
                    : "bg-slate-800/70 text-slate-300 border-slate-700 hover:border-slate-600"
                }`}
              >
                {isPracticed && <Check className="w-3.5 h-3.5" />}
                {item.article ? `${item.article} ` : ""}
                {item.word}
              </button>
            );
          })}
        </div>

        {/* Active Vocabulary Card following strict VOCABULARY RULE */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900 border border-slate-700/80 rounded-2xl p-5 mb-5">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {currentWord.article ? (
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${getArticleBadgeColor(
                      currentWord.article
                    )}`}
                  >
                    Article: {currentWord.article} (
                    {currentWord.article === "der"
                      ? "masculine"
                      : currentWord.article === "die"
                      ? "feminine"
                      : "neuter"}
                    )
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-md border bg-teal-500/15 text-teal-300 border-teal-500/30">
                    Useful Expression / Chunk
                  </span>
                )}

                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-md ${
                    trackedStatus === "Strong"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : trackedStatus === "Improving"
                      ? "bg-sky-500/20 text-sky-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  Status: {trackedStatus}
                </span>
              </div>

              {/* Explicit Noun + Article + Plural + Meaning format */}
              <h4 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight pt-1">
                {currentWord.article &&
                !currentWord.word
                  .toLowerCase()
                  .startsWith(currentWord.article.toLowerCase() + " ")
                  ? `${currentWord.article} ${currentWord.word}`
                  : currentWord.word}
              </h4>

              {currentWord.plural && (
                <div className="text-sm font-semibold text-sky-300">
                  Plural: <span className="text-white">{currentWord.plural}</span>
                </div>
              )}

              <div className="text-base text-emerald-400 font-bold">
                Meaning: {currentWord.english}
              </div>

              <div className="text-xs text-slate-400">
                Pronunciation:{" "}
                <span className="text-slate-200 font-mono">
                  [{currentWord.pronunciationHint}]
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  speakGerman(
                    currentWord.article &&
                      !currentWord.word
                        .toLowerCase()
                        .startsWith(currentWord.article.toLowerCase() + " ")
                      ? `${currentWord.article} ${currentWord.word}`
                      : currentWord.word,
                    0.9
                  )
                }
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition"
              >
                <Volume2 className="w-4 h-4" /> Hear Expression
              </button>
              <button
                onClick={() => speakGerman(currentWord.exampleDe, 0.88)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
              >
                <Volume2 className="w-4 h-4" /> Example
              </button>
            </div>
          </div>

          <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 mt-3">
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">
              Useful Real-Life Sentence
            </div>
            <p className="text-sm sm:text-base font-bold text-white">
              „{currentWord.exampleDe}“
            </p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {currentWord.exampleEn}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  recordVocabularyAttempt(currentWord.id, true);
                  setPracticedWords((p) => ({ ...p, [currentWord.id]: true }));
                  if (vocabIndex + 1 < day.vocabulary.length) {
                    setVocabIndex(vocabIndex + 1);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Check className="w-4 h-4" /> Mark Strong
              </button>
              <button
                onClick={() => {
                  recordVocabularyAttempt(currentWord.id, false);
                  setPracticedWords((p) => ({ ...p, [currentWord.id]: true }));
                  if (vocabIndex + 1 < day.vocabulary.length) {
                    setVocabIndex(vocabIndex + 1);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Needs Practice
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Item {vocabIndex + 1} of {day.vocabulary.length}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Rule: Always learn German nouns with their article (
            <span className="text-blue-400 font-bold">der</span>,{" "}
            <span className="text-rose-400 font-bold">die</span>,{" "}
            <span className="text-emerald-400 font-bold">das</span>) and plural!
          </p>
          <button
            onClick={() => handleFinishActivity(95)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            Complete Vocabulary (+{activity.xpReward} XP){" "}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // STEP 3: GRAMMAR VIEW (With "Why was I wrong?" remediation!)
  if (activity.type === "grammar") {
    const g = day.grammar;
    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full mb-1.5">
              <Brain className="w-3.5 h-3.5" /> Step {activity.order} of{" "}
              {day.activities.length} • Grammar for Today&apos;s Mission
            </span>
            <h3 className="text-xl font-bold text-white">{g.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800"
          >
            Close Player
          </button>
        </div>

        <div className="space-y-5">
          {/* Explanation */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-4 sm:p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">
              Real-Life Pattern
            </div>
            <p className="text-white font-semibold text-sm sm:text-base mb-2">
              {g.summary}
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {g.explanationEn}
            </p>
            <ul className="mt-3 space-y-1.5">
              {g.keyRules.map((rule, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs sm:text-sm text-emerald-300"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Grammar Table */}
          {g.table && (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-800/90 text-slate-300 text-xs uppercase">
                  <tr>
                    {g.table.headers.map((h, i) => (
                      <th key={i} className="px-3.5 py-2.5 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                  {g.table.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/40">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`px-3.5 py-2.5 ${
                            cIdx === 0
                              ? "font-semibold text-emerald-300"
                              : "text-slate-200"
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Check Questions with "Why was I wrong?" */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Interactive Check (Includes &ldquo;Why Was I Wrong?&rdquo; Coaching)
            </h4>
            {g.checkQuestions.map((q) => {
              const chosen = grammarAnswers[q.id];
              const isCorrect = chosen === q.correctAnswer;
              const defaultWhyWrong = q.whyWrong || {
                learnerMistakeExample: chosen || "Incorrect form",
                correctSentence: q.correctAnswer,
                ruleHeadline: q.explanation,
                stepByStepBreakdown: [
                  `Target Rule: ${g.title}`,
                  `Correct Form: ${q.correctAnswer}`,
                ],
                followUpQuestion: {
                  prompt: `Confirm the correct answer for: "${q.prompt}"`,
                  options: q.options.slice(0, 3),
                  correctAnswer: q.correctAnswer,
                  successMessage: "Perfekt! You've got it.",
                },
              };

              return (
                <div
                  key={q.id}
                  className="bg-slate-800/50 border border-slate-700/70 rounded-xl p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-sm font-semibold text-white">
                      {q.prompt}
                    </p>
                    {q.whyWrong && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowWhyWrongDemo((p) => ({
                            ...p,
                            [q.id]: !p[q.id],
                          }))
                        }
                        className="text-xs text-amber-300 hover:underline flex items-center gap-1"
                      >
                        <HelpCircle className="w-3.5 h-3.5" /> Why was I wrong?
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt) => {
                      const selected = chosen === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => {
                            setGrammarAnswers((prev) => ({
                              ...prev,
                              [q.id]: opt,
                            }));
                            recordGrammarAttempt(
                              q.grammarCategory,
                              opt === q.correctAnswer
                            );
                          }}
                          className={`px-3.5 py-2.5 rounded-xl text-left text-xs sm:text-sm font-medium border transition ${
                            selected
                              ? opt === q.correctAnswer
                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                : "bg-rose-500/20 border-rose-500 text-rose-300"
                              : "bg-slate-900/80 border-slate-700 text-slate-200 hover:border-slate-500"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {chosen && isCorrect && !showWhyWrongDemo[q.id] && (
                    <div className="mt-3 text-xs p-2.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Correct! {q.explanation}</span>
                    </div>
                  )}

                  {((chosen && !isCorrect) || showWhyWrongDemo[q.id]) && (
                    <WhyWasIWrongCard
                      learnerChoice={
                        chosen && !isCorrect
                          ? chosen
                          : defaultWhyWrong.learnerMistakeExample
                      }
                      remediation={defaultWhyWrong}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleFinishActivity(92)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              Complete Grammar (+{activity.xpReward} XP){" "}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 4: LISTEN VIEW
  if (activity.type === "listening") {
    const l = day.listening;
    const playFullDialogue = (rate = 0.92) => {
      const fullText = l.dialogue.map((d) => d.german).join(" ... ");
      speakGerman(fullText, rate);
    };

    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full mb-1.5">
              <Headphones className="w-3.5 h-3.5" /> Step {activity.order} of{" "}
              {day.activities.length} • Listen in Real-Life Context
            </span>
            <h3 className="text-xl font-bold text-white">{l.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {l.contextDescription}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800"
          >
            Close Player
          </button>
        </div>

        {/* Audio Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/70 border border-slate-700/80 rounded-xl p-3.5 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => playFullDialogue(0.95)}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Volume2 className="w-4 h-4" /> Play Dialogue (1.0x)
            </button>
            <button
              onClick={() => playFullDialogue(0.75)}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Volume2 className="w-3.5 h-3.5" /> Slow (0.75x)
            </button>
          </div>
          <button
            onClick={() => setShowTranslations((s) => !s)}
            className="text-xs text-slate-300 hover:text-white underline"
          >
            {showTranslations ? "Hide English" : "Show English"}
          </button>
        </div>

        {/* Dialogue Lines */}
        <div className="space-y-2.5 mb-5">
          {l.dialogue.map((line, idx) => (
            <div
              key={idx}
              className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 flex items-start justify-between gap-3"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  {line.speaker}
                </span>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {line.german}
                </p>
                {showTranslations && (
                  <p className="text-xs text-slate-400 mt-1">{line.english}</p>
                )}
              </div>
              <button
                onClick={() => speakGerman(line.german, 0.9)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 shrink-0"
                title="Play line"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Comprehension Questions */}
        <div className="space-y-3 mb-5">
          {l.questions.map((q) => {
            const chosen = listeningAnswers[q.id];
            const isCorrect = chosen === q.correctAnswer;
            return (
              <div
                key={q.id}
                className="bg-slate-800/50 border border-slate-700/70 rounded-xl p-4"
              >
                <p className="text-sm font-semibold text-white mb-2.5">
                  {q.question}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() =>
                        setListeningAnswers((prev) => ({
                          ...prev,
                          [q.id]: opt,
                        }))
                      }
                      className={`px-3.5 py-2 rounded-xl text-left text-xs sm:text-sm border transition ${
                        chosen === opt
                          ? opt === q.correctAnswer
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold"
                            : "bg-rose-500/20 border-rose-500 text-rose-300"
                          : "bg-slate-900/80 border-slate-700 text-slate-200 hover:border-slate-500"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {chosen && (
                  <p
                    className={`mt-2 text-xs ${
                      isCorrect ? "text-emerald-400" : "text-amber-300"
                    }`}
                  >
                    {isCorrect ? "✓ Correct! " : "Explanation: "}
                    {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => handleFinishActivity(94)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            Complete Listen (+{activity.xpReward} XP){" "}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // STEP 5: PRACTICE VIEW (Sentence-Building + "Why was I wrong?" Showcase!)
  if (activity.type === "sentence_building") {
    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full mb-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Step {activity.order} of{" "}
              {day.activities.length} • Practice &amp; &ldquo;Why Was I
              Wrong?&rdquo; Coach
            </span>
            <h3 className="text-xl font-bold text-white">
              Construct Real-Life Sentences
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800"
          >
            Close Player
          </button>
        </div>

        <div className="space-y-5 mb-6">
          {day.sentenceBuilding.map((item, idx) => {
            const selectedWords = selectedWordsByItem[item.id] || [];
            const builtSentence = selectedWords.join(" ");
            const isMatch =
              builtSentence.toLowerCase().trim() ===
              item.targetGerman.toLowerCase().trim();
            const isChecked = sentenceChecked[item.id];

            const remainingWords = [...item.scrambledWords];
            selectedWords.forEach((sw) => {
              const rIdx = remainingWords.indexOf(sw);
              if (rIdx !== -1) remainingWords.splice(rIdx, 1);
            });

            const fallbackWhyWrong = item.whyWrong || {
              learnerMistakeExample:
                builtSentence || "Ich gehe mit meine Freundin.",
              correctSentence: item.targetGerman,
              ruleHeadline: item.grammarHint,
              stepByStepBreakdown: [
                `Target Sentence: ${item.targetGerman}`,
                `Grammar Focus: ${item.grammarHint}`,
              ],
              followUpQuestion: {
                prompt: `Select the correct German translation for "${item.englishPrompt}":`,
                options: [
                  item.targetGerman,
                  item.scrambledWords.join(" "),
                ],
                correctAnswer: item.targetGerman,
                successMessage: "Ausgezeichnet! Sentence order mastered.",
              },
            };

            return (
              <div
                key={item.id}
                className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Practice {idx + 1}
                  </span>
                  <button
                    onClick={() => speakGerman(item.targetGerman)}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Hear Target Audio
                  </button>
                </div>
                <p className="text-sm sm:text-base font-bold text-white mb-3">
                  “{item.englishPrompt}”
                </p>

                {/* Built Sentence Slot */}
                <div className="min-h-[50px] bg-slate-950/80 border border-slate-700 rounded-xl p-3 mb-3 flex flex-wrap items-center gap-2">
                  {selectedWords.length === 0 ? (
                    <span className="text-xs text-slate-500">
                      Tap word tiles below in the right order...
                    </span>
                  ) : (
                    selectedWords.map((word, wIdx) => (
                      <button
                        key={`${word}-${wIdx}`}
                        onClick={() => {
                          const next = [...selectedWords];
                          next.splice(wIdx, 1);
                          setSelectedWordsByItem((prev) => ({
                            ...prev,
                            [item.id]: next,
                          }));
                          setSentenceChecked((prev) => ({
                            ...prev,
                            [item.id]: false,
                          }));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-semibold hover:bg-rose-500/20 transition"
                      >
                        {word}
                      </button>
                    ))
                  )}
                </div>

                {/* Available Word Bank */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {remainingWords.map((word, wIdx) => (
                    <button
                      key={`${word}-${wIdx}`}
                      onClick={() => {
                        setSelectedWordsByItem((prev) => ({
                          ...prev,
                          [item.id]: [...(prev[item.id] || []), word],
                        }));
                        setSentenceChecked((prev) => ({
                          ...prev,
                          [item.id]: false,
                        }));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-medium transition"
                    >
                      {word}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setSentenceChecked((prev) => ({
                          ...prev,
                          [item.id]: true,
                        }));
                        recordGrammarAttempt(item.grammarCategory, isMatch);
                      }}
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                    >
                      Check Answer
                    </button>
                    <button
                      onClick={() => {
                        setSelectedWordsByItem((prev) => ({
                          ...prev,
                          [item.id]: item.targetGerman.split(" "),
                        }));
                        setSentenceChecked((prev) => ({
                          ...prev,
                          [item.id]: true,
                        }));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                    >
                      Show Solution
                    </button>
                    <button
                      onClick={() =>
                        setShowWhyWrongDemo((p) => ({
                          ...p,
                          [item.id]: !p[item.id],
                        }))
                      }
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold"
                    >
                      Why Was I Wrong?
                    </button>
                  </div>
                </div>

                {isChecked && isMatch && !showWhyWrongDemo[item.id] && (
                  <div className="mt-3 p-3 rounded-lg text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800">
                    ✓ Ausgezeichnet! „{item.targetGerman}.“
                  </div>
                )}

                {((isChecked && !isMatch) || showWhyWrongDemo[item.id]) && (
                  <WhyWasIWrongCard
                    learnerChoice={
                      builtSentence && !isMatch
                        ? builtSentence
                        : fallbackWhyWrong.learnerMistakeExample
                    }
                    remediation={fallbackWhyWrong}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => handleFinishActivity(92)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            Complete Practice (+{activity.xpReward} XP){" "}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // STEP 6: SPEAK VIEW (Universal Voice Recording with live waveform, real STT de-DE & voice note playback)
  if (activity.type === "speaking") {
    const computeWordMatchSummary = (target: string, spoken: string) => {
      const clean = (s: string) =>
        s
          .toLowerCase()
          .replace(/[.,!?„“"]/g, "")
          .split(/\s+/)
          .filter(Boolean);
      const targetWords = clean(target);
      const spokenWords = clean(spoken);
      if (spokenWords.length === 0) return null;
      const matches = targetWords.filter((tw) => spokenWords.includes(tw)).length;
      return `${matches}/${targetWords.length} target words recognized`;
    };

    const stopSpeakingPractice = async (promptId?: string) => {
      if (!speakingVoiceSessionRef.current) return;
      const session = speakingVoiceSessionRef.current;
      const targetId = promptId || recordingId;
      setRecordingId(null);
      setSpeakingAudioLevel(0);
      setSpeakingDuration(0);
      const res = await session.stop();
      speakingVoiceSessionRef.current = null;
      if (res && targetId) {
        if (res.audioUrl) {
          setSpeakingVoiceNotes((prev) => ({
            ...prev,
            [targetId]: res.audioUrl,
          }));
        }
        const text = res.transcript.trim();
        if (text) {
          setSpokenTranscript((prev) => ({
            ...prev,
            [targetId]: text,
          }));
          const targetItem = day.speaking.find((s) => s.id === targetId);
          if (targetItem) {
            const summary = computeWordMatchSummary(
              targetItem.germanPhrase,
              text
            );
            if (summary) {
              setSpeakingWordMatchRatio((prev) => ({
                ...prev,
                [targetId]: summary,
              }));
            }
          }
        }
      }
    };

    const startSpeechPractice = async (promptItem: {
      id: string;
      germanPhrase: string;
    }) => {
      setSpeechNotice(null);
      if (recordingId === promptItem.id) {
        await stopSpeakingPractice(promptItem.id);
        return;
      }

      if (speakingVoiceSessionRef.current) {
        speakingVoiceSessionRef.current.cancel();
        speakingVoiceSessionRef.current = null;
      }

      const session = new UniversalVoiceSession();
      speakingVoiceSessionRef.current = session;
      setRecordingId(promptItem.id);
      setSpeakingAudioLevel(0);
      setSpeakingDuration(0);

      const started = await session.start({
        onVolumeChange: (vol) => setSpeakingAudioLevel(vol),
        onDurationChange: (sec) => setSpeakingDuration(sec),
        onTranscriptUpdate: (text, isFinal) => {
          setSpokenTranscript((prev) => ({
            ...prev,
            [promptItem.id]: text,
          }));
          if (isFinal) {
            const summary = computeWordMatchSummary(
              promptItem.germanPhrase,
              text
            );
            if (summary) {
              setSpeakingWordMatchRatio((prev) => ({
                ...prev,
                [promptItem.id]: summary,
              }));
            }
          }
        },
        onError: (msg) => {
          setRecordingId(null);
          setSpeakingAudioLevel(0);
          setSpeakingDuration(0);
          setSpeechNotice(msg);
        },
      });

      if (!started) {
        setRecordingId(null);
        setSpeakingAudioLevel(0);
        setSpeakingDuration(0);
      }
    };

    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full mb-1.5">
              <Mic className="w-3.5 h-3.5" /> Step {activity.order} of{" "}
              {day.activities.length} • Speak Out Loud (Universal Voice Capture &amp; STT)
            </span>
            <h3 className="text-xl font-bold text-white">
              Spoken Confidence &amp; German Pronunciation Practice
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800"
          >
            Close Player
          </button>
        </div>

        {/* Transparent Distinction Banner: Speech Recognition vs Grammar vs Pronunciation */}
        <div className="mb-4 p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong className="text-emerald-400">Voice Transparency:</strong>{" "}
            Captures your voice via universal <code className="text-sky-300">MediaRecorder</code>, provides live volume visualizer, runs{" "}
            <code className="text-sky-300">SpeechRecognition (de-DE)</code> when supported, and allows audio playback comparison against native German.
          </div>
        </div>

        {speechNotice && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{speechNotice}</span>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {day.speaking.map((sp, idx) => {
            const matchRatio = speakingWordMatchRatio[sp.id];
            const isRec = recordingId === sp.id;
            const typedVal = typedPronunciationFallback[sp.id] ?? "";
            return (
              <div
                key={sp.id}
                className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                      Phrase {idx + 1}
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-white mt-1">
                      „{sp.germanPhrase}“
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                      {sp.englishMeaning}
                    </p>
                    <p className="text-xs font-mono text-emerald-300 mt-2">
                      Phonetic Guide: [{sp.phoneticGuide}]
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => speakGerman(sp.germanPhrase, 0.88)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Volume2 className="w-4 h-4 text-emerald-400" /> Listen (de-DE)
                    </button>
                    {speakingVoiceNotes[sp.id] && (
                      <button
                        onClick={() => {
                          const audio = new Audio(speakingVoiceNotes[sp.id]);
                          audio.play().catch(() => {});
                        }}
                        className="px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Play Your Voice
                      </button>
                    )}
                    <button
                      onClick={() => startSpeechPractice(sp)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                        isRec
                          ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30"
                          : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      {isRec
                        ? `Recording Voice (0:${speakingDuration < 10 ? `0${speakingDuration}` : speakingDuration})... Tap to Stop`
                        : matchRatio
                        ? "Record Again"
                        : "Tap to Speak (de-DE)"}
                    </button>
                  </div>
                </div>

                {/* Live sound meter during recording */}
                {isRec && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                      <span className="font-extrabold text-rose-200 uppercase">
                        Recording Voice — Speak German into microphone
                      </span>
                    </div>
                    <div className="flex items-end gap-1 h-4 px-2 bg-slate-950/90 rounded border border-slate-800">
                      {[0.3, 0.7, 1.0, 0.6, 0.9, 0.4].map((scale, i) => (
                        <div
                          key={i}
                          className="w-1.5 rounded-full bg-rose-400 transition-all duration-75"
                          style={{
                            height: `${Math.max(4, Math.min(16, (speakingAudioLevel / 100) * 16 * scale + (speakingAudioLevel > 5 ? 2 : 1)))}px`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-300">
                  <strong className="text-amber-300">Pronunciation Focus Tip:</strong>{" "}
                  {sp.focusSound} — {sp.contextTip}
                </div>

                {/* Spoken or Text Fallback Input */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={typedVal}
                    onChange={(e) =>
                      setTypedPronunciationFallback((p) => ({
                        ...p,
                        [sp.id]: e.target.value,
                      }))
                    }
                    placeholder={`Text fallback if Mic unavailable: "${sp.germanPhrase}"`}
                    className="flex-1 min-w-[200px] bg-slate-950/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const textToVerify = typedVal.trim();
                      if (!textToVerify) {
                        setSpeechNotice(
                          "Please type the German phrase in the fallback box or use the Microphone button."
                        );
                        return;
                      }
                      const summary = computeWordMatchSummary(
                        sp.germanPhrase,
                        textToVerify
                      );
                      setSpokenTranscript((p) => ({
                        ...p,
                        [sp.id]: textToVerify,
                      }));
                      if (summary) {
                        setSpeakingWordMatchRatio((p) => ({
                          ...p,
                          [sp.id]: `${summary} (Text Fallback)`,
                        }));
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold"
                  >
                    Verify Phrase
                  </button>
                </div>

                {matchRatio && (
                  <div className="mt-3 bg-emerald-950/50 border border-emerald-800/70 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-emerald-300 font-medium">
                      ✓ Recognized Transcript:{" "}
                      <strong>„{spokenTranscript[sp.id]}“</strong>
                    </span>
                    <span className="font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full">
                      STT Word Match: {matchRatio}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => handleFinishActivity(91)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            Complete Speak (+{activity.xpReward} XP){" "}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // STEP 7: REAL-LIFE MISSION (Dynamic AI Conversation with COACH MODE & REAL-LIFE MODE)
  if (activity.type === "ai_conversation") {
    const ai = day.aiConversation;

    const sendLearnerTurnToMissionApi = async (
      learnerText: string,
      promptIdx?: number,
      audioUrl?: string
    ) => {
      if (!learnerText.trim() || isAiThinking) return;
      const trimmed = learnerText.trim();
      setIsAiThinking(true);
      setActiveCoachCorrection(null);
      setActiveRecoverySupport(null);
      setMissionPendingVoiceNote(null);

      try {
        const res = await fetch("/api/ai-mission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayNumber: day.dayNumber,
            mode: missionMode,
            learnerMessage: trimmed,
            turnIndex,
            conversationHistory: chatHistory,
          }),
        });
        const data = await res.json();

        const detected: DetectedMistake | null = data.detectedMistake || null;
        if (detected) {
          recordLearnerMistake(detected, day.dayNumber);
          setMissionMistakes((prev) => {
            const exists = prev.some(
              (m) =>
                m.learnerUsage.toLowerCase() ===
                detected.learnerUsage.toLowerCase()
            );
            return exists ? prev : [...prev, detected];
          });
        } else if (
          Array.isArray(data.correctStructuresUsed) &&
          data.correctStructuresUsed.length > 0
        ) {
          // Learner used target structures accurately -> update Mastery & Recovery!
          recordCorrectStructuresUsage(data.correctStructuresUsed);
        }

        if (data.recoverySupport) {
          setActiveRecoverySupport(data.recoverySupport);
        }

        if (Array.isArray(data.usedVocabulary) && data.usedVocabulary.length > 0) {
          setMissionUsedWords((prev) =>
            Array.from(new Set([...prev, ...data.usedVocabulary]))
          );
        }
        if (data.positiveNote) {
          setMissionStrengths((prev) =>
            Array.from(new Set([...prev, data.positiveNote]))
          );
        }

        // Play AI speech based on learner's language preference
        const playAiVoice = (deText: string, enText?: string) => {
          if (missionAudioLanguage === "english" && enText) {
            speakEnglish(enText);
          } else if (missionAudioLanguage === "bilingual" && enText) {
            speakBilingual(deText, enText);
          } else {
            speakGerman(deText, 0.92);
          }
        };

        // COACH MODE: Pause and show English coach feedback + "Try Again" when a material mistake is detected
        if (missionMode === "coach" && data.requiresRetry && detected) {
          const englishFeedback = `Coach Feedback: ${data.coachHeadline || "Almost right!"} → Say: „${detected.correctSentence}“ (${detected.englishTranslation || detected.explanation})`;
          setChatHistory((prev) => [
            ...prev,
            {
              sender: "user",
              german: trimmed,
              audioUrl,
              feedback: englishFeedback,
              mistake: detected,
              requiresRetry: true,
            },
          ]);
          setActiveCoachCorrection({
            headline: data.coachHeadline || "Almost right! Here is your coach feedback:",
            mistake: detected,
          });

          if (missionAudioLanguage === "english") {
            speakEnglish(`Coach Feedback: ${detected.explanation}. In German: ${detected.correctSentence}`);
          } else if (missionAudioLanguage === "bilingual") {
            speakBilingual(detected.correctSentence, detected.explanation);
          } else {
            speakGerman(detected.correctSentence, 0.9);
          }

          setIsAiThinking(false);
          return;
        }

        // Otherwise advance conversation with AI partner's reply
        if (typeof promptIdx === "number") {
          setUsedPromptIndexes((prev) =>
            prev.includes(promptIdx) ? prev : [...prev, promptIdx]
          );
        }

        const nextTurn =
          typeof data.nextTurnIndex === "number"
            ? data.nextTurnIndex
            : turnIndex + 1;
        setTurnIndex(nextTurn);

        setChatHistory((prev) => [
          ...prev,
          {
            sender: "user",
            german: trimmed,
            audioUrl,
            feedback:
              missionMode === "coach"
                ? data.minorCoachingTip || data.positiveNote
                : detected
                ? undefined
                : data.positiveNote,
            mistake: detected,
          },
          {
            sender: "ai",
            german: data.aiReplyDe,
            english: data.aiReplyEn,
          },
        ]);

        playAiVoice(data.aiReplyDe, data.aiReplyEn);

        // Build evidence-based MISSION COMPLETE feedback when the waiter completes the bill/interaction
        if (data.missionCompleted) {
          const allMistakes = detected
            ? Array.from(new Set([...missionMistakes, detected]))
            : missionMistakes;
          const allWords = Array.from(
            new Set([
              ...missionUsedWords,
              ...(data.usedVocabulary || []),
              ...(trimmed.toLowerCase().includes("kaffee")
                ? ["der Kaffee"]
                : []),
            ])
          );
          const allStrengths = Array.from(
            new Set([
              ...missionStrengths,
              data.positiveNote || "Communicated your order clearly in German",
              "Completed the restaurant dialogue naturally",
            ])
          );

          const feedbackPayload: MissionCompletionFeedback = {
            missionId: `day-${day.dayNumber}-mission`,
            dayNumber: day.dayNumber,
            mode: missionMode,
            completedAt: new Date().toISOString(),
            whatYouDidWell: allStrengths,
            importantCorrections: allMistakes.map((m) => ({
              learnerSentence: m.learnerSentence,
              correctSentence: m.correctSentence,
              explanation: m.explanation,
              word: m.word,
              learnerUsage: m.learnerUsage,
              correctUsage: m.correctUsage,
            })),
            newWordsUsed: (allWords.length > 0
              ? allWords
              : ["der Kaffee", "bestellen", "bitte"]
            ).map((w) => ({
              german: w,
              english: "Used in restaurant interaction",
            })),
            grammarToReview:
              allMistakes.length > 0
                ? Array.from(new Set(allMistakes.map((m) => m.categoryLabel)))
                : [day.grammar.title],
            focusAreaImpact: {
              categoryLabel:
                allMistakes.length > 0
                  ? `${allMistakes[0].categoryLabel} (${allMistakes[0].word} → ${allMistakes[0].correctUsage})`
                  : "Polite ordering with Ich möchte + Accusative",
              status: allMistakes.length > 1 ? "Needs Practice" : "Improving",
              occurrences: Math.max(1, allMistakes.length),
              note:
                allMistakes.length > 0
                  ? "Recorded in Personal Mistake Memory & 3-Minute Personal Review"
                  : "Strong performance in this scenario",
            },
            nextRecommendedPractice:
              allMistakes.length > 0
                ? `3-Minute Personal Review: ${allMistakes[0].word} → ${allMistakes[0].correctUsage}`
                : "Try Real-Life Mode without coaching hints",
          };
          setMissionCompleteData(feedbackPayload);
          saveMissionFeedback(feedbackPayload);
        }
      } catch {
        // Fallback if network fails
      } finally {
        setIsAiThinking(false);
      }
    };

    const handleSendCustom = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!customInput.trim()) return;
      const text = customInput.trim();
      setCustomInput("");
      await sendLearnerTurnToMissionApi(text);
    };

    const stopAndProcessMissionVoice = async () => {
      if (!missionVoiceSessionRef.current) return;
      const session = missionVoiceSessionRef.current;
      setIsMissionListening(false);
      setMissionAudioLevel(0);
      setMissionRecordSeconds(0);
      const result = await session.stop();
      missionVoiceSessionRef.current = null;
      if (!result) return;

      const transcript = (result.transcript || customInput).trim();
      if (transcript) {
        setCustomInput("");
        sendLearnerTurnToMissionApi(transcript, undefined, result.audioUrl);
      } else if (result.audioUrl) {
        // Voice recording captured audio, but browser STT produced no text (e.g. mobile Safari / quiet room)
        setMissionPendingVoiceNote({
          audioUrl: result.audioUrl,
          durationSeconds: result.durationSeconds,
        });
      }
    };

    const startMissionVoiceInput = async () => {
      setSpeechNotice(null);
      setMissionPendingVoiceNote(null);
      if (isMissionListening) {
        await stopAndProcessMissionVoice();
        return;
      }

      const session = new UniversalVoiceSession();
      missionVoiceSessionRef.current = session;
      setIsMissionListening(true);
      setMissionAudioLevel(0);
      setMissionRecordSeconds(0);

      const started = await session.start({
        onVolumeChange: (vol) => setMissionAudioLevel(vol),
        onDurationChange: (sec) => setMissionRecordSeconds(sec),
        onTranscriptUpdate: (text) => setCustomInput(text),
        onError: (msg) => {
          setIsMissionListening(false);
          setMissionAudioLevel(0);
          setMissionRecordSeconds(0);
          setSpeechNotice(msg);
        },
      });

      if (!started) {
        setIsMissionListening(false);
        setMissionAudioLevel(0);
        setMissionRecordSeconds(0);
      }
    };

    const cancelMissionVoiceInput = () => {
      if (missionVoiceSessionRef.current) {
        missionVoiceSessionRef.current.cancel();
        missionVoiceSessionRef.current = null;
      }
      setIsMissionListening(false);
      setMissionAudioLevel(0);
      setMissionRecordSeconds(0);
    };

    const resetMissionConversation = () => {
      setChatHistory([
        {
          sender: "ai",
          german: day.aiConversation.openingMessageDe,
          english: day.aiConversation.openingMessageEn,
        },
      ]);
      setUsedPromptIndexes([]);
      setTurnIndex(0);
      setActiveCoachCorrection(null);
      setActiveRecoverySupport(null);
      setMissionCompleteData(null);
      setCustomInput("");
    };

    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full mb-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Step {activity.order}{" "}
              of {day.activities.length} • Dynamic Real-Life Mission
            </span>
            <h3 className="text-xl font-bold text-white">{ai.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Partner:{" "}
              <strong className="text-slate-200">{ai.roleplayPartner}</strong> •{" "}
              {ai.setting}
            </p>
          </div>

          {/* COACH MODE vs REAL-LIFE MODE Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMissionMode("coach");
                  setActiveCoachCorrection(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  missionMode === "coach"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                COACH MODE
              </button>
              <button
                type="button"
                onClick={() => {
                  setMissionMode("real_life");
                  setActiveCoachCorrection(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  missionMode === "real_life"
                    ? "bg-amber-400 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                REAL-LIFE MODE
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>

        {/* Mode Explanation Banner */}
        <div
          className={`rounded-xl p-3 mb-4 text-xs border flex flex-wrap items-center justify-between gap-2 ${
            missionMode === "coach"
              ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
              : "bg-amber-950/30 border-amber-500/30 text-amber-200"
          }`}
        >
          <div>
            {missionMode === "coach" ? (
              <>
                <strong className="text-emerald-400 uppercase mr-1.5">
                  Coach Mode Active:
                </strong>
                If you make a grammar/article mistake (e.g.,{" "}
                <em>&ldquo;Ich möchte eine Kaffee.&rdquo;</em>), the coach pauses
                with <strong>&ldquo;Fast richtig!&rdquo;</strong> and lets you{" "}
                <strong>Try Again</strong>.
              </>
            ) : (
              <>
                <strong className="text-amber-400 uppercase mr-1.5">
                  Real-Life Mode Active:
                </strong>
                The AI waiter stays in character without interrupting your flow.
                Full evidence-based feedback is shown at the end of the mission.
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Audio Response Language Selector */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Audio:</span>
              <button
                type="button"
                onClick={() => setMissionAudioLanguage("english")}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                  missionAudioLanguage === "english"
                    ? "bg-teal-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="AI will speak the English translation"
              >
                🇬🇧 English
              </button>
              <button
                type="button"
                onClick={() => setMissionAudioLanguage("bilingual")}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                  missionAudioLanguage === "bilingual"
                    ? "bg-teal-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="AI will speak German followed by English translation"
              >
                🌐 Bilingual
              </button>
              <button
                type="button"
                onClick={() => setMissionAudioLanguage("german")}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                  missionAudioLanguage === "german"
                    ? "bg-teal-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="AI will speak German only"
              >
                🇩🇪 German
              </button>
            </div>
            <button
              type="button"
              onClick={resetMissionConversation}
              className="text-xs font-bold underline text-slate-400 hover:text-white shrink-0"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="space-y-3 bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-4 max-h-80 overflow-y-auto">
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-xl rounded-2xl p-3.5 ${
                  msg.sender === "user"
                    ? msg.requiresRetry
                      ? "bg-amber-500/20 border border-amber-500/50 text-white"
                      : "bg-emerald-600/25 border border-emerald-500/40 text-white"
                    : "bg-slate-800/90 border border-slate-700 text-slate-100"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {msg.sender === "user" ? "You" : ai.roleplayPartner}
                  </span>
                  {msg.sender === "ai" ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => speakGerman(msg.german)}
                        className="px-2 py-0.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[11px] font-semibold"
                        title="Listen in German"
                      >
                        <Volume2 className="w-3 h-3 text-emerald-400" /> 🇩🇪 DE
                      </button>
                      {msg.english && (
                        <button
                          type="button"
                          onClick={() => speakEnglish(msg.english || "")}
                          className="px-2 py-0.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-teal-300 hover:text-white flex items-center gap-1 text-[11px] font-semibold"
                          title="Listen in English"
                        >
                          <Volume2 className="w-3 h-3 text-teal-400" /> 🇬🇧 EN
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => speakGerman(msg.german)}
                      className="text-slate-400 hover:text-emerald-400"
                      title="Listen (de-DE)"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm font-semibold">{msg.german}</p>
                {msg.english && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-0.5">
                      English Translation:
                    </span>
                    <p className="text-slate-200 text-xs sm:text-sm font-medium">{msg.english}</p>
                  </div>
                )}
                {msg.audioUrl && (
                  <div className="mt-2.5 flex items-center gap-2 bg-slate-900/90 border border-teal-500/40 rounded-xl px-3 py-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const audio = new Audio(msg.audioUrl);
                        audio.play().catch(() => {});
                      }}
                      className="px-2 py-0.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-bold flex items-center gap-1.5 transition text-[11px]"
                    >
                      <Play className="w-3 h-3 fill-current" /> Play Voice Note
                    </button>
                    <span className="text-[11px] text-slate-400">🎙️ Your Recording</span>
                  </div>
                )}
              </div>
              {msg.feedback && (
                <span
                  className={`text-xs mt-1 px-2 font-medium ${
                    msg.requiresRetry ? "text-amber-300" : "text-emerald-400"
                  }`}
                >
                  ★ {msg.feedback}
                </span>
              )}
            </div>
          ))}
          {isAiThinking && (
            <div className="text-xs text-slate-400 italic px-2">
              {ai.roleplayPartner} is responding...
            </div>
          )}
        </div>

        {/* COACH MODE INTERACTIVE CORRECTION CARD ("Almost right!" + "Try Again") */}
        {activeCoachCorrection && (
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border-2 border-amber-500/50 p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Sparkles className="w-3.5 h-3.5" />{" "}
                {activeCoachCorrection.headline}
              </span>
              <span className="text-xs text-amber-200/80 font-semibold">
                Saved to Personal Mistake Memory
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30">
                <div className="text-[11px] uppercase font-bold text-rose-300">
                  Your Sentence:
                </div>
                <div className="font-bold text-white mt-0.5 line-through decoration-rose-400">
                  „{activeCoachCorrection.mistake.learnerSentence}“
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase font-bold text-emerald-300">
                    Correct German:
                  </div>
                  <div className="font-extrabold text-emerald-200 mt-0.5">
                    „{activeCoachCorrection.mistake.correctSentence}“
                  </div>
                  {activeCoachCorrection.mistake.englishTranslation && (
                    <div className="text-xs text-slate-300 mt-0.5">
                      English: &ldquo;{activeCoachCorrection.mistake.englishTranslation}&rdquo;
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      speakGerman(
                        activeCoachCorrection.mistake.correctSentence,
                        0.88
                      )
                    }
                    className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    title="Hear correct German"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      speakEnglish(
                        activeCoachCorrection.mistake.explanation
                      )
                    }
                    className="p-2 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30"
                    title="Hear English explanation"
                  >
                    <Volume2 className="w-4 h-4 text-teal-400" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 leading-relaxed">
              <strong className="text-amber-300">
                Why in English ({activeCoachCorrection.mistake.category}):
              </strong>{" "}
              {activeCoachCorrection.mistake.explanation}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const corrected =
                    activeCoachCorrection.mistake.correctSentence;
                  setCustomInput(corrected);
                  setActiveCoachCorrection(null);
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Try Again (Pre-fill &amp;
                Edit)
              </button>
              <button
                type="button"
                onClick={() => {
                  const corrected =
                    activeCoachCorrection.mistake.correctSentence;
                  setActiveCoachCorrection(null);
                  sendLearnerTurnToMissionApi(corrected);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow"
              >
                <Check className="w-3.5 h-3.5" /> Speak &amp; Send Corrected: „
                {activeCoachCorrection.mistake.correctSentence}“
              </button>
            </div>
          </div>
        )}

        {/* COMPREHENSION RECOVERY SUPPORT CARD ("Ich verstehe nicht." / "Bitte langsamer.") */}
        {activeRecoverySupport && (
          <div className="mb-4 rounded-2xl bg-sky-950/50 border-2 border-sky-500/40 p-4 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                Comprehension Support (Simplified German)
              </span>
              <button
                type="button"
                onClick={() => setActiveRecoverySupport(null)}
                className="text-xs text-slate-400 hover:text-white font-semibold"
              >
                Dismiss
              </button>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-sky-200">
                  {activeRecoverySupport.simplifiedGerman}
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  {activeRecoverySupport.englishExplanation}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  speakGerman(activeRecoverySupport.simplifiedGerman, 0.78)
                }
                className="p-2.5 rounded-xl bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 shrink-0"
                title="Hear slow German (0.78x)"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            {activeRecoverySupport.suggestedReplies?.[0] && (
              <div className="text-xs text-emerald-300 font-semibold">
                Tip — You can answer with:{" "}
                <button
                  type="button"
                  onClick={() => {
                    const reply =
                      activeRecoverySupport.suggestedReplies[0] ||
                      "Ich möchte einen Kaffee, bitte.";
                    setActiveRecoverySupport(null);
                    sendLearnerTurnToMissionApi(reply);
                  }}
                  className="underline hover:text-emerald-200 font-extrabold"
                >
                  „{activeRecoverySupport.suggestedReplies[0]}“
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Reality-Test Pills for Day 5 Restaurant (Accusative, Conjugation, Word Order, Minor Redundancy, Questions & Recovery) */}
        <div className="mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Try a Natural Response or Test Generalized Mistake &amp; Intent Handling:
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() =>
                sendLearnerTurnToMissionApi("Ich möchte eine Kaffee.")
              }
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-semibold transition"
            >
              Accusative Mistake: „Ich möchte eine Kaffee.“
            </button>
            <button
              type="button"
              onClick={() =>
                sendLearnerTurnToMissionApi("Ich wollen einen Kaffee.")
              }
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-semibold transition"
            >
              Conjugation Mistake: „Ich wollen einen Kaffee.“
            </button>
            <button
              type="button"
              onClick={() =>
                sendLearnerTurnToMissionApi("Ich Kaffee möchte.")
              }
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-semibold transition"
            >
              Word Order Mistake: „Ich Kaffee möchte.“
            </button>
            <button
              type="button"
              onClick={() =>
                sendLearnerTurnToMissionApi("Ich möchte einen Kaffee haben bitte.")
              }
              className="px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-200 text-xs font-semibold transition"
            >
              Minor Style (No Block): „Ich möchte einen Kaffee haben bitte.“
            </button>
            <button
              type="button"
              onClick={() =>
                sendLearnerTurnToMissionApi("Ich möchte einen Kaffee.")
              }
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-200 text-xs font-semibold transition"
            >
              Correct: „Ich möchte einen Kaffee.“
            </button>
            <button
              type="button"
              onClick={() =>
                sendLearnerTurnToMissionApi("Was empfehlen Sie?")
              }
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Ask Waiter: „Was empfehlen Sie?“
            </button>
            <button
              type="button"
              onClick={() =>
                sendLearnerTurnToMissionApi("Ich verstehe nicht.")
              }
              className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-200 text-xs font-semibold transition"
            >
              Recovery: „Ich verstehe nicht.“
            </button>
            <button
              type="button"
              onClick={() =>
                sendLearnerTurnToMissionApi("Zahlen, bitte! Zusammen.")
              }
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Pay Bill: „Zahlen, bitte! Zusammen.“
            </button>
          </div>

          {/* Suggested Stage Prompts */}
          <div className="grid grid-cols-1 gap-2">
            {ai.suggestedPrompts.map((sp, idx) => {
              const alreadyUsed = usedPromptIndexes.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => sendLearnerTurnToMissionApi(sp.german, idx)}
                  disabled={alreadyUsed || isAiThinking}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                    alreadyUsed
                      ? "bg-slate-900/40 border-slate-800 text-slate-500"
                      : "bg-slate-800/80 hover:bg-slate-800 border-slate-700 hover:border-teal-500/50 text-white"
                  }`}
                >
                  <div>
                    {sp.stageLabel && (
                      <span className="inline-block text-xs font-bold text-teal-400 mb-0.5">
                        {sp.stageLabel}
                      </span>
                    )}
                    <div className="text-xs sm:text-sm font-semibold">
                      {sp.german}
                    </div>
                    <div className="text-xs text-slate-400">{sp.english}</div>
                  </div>
                  <Send className="w-4 h-4 text-teal-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom German Input + Real Microphone Button + Live Speech Status */}
        <form onSubmit={handleSendCustom} className="space-y-2 mb-5">
          {speechNotice && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between gap-2 shadow-sm">
              <span>{speechNotice}</span>
              <button
                type="button"
                onClick={() => setSpeechNotice(null)}
                className="text-slate-400 hover:text-white font-bold px-1.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* LIVE DYNAMIC AUDIO RECORDER WAVEFORM & TIMER */}
          {isMissionListening && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-950 border-2 border-rose-500/60 text-xs text-rose-200 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <span className="font-extrabold text-white text-xs uppercase tracking-wider">
                    Recording Voice (0:{missionRecordSeconds < 10 ? `0${missionRecordSeconds}` : missionRecordSeconds})
                  </span>
                </div>
                {/* Dynamic audio equalizer waveform reacting to user volume */}
                <div className="flex items-end gap-1 h-5 px-2 bg-slate-950/90 rounded-lg border border-slate-800">
                  {[0.3, 0.7, 1.0, 0.6, 0.9, 0.4].map((scale, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-rose-400 transition-all duration-75"
                      style={{
                        height: `${Math.max(4, Math.min(20, (missionAudioLevel / 100) * 20 * scale + (missionAudioLevel > 5 ? 3 : 1)))}px`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="text-slate-300 text-xs bg-slate-950/70 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between gap-2">
                <span className="italic truncate">
                  {customInput ? `„${customInput}“` : "Speak German now — microphone is actively capturing your voice..."}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={cancelMissionVoiceInput}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={stopAndProcessMissionVoice}
                  className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs shadow-lg shadow-rose-500/40 flex items-center gap-1.5 transition"
                >
                  Finish &amp; Send Voice
                </button>
              </div>
            </div>
          )}

          {/* QUICK CONFIRM FOR RECORDED VOICE NOTE (When STT produced no text or on mobile Safari) */}
          {missionPendingVoiceNote && (
            <div className="p-4 rounded-2xl bg-teal-950/60 border-2 border-teal-500/50 space-y-3 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-teal-400 animate-pulse" />
                  <span className="font-extrabold text-white text-xs uppercase tracking-wider">
                    Voice Note Recorded ({missionPendingVoiceNote.durationSeconds}s)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const audio = new Audio(missionPendingVoiceNote.audioUrl);
                    audio.play().catch(() => {});
                  }}
                  className="px-3 py-1 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Listen to Audio
                </button>
              </div>

              <p className="text-xs text-slate-300">
                We captured your voice recording! Tap what you spoke or send it directly:
              </p>

              <div className="flex flex-wrap gap-2">
                {ai.suggestedPrompts.slice(0, 3).map((sp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const url = missionPendingVoiceNote.audioUrl;
                      setMissionPendingVoiceNote(null);
                      sendLearnerTurnToMissionApi(sp.german, idx, url);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-teal-500/30 text-xs text-teal-200 font-semibold transition text-left"
                  >
                    „{sp.german}“
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const url = missionPendingVoiceNote.audioUrl;
                    setMissionPendingVoiceNote(null);
                    sendLearnerTurnToMissionApi("Ich habe eine Sprachnachricht gesendet.", undefined, url);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-extrabold shadow-lg transition"
                >
                  Send Voice Note Directly
                </button>
                <button
                  type="button"
                  onClick={() => setMissionPendingVoiceNote(null)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold transition"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder='Speak or type naturally in German (e.g. "Ich möchte einen Kaffee, bitte.")...'
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
            />
            <button
              type="button"
              onClick={startMissionVoiceInput}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                isMissionListening
                  ? "bg-rose-500 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-500/30"
                  : "bg-slate-900 hover:bg-slate-800 text-rose-300 border-rose-500/40"
              }`}
              title="Speak German with Microphone (de-DE)"
            >
              <Mic className="w-4 h-4" />
              <span>
                {isMissionListening ? "Finish" : "Speak"}
              </span>
            </button>
            <button
              type="submit"
              disabled={isAiThinking}
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </div>
        </form>

        {/* EVIDENCE-BASED MISSION COMPLETE FEEDBACK SCREEN */}
        {missionCompleteData && (
          <div className="mb-5 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-950 border-2 border-emerald-500/40 p-5 space-y-4 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full">
                  MISSION COMPLETE •{" "}
                  {missionCompleteData.mode === "coach"
                    ? "COACH MODE"
                    : "REAL-LIFE MODE"}
                </span>
                <h4 className="text-lg font-extrabold text-white mt-1.5">
                  Evidence-Based Conversation Report
                </h4>
              </div>
              <button
                type="button"
                onClick={resetMissionConversation}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" /> TRY AGAIN
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* WHAT YOU DID WELL */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="font-extrabold uppercase tracking-wider text-emerald-400 mb-2">
                  WHAT YOU DID WELL
                </div>
                <ul className="space-y-1.5 text-slate-200">
                  {missionCompleteData.whatYouDidWell.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* IMPORTANT CORRECTIONS */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="font-extrabold uppercase tracking-wider text-amber-400 mb-2">
                  IMPORTANT CORRECTIONS
                </div>
                {missionCompleteData.importantCorrections.length === 0 ? (
                  <p className="text-emerald-300">
                    Zero article or grammar mistakes detected in this session!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {missionCompleteData.importantCorrections.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30"
                      >
                        <div className="text-rose-300 line-through">
                          „{c.learnerSentence}“
                        </div>
                        <div className="text-emerald-300 font-bold">
                          → „{c.correctSentence}“
                        </div>
                        <div className="text-slate-300 mt-1">
                          {c.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* NEW WORDS USED & GRAMMAR TO REVIEW */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div>
                  <div className="font-extrabold uppercase tracking-wider text-sky-400 mb-1">
                    NEW WORDS USED
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {missionCompleteData.newWordsUsed.map((w) => (
                      <span
                        key={w.german}
                        className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold"
                      >
                        {w.german}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="font-extrabold uppercase tracking-wider text-purple-400 mb-1">
                    GRAMMAR TO REVIEW
                  </div>
                  <div className="text-slate-200 font-semibold">
                    {missionCompleteData.grammarToReview.join(" • ")}
                  </div>
                </div>
              </div>

              {/* FOCUS AREA & NEXT RECOMMENDED PRACTICE */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div>
                  <div className="font-extrabold uppercase tracking-wider text-amber-300 mb-1">
                    FOCUS AREA
                  </div>
                  <div className="text-white font-semibold">
                    {missionCompleteData.focusAreaImpact.categoryLabel} (
                    {missionCompleteData.focusAreaImpact.status})
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="font-extrabold uppercase tracking-wider text-teal-400 mb-1">
                    NEXT RECOMMENDED PRACTICE
                  </div>
                  <div className="text-emerald-300 font-semibold">
                    {missionCompleteData.nextRecommendedPractice}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() =>
              handleFinishActivity(
                missionMistakes.length === 0 ? 96 : 88,
                missionMistakes.map((m) => m.category)
              )
            }
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            Complete Real-Life Mission (+{activity.xpReward} XP){" "}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // STEP 8: DAILY REVIEW (With Adaptive Weak-Area Boosters & "Why was I wrong?" remediation!)
  const questions = day.dailyQuiz;
  const correctCount = questions.filter(
    (q) => quizAnswers[q.id] === q.correctAnswer
  ).length;
  const computedPercent =
    questions.length > 0
      ? Math.round((correctCount / questions.length) * 100)
      : 92;

  const handleSubmitQuiz = () => {
    setQuizSubmitted(true);
    questions.forEach((q) => {
      const isRight = quizAnswers[q.id] === q.correctAnswer;
      if (q.skillCategory !== "vocabulary") {
        recordGrammarAttempt(q.skillCategory, isRight);
      }
    });
  };

  const mistakeCats = questions
    .filter((q) => quizAnswers[q.id] && quizAnswers[q.id] !== q.correctAnswer)
    .map((q) => q.skillCategory);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full mb-1.5">
            <Award className="w-3.5 h-3.5" /> Step {activity.order} of{" "}
            {day.activities.length} • Daily Review &amp; Adaptive Check
          </span>
          <h3 className="text-xl font-bold text-white">
            Day {day.dayNumber}: {day.goalTitle} — Daily Review
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800"
        >
          Close Player
        </button>
      </div>

      {/* Weekly Summary Box if Day 7 / 14 / 21 */}
      {day.isWeeklyReview && day.weeklySummaryNotes && (
        <div className="bg-gradient-to-r from-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-xl p-4 mb-5">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2">
            Week {day.weekNumber} Real-Life Readiness Summary
          </div>
          <ul className="space-y-1.5">
            {day.weeklySummaryNotes.map((note, idx) => (
              <li
                key={idx}
                className="text-xs sm:text-sm text-slate-200 flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {questions.map((q, idx) => {
          const chosen = quizAnswers[q.id];
          const isCorrect = chosen === q.correctAnswer;
          const whyWrongData = q.whyWrong || {
            learnerMistakeExample: chosen || "Incorrect selection",
            correctSentence: q.correctAnswer,
            ruleHeadline: q.explanation,
            stepByStepBreakdown: [
              `Question: ${q.question}`,
              `Correct Answer: ${q.correctAnswer}`,
            ],
            followUpQuestion: {
              prompt: `Apply the rule: "${q.question}"`,
              options: q.options.slice(0, 3),
              correctAnswer: q.correctAnswer,
              successMessage: "Perfekt! You got it right.",
            },
          };

          return (
            <div
              key={q.id}
              className={`rounded-xl p-4 border ${
                q.isAdaptiveReview
                  ? "bg-amber-950/20 border-amber-500/40"
                  : "bg-slate-800/60 border-slate-700/80"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-400">
                  Review {idx + 1} of {questions.length}
                </span>
                {q.isAdaptiveReview && (
                  <span className="text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Adaptive Weak-Area Revision
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-white mb-3">
                {q.question}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() =>
                      setQuizAnswers((prev) => ({ ...prev, [q.id]: opt }))
                    }
                    className={`px-3.5 py-2.5 rounded-xl text-left text-xs sm:text-sm font-medium border transition flex items-center justify-between ${
                      chosen === opt
                        ? opt === q.correctAnswer
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-rose-500/20 border-rose-500 text-rose-300"
                        : "bg-slate-900/90 border-slate-700 text-slate-200 hover:border-slate-500"
                    }`}
                  >
                    <span>{opt}</span>
                    {chosen === opt &&
                      (opt === q.correctAnswer ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-rose-400 shrink-0" />
                      ))}
                  </button>
                ))}
              </div>

              {chosen && isCorrect && (
                <p className="mt-2.5 text-xs text-emerald-400 font-medium">
                  ✓ Correct: {q.explanation}
                </p>
              )}

              {chosen && !isCorrect && (
                <WhyWasIWrongCard
                  learnerChoice={chosen}
                  remediation={whyWrongData}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        {!quizSubmitted ? (
          <button
            onClick={handleSubmitQuiz}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4" /> Check All Review Answers
          </button>
        ) : (
          <div className="text-sm font-bold text-emerald-400">
            Review Score: {correctCount} / {questions.length} ({computedPercent}
            %)
          </div>
        )}

        <button
          onClick={() =>
            handleFinishActivity(
              Object.keys(quizAnswers).length > 0 ? computedPercent : 94,
              mistakeCats
            )
          }
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
        >
          Finish Day {day.dayNumber} Review (+{activity.xpReward} XP){" "}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
