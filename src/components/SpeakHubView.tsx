"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Volume2,
  Send,
  Sparkles,
  Award,
  CheckCircle2,
  MessageSquare,
  MapPin,
  RotateCcw,
  Play,
  Radio,
} from "lucide-react";
import { useLearning } from "@/context/LearningContext";
import { speakGerman, speakEnglish, speakBilingual } from "./ActivityPlayer";
import { DetectedMistake } from "@/types/learning";
import { UniversalVoiceSession } from "@/lib/voiceRecorder";

export default function SpeakHubView() {
  const { plan, recordLearnerMistake } = useLearning();
  const austriaDays = plan.weeks[0]?.days || [];

  const [selectedDayNum, setSelectedDayNum] = useState<number>(
    plan.currentDayNumber <= 7 ? plan.currentDayNumber : 5
  );
  const [mode, setMode] = useState<"coach" | "real_life">("coach");
  const [audioLanguage, setAudioLanguage] = useState<
    "english" | "bilingual" | "german"
  >("english");
  const [displayLanguage, setDisplayLanguage] = useState<
    "english" | "german"
  >("english");
  const [turnIndex, setTurnIndex] = useState(0);
  const [activeCoachCard, setActiveCoachCard] = useState<{
    headline: string;
    mistake: DetectedMistake;
  } | null>(null);

  const selectedDay =
    austriaDays.find((d) => d.dayNumber === selectedDayNum) ||
    austriaDays[austriaDays.length - 1];

  const scenario = selectedDay.aiConversation;

  const [messages, setMessages] = useState<
    {
      sender: "ai" | "user";
      german: string;
      english?: string;
      feedback?: string;
      audioUrl?: string;
    }[]
  >([
    {
      sender: "ai",
      german: scenario.openingMessageDe,
      english: scenario.openingMessageEn,
    },
  ]);
  const [usedStages, setUsedStages] = useState<number[]>([]);
  const [customText, setCustomText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [pendingVoiceNote, setPendingVoiceNote] = useState<{
    audioUrl: string;
    durationSeconds: number;
  } | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const voiceSessionRef = useRef<UniversalVoiceSession | null>(null);

  useEffect(() => {
    return () => {
      if (voiceSessionRef.current) {
        voiceSessionRef.current.cancel();
      }
    };
  }, []);

  const handleSelectScenarioDay = (dayNum: number) => {
    const target = austriaDays.find((d) => d.dayNumber === dayNum);
    if (!target) return;
    if (voiceSessionRef.current) {
      voiceSessionRef.current.cancel();
      setIsRecording(false);
      setAudioLevel(0);
      setRecordingSeconds(0);
    }
    setPendingVoiceNote(null);
    setSelectedDayNum(dayNum);
    setUsedStages([]);
    setTurnIndex(0);
    setActiveCoachCard(null);
    setMessages([
      {
        sender: "ai",
        german: target.aiConversation.openingMessageDe,
        english: target.aiConversation.openingMessageEn,
      },
    ]);
  };

  const sendToMissionBackend = async (
    text: string,
    stageIdx?: number,
    audioUrl?: string
  ) => {
    if (!text.trim()) return;
    setActiveCoachCard(null);
    setPendingVoiceNote(null);
    try {
      const res = await fetch("/api/ai-mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayNumber: selectedDay.dayNumber,
          mode,
          learnerMessage: text.trim(),
          turnIndex,
          conversationHistory: messages,
        }),
      });
      const data = await res.json();
      const detected: DetectedMistake | null = data.detectedMistake || null;
      if (detected) {
        recordLearnerMistake(detected, selectedDay.dayNumber);
      }

      const playAiVoice = (deText: string, enText?: string) => {
        if (audioLanguage === "english" && enText) {
          speakEnglish(enText);
        } else if (audioLanguage === "bilingual" && enText) {
          speakBilingual(deText, enText);
        } else {
          speakGerman(deText, 0.92);
        }
      };

      if (mode === "coach" && data.requiresRetry && detected) {
        const coachFeedbackText = `Coach Feedback: ${data.coachHeadline || "Almost right!"} → Say: „${detected.correctSentence}“ (${detected.englishTranslation || detected.explanation})`;
        setMessages((prev) => [
          ...prev,
          {
            sender: "user",
            german: text.trim(),
            audioUrl,
            feedback: coachFeedbackText,
          },
        ]);
        setActiveCoachCard({
          headline: data.coachHeadline || "Almost right! Here is your coach feedback:",
          mistake: detected,
        });

        if (audioLanguage === "english") {
          speakEnglish(`Coach Feedback: ${detected.explanation}. In German: ${detected.correctSentence}`);
        } else if (audioLanguage === "bilingual") {
          speakBilingual(detected.correctSentence, detected.explanation);
        } else {
          speakGerman(detected.correctSentence, 0.9);
        }
        return;
      }

      if (typeof stageIdx === "number") {
        setUsedStages((p) => (p.includes(stageIdx) ? p : [...p, stageIdx]));
      }
      setTurnIndex((t) => t + 1);
      setMessages((prev) => [
        ...prev,
        {
          sender: "user",
          german: text.trim(),
          audioUrl,
          feedback: mode === "coach" ? data.positiveNote : undefined,
        },
        {
          sender: "ai",
          german: data.aiReplyDe,
          english: data.aiReplyEn,
        },
      ]);
      playAiVoice(data.aiReplyDe, data.aiReplyEn);
    } catch {
      // ignore
    }
  };

  const handlePromptClick = (idx: number) => {
    const prompt = scenario.suggestedPrompts[idx];
    if (!prompt) return;
    sendToMissionBackend(prompt.german, idx);
  };

  const stopAndProcessVoice = async () => {
    if (!voiceSessionRef.current) return;
    const session = voiceSessionRef.current;
    setIsRecording(false);
    setAudioLevel(0);
    setRecordingSeconds(0);
    const result = await session.stop();
    if (!result) return;

    const transcript = (result.transcript || customText).trim();
    if (transcript) {
      setCustomText("");
      sendToMissionBackend(transcript, undefined, result.audioUrl);
    } else if (result.audioUrl) {
      // Voice recording captured audio, but browser STT did not produce text (e.g. mobile Safari / quiet room)
      setPendingVoiceNote({
        audioUrl: result.audioUrl,
        durationSeconds: result.durationSeconds,
      });
    }
  };

  const toggleVoiceRecording = async () => {
    setVoiceNotice(null);
    setPendingVoiceNote(null);

    if (isRecording) {
      await stopAndProcessVoice();
      return;
    }

    const session = new UniversalVoiceSession();
    voiceSessionRef.current = session;
    setIsRecording(true);
    setAudioLevel(0);
    setRecordingSeconds(0);

    const started = await session.start({
      onVolumeChange: (vol) => setAudioLevel(vol),
      onDurationChange: (sec) => setRecordingSeconds(sec),
      onTranscriptUpdate: (text) => setCustomText(text),
      onError: (msg) => {
        setIsRecording(false);
        setAudioLevel(0);
        setRecordingSeconds(0);
        setVoiceNotice(msg);
      },
    });

    if (!started) {
      setIsRecording(false);
      setAudioLevel(0);
      setRecordingSeconds(0);
    }
  };

  const cancelVoiceRecording = () => {
    if (voiceSessionRef.current) {
      voiceSessionRef.current.cancel();
      voiceSessionRef.current = null;
    }
    setIsRecording(false);
    setAudioLevel(0);
    setRecordingSeconds(0);
  };

  const handleCustomSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    const text = customText.trim();
    setCustomText("");
    sendToMissionBackend(text);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-teal-950/40 to-slate-900 border border-teal-500/40 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-teal-300 bg-teal-500/15 border border-teal-500/30 px-3 py-1 rounded-full">
            <Mic className="w-3.5 h-3.5" /> AI German Real-Life Readiness Coach
          </span>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
            Speaking Score: {plan.speakingProgress.overallScore}%
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Speak &amp; Real-Life Mission Simulator
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
          Move from learning German to confidently using German in real-life
          situations across Austria. Practice any of your 7 &ldquo;My First
          Week in Austria&rdquo; missions or take on the 5-stage{" "}
          <strong className="text-amber-300">
            &ldquo;A Day in Vienna&rdquo;
          </strong>{" "}
          challenge!
        </p>

        {/* 7-Day Austria Mission Selector Pills */}
        <div className="flex overflow-x-auto gap-2 pt-4 pb-1">
          {austriaDays.map((d) => {
            const isSel = d.dayNumber === selectedDayNum;
            return (
              <button
                key={d.dayNumber}
                onClick={() => handleSelectScenarioDay(d.dayNumber)}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  isSel
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg"
                    : d.dayNumber === 7
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
                    : "bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700"
                }`}
              >
                {d.dayNumber === 7 && <Award className="w-3.5 h-3.5" />}
                <span>
                  Day {d.dayNumber}:{" "}
                  {d.dayNumber === 7 ? "A Day in Vienna" : d.goalTitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Roleplay Coach */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Interactive Conversation */}
        <div className="lg:col-span-8 bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <div className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {scenario.setting}
              </div>
              <h2 className="text-lg font-extrabold text-white mt-0.5">
                {scenario.title}
              </h2>
              <p className="text-xs text-slate-400">
                Roleplay Partner:{" "}
                <strong className="text-slate-200">
                  {scenario.roleplayPartner}
                </strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMode("coach");
                    setActiveCoachCard(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                    mode === "coach"
                      ? "bg-emerald-500 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  COACH MODE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("real_life");
                    setActiveCoachCard(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                    mode === "real_life"
                      ? "bg-amber-400 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  REAL-LIFE MODE
                </button>
              </div>

              {/* Audio Response Language Selector */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Audio:</span>
                <button
                  type="button"
                  onClick={() => setAudioLanguage("english")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    audioLanguage === "english"
                      ? "bg-teal-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="AI will speak the English translation"
                >
                  🇬🇧 English
                </button>
                <button
                  type="button"
                  onClick={() => setAudioLanguage("bilingual")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    audioLanguage === "bilingual"
                      ? "bg-teal-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="AI will speak German followed by English translation"
                >
                  🌐 Bilingual
                </button>
                <button
                  type="button"
                  onClick={() => setAudioLanguage("german")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    audioLanguage === "german"
                      ? "bg-teal-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="AI will speak German only"
                >
                  🇩🇪 German
                </button>
              </div>

              {/* Display Language Selector */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Text:</span>
                <button
                  type="button"
                  onClick={() => setDisplayLanguage("english")}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                    displayLanguage === "english"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Show English as the main response text"
                >
                  🇬🇧 English First
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayLanguage("german")}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                    displayLanguage === "german"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Show German as the main response text"
                >
                  🇩🇪 German First
                </button>
              </div>

              <button
                onClick={() => {
                  if (audioLanguage === "english" && scenario.openingMessageEn) {
                    speakEnglish(scenario.openingMessageEn);
                  } else if (audioLanguage === "bilingual" && scenario.openingMessageEn) {
                    speakBilingual(scenario.openingMessageDe, scenario.openingMessageEn);
                  } else {
                    speakGerman(scenario.openingMessageDe);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4" /> Replay Opening
              </button>
            </div>
          </div>

          {voiceNotice && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
              {voiceNotice}
            </div>
          )}

          {/* Chat Feed */}
          <div className="space-y-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 max-h-96 overflow-y-auto">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-lg rounded-2xl p-3.5 ${
                    m.sender === "user"
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-white"
                      : "bg-slate-800/90 border border-slate-700 text-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {m.sender === "user" ? "You" : scenario.roleplayPartner}
                    </span>
                    {m.sender === "ai" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => speakGerman(m.german)}
                          className="px-2 py-0.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[11px] font-semibold"
                          title="Listen in German"
                        >
                          <Volume2 className="w-3 h-3 text-emerald-400" /> 🇩🇪 DE
                        </button>
                        {m.english && (
                          <button
                            type="button"
                            onClick={() => speakEnglish(m.english || "")}
                            className="px-2 py-0.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-teal-300 hover:text-white flex items-center gap-1 text-[11px] font-semibold"
                            title="Listen in English"
                          >
                            <Volume2 className="w-3 h-3 text-teal-400" /> 🇬🇧 EN
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => speakGerman(m.german)}
                        className="text-slate-400 hover:text-emerald-400"
                        title="Listen (de-DE)"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {displayLanguage === "english" && m.english ? (
                    <div>
                      <p className="text-sm font-bold text-white">{m.english}</p>
                      <div className="mt-2 p-2 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs text-emerald-300">
                        <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5 text-emerald-400">
                          🇩🇪 German Phrasing:
                        </span>
                        <p className="font-semibold text-slate-100">{m.german}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold">{m.german}</p>
                      {m.english && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-0.5">
                            English Translation:
                          </span>
                          <p className="text-slate-200 text-xs sm:text-sm font-medium">{m.english}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {m.audioUrl && (
                    <div className="mt-2.5 flex items-center gap-2 bg-slate-900/90 border border-teal-500/40 rounded-xl px-3 py-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const audio = new Audio(m.audioUrl);
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
                {m.feedback && (
                  <span className="text-xs text-emerald-400 mt-1 px-2 font-medium">
                    ★ {m.feedback}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Coach Mode Correction Card */}
          {activeCoachCard && (
            <div className="rounded-2xl bg-amber-950/50 border-2 border-amber-500/50 p-4 space-y-2.5 text-xs shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-amber-300 uppercase">
                  {activeCoachCard.headline}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => speakGerman(activeCoachCard.mistake.correctSentence)}
                    className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 flex items-center gap-1 text-[11px]"
                    title="Hear in German"
                  >
                    <Volume2 className="w-3 h-3" /> 🇩🇪 German
                  </button>
                  <button
                    type="button"
                    onClick={() => speakEnglish(activeCoachCard.mistake.explanation)}
                    className="px-2 py-1 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 flex items-center gap-1 text-[11px]"
                    title="Hear in English"
                  >
                    <Volume2 className="w-3 h-3" /> 🇬🇧 English
                  </button>
                </div>
              </div>
              <div className="text-white">
                Correct sentence:{" "}
                <strong className="text-emerald-300">
                  „{activeCoachCard.mistake.correctSentence}“
                </strong>
                {activeCoachCard.mistake.englishTranslation && (
                  <div className="text-xs text-slate-300 mt-0.5">
                    English: &ldquo;{activeCoachCard.mistake.englishTranslation}&rdquo;
                  </div>
                )}
              </div>
              <p className="text-slate-200">
                <span className="font-bold text-amber-300">Why in English: </span>
                {activeCoachCard.mistake.explanation}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCustomText(activeCoachCard.mistake.correctSentence);
                    setActiveCoachCard(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-extrabold flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Try Again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const c = activeCoachCard.mistake.correctSentence;
                    setActiveCoachCard(null);
                    sendToMissionBackend(c);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold"
                >
                  Send Corrected Answer
                </button>
              </div>
            </div>
          )}

          {/* Suggested Stage Responses */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Guided Mission Responses (or test &ldquo;Ich möchte eine Kaffee.&rdquo;):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    sendToMissionBackend("Ich möchte eine Kaffee.")
                  }
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-500/40 text-xs font-bold"
                >
                  Test: „Ich möchte eine Kaffee.“
                </button>
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isRecording
                      ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  {isRecording ? "Recording Voice..." : "Speak via Mic"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {scenario.suggestedPrompts.map((sp, idx) => {
                const done = usedStages.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => handlePromptClick(idx)}
                    disabled={done}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                      done
                        ? "bg-slate-900/40 border-slate-800 text-slate-500"
                        : "bg-slate-800/80 hover:bg-slate-800 border-slate-700 hover:border-emerald-500/50 text-white"
                    }`}
                  >
                    <div>
                      {sp.stageLabel && (
                        <span className="text-xs font-bold text-emerald-400 block mb-0.5">
                          {sp.stageLabel}
                        </span>
                      )}
                      <div className="text-xs sm:text-sm font-semibold">
                        {sp.german}
                      </div>
                      <div className="text-xs text-slate-400">{sp.english}</div>
                    </div>
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-teal-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Free Input with Prominent Microphone & Live Speech Status */}
          <form onSubmit={handleCustomSend} className="space-y-2 pt-1">
            {voiceNotice && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between gap-2 shadow-sm">
                <span>{voiceNotice}</span>
                <button
                  type="button"
                  onClick={() => setVoiceNotice(null)}
                  className="text-slate-400 hover:text-white font-bold px-1.5"
                >
                  ✕
                </button>
              </div>
            )}

            {/* LIVE DYNAMIC AUDIO RECORDER WAVEFORM & TIMER */}
            {isRecording && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-950 border-2 border-rose-500/60 text-xs text-rose-200 shadow-xl space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
                    <span className="font-extrabold text-white text-xs uppercase tracking-wider">
                      Recording Voice (0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds})
                    </span>
                  </div>
                  {/* Dynamic audio equalizer waveform reacting to user's real volume */}
                  <div className="flex items-end gap-1 h-5 px-2 bg-slate-950/90 rounded-lg border border-slate-800">
                    {[0.3, 0.7, 1.0, 0.6, 0.9, 0.4].map((scale, i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-full bg-rose-400 transition-all duration-75"
                        style={{
                          height: `${Math.max(4, Math.min(20, (audioLevel / 100) * 20 * scale + (audioLevel > 5 ? 3 : 1)))}px`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="text-slate-300 text-xs bg-slate-950/70 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between gap-2">
                  <span className="italic truncate">
                    {customText ? `„${customText}“` : "Speak German now — microphone is actively capturing your voice..."}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={stopAndProcessVoice}
                    className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs shadow-lg shadow-rose-500/40 flex items-center gap-1.5 transition"
                  >
                    Finish &amp; Send Voice
                  </button>
                </div>
              </div>
            )}

            {/* QUICK CONFIRM FOR RECORDED VOICE NOTE (When STT produced no text or on mobile Safari) */}
            {pendingVoiceNote && (
              <div className="p-4 rounded-2xl bg-teal-950/60 border-2 border-teal-500/50 space-y-3 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-teal-400 animate-pulse" />
                    <span className="font-extrabold text-white text-xs uppercase tracking-wider">
                      Voice Note Recorded ({pendingVoiceNote.durationSeconds}s)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const audio = new Audio(pendingVoiceNote.audioUrl);
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
                  {scenario.suggestedPrompts.slice(0, 3).map((sp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const url = pendingVoiceNote.audioUrl;
                        setPendingVoiceNote(null);
                        sendToMissionBackend(sp.german, idx, url);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-teal-500/30 text-xs text-teal-200 font-semibold transition text-left"
                    >
                      „{sp.german}“
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const url = pendingVoiceNote.audioUrl;
                      setPendingVoiceNote(null);
                      sendToMissionBackend("Ich habe eine Sprachnachricht gesendet.", undefined, url);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-extrabold shadow-lg transition"
                  >
                    Send Voice Note Directly
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingVoiceNote(null)}
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
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder='Speak into mic or type (e.g. "Ich möchte einen Kaffee, bitte.")...'
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="button"
                data-testid="speak-mic-button"
                onClick={toggleVoiceRecording}
                className={`px-3.5 sm:px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                  isRecording
                    ? "bg-rose-500 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-500/30"
                    : "bg-slate-900 hover:bg-slate-800 text-rose-300 border-rose-500/40"
                }`}
                title="Click to speak German with your microphone"
              >
                <Mic className="w-4 h-4" />
                <span>{isRecording ? "Finish" : "Speak"}</span>
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </div>
          </form>
        </div>

        {/* Right 4 Cols: Pronunciation Lab & Target Phrases */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Mission Key Expressions
            </div>
            <p className="text-xs text-slate-400">
              Tap any phrase below to hear native German pronunciation before
              using it in the roleplay:
            </p>
            <div className="space-y-2">
              {selectedDay.speaking.map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => speakGerman(sp.germanPhrase, 0.88)}
                  className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {sp.germanPhrase}
                    </span>
                    <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {sp.englishMeaning}
                  </div>
                  <div className="text-xs font-mono text-emerald-400/90 mt-1">
                    [{sp.phoneticGuide}]
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
