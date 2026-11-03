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
  Settings,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { useLearning } from "@/context/LearningContext";
import { speakGerman, speakEnglish, speakBilingual, germanSpeechEngine } from "./ActivityPlayer";
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
  const [showSettings, setShowSettings] = useState(false);
  const [showExpressions, setShowExpressions] = useState(false);
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
  const [germanVoices, setGermanVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");

  const voiceSessionRef = useRef<UniversalVoiceSession | null>(null);

  useEffect(() => {
    germanSpeechEngine.ensureVoicesLoaded().then(() => {
      const gVoices = germanSpeechEngine.getGermanVoices();
      setGermanVoices(gVoices);
      const best = germanSpeechEngine.getBestGermanVoice();
      if (best) setSelectedVoiceURI(best.voiceURI);
    });
  }, []);

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

  const getScenarioEmoji = (roleplayPartner: string, setting: string) => {
    const text = (roleplayPartner + " " + setting).toLowerCase();
    if (text.includes("barista") || text.includes("café") || text.includes("coffee")) return "☕";
    if (text.includes("bakery") || text.includes("bäcker") || text.includes("bread")) return "🥐";
    if (text.includes("train") || text.includes("conductor") || text.includes("station") || text.includes("bahn")) return "🚆";
    if (text.includes("doctor") || text.includes("arzt") || text.includes("apotheke")) return "👨‍⚕️";
    if (text.includes("student") || text.includes("uni")) return "🎓";
    if (text.includes("waiter") || text.includes("restaurant") || text.includes("essen")) return "🍽️";
    if (text.includes("direction") || text.includes("street") || text.includes("weg")) return "🗺️";
    return "🗣️";
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ROLEPLAY CONVERSATION PARTNER HEADER */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-3xl shadow-xs">
              {getScenarioEmoji(scenario.roleplayPartner, scenario.setting)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">{scenario.roleplayPartner}</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  ● Patient Native Speaker • Vienna
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                {scenario.setting} • {scenario.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              Score: {plan.speakingProgress.overallScore}%
            </span>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                showSettings
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
              title="Quick Audio, Language & Coach Settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white/20 text-current">
                {displayLanguage === "english" ? "EN" : "DE"}
              </span>
            </button>
          </div>
        </div>

        {/* CLEAN QUICK SETTINGS PANEL (Revealed on click, eliminates main screen clutter) */}
        {showSettings && (
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" /> Quick Preferences
              </span>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-xs text-slate-400 hover:text-slate-700 font-bold"
              >
                Done ✓
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Audio Mode */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">AI Speaks:</label>
                <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAudioLanguage("english")}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                      audioLanguage === "english"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🇬🇧 English
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioLanguage("bilingual")}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                      audioLanguage === "bilingual"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🌐 Both
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioLanguage("german")}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                      audioLanguage === "german"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🇩🇪 German
                  </button>
                </div>
              </div>

              {/* Text Display */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Text Display:</label>
                <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDisplayLanguage("english")}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                      displayLanguage === "english"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🇬🇧 English First
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayLanguage("german")}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                      displayLanguage === "german"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🇩🇪 German First
                  </button>
                </div>
              </div>

              {/* Practice Mode */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Feedback Mode:</label>
                <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("coach");
                      setActiveCoachCard(null);
                    }}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                      mode === "coach"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🎓 Coach Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("real_life");
                      setActiveCoachCard(null);
                    }}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                      mode === "real_life"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🌍 Real-Life
                  </button>
                </div>
              </div>
            </div>

            {/* German Voice Selector & Test Pronunciation */}
            <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span>🎙️</span>
                  <span>German Pronunciation Voice:</span>
                  {germanVoices.length > 0 ? (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {germanVoices.length} native voice{germanVoices.length > 1 ? "s" : ""} available
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Default System Voice
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Select your preferred native German/Austrian voice for the clearest pronunciation.
                </div>
              </div>

              <div className="flex items-center gap-2">
                {germanVoices.length > 0 && (
                  <select
                    value={selectedVoiceURI}
                    onChange={(e) => {
                      setSelectedVoiceURI(e.target.value);
                      germanSpeechEngine.setPreferredGermanVoice(e.target.value);
                    }}
                    className="text-xs font-medium bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs max-w-xs truncate"
                  >
                    {germanVoices.map((v) => {
                      const isHD =
                        v.name.toLowerCase().includes("natural") ||
                        v.name.toLowerCase().includes("online") ||
                        v.name.toLowerCase().includes("google");
                      const isAT = v.lang.toLowerCase().includes("at");
                      return (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {isAT ? "🇦🇹 " : "🇩🇪 "}
                          {v.name} {isHD ? "✨ Natural HD" : ""}
                        </option>
                      );
                    })}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => {
                    speakGerman("Guten Tag! Willkommen in Wien. Wie kann ich Ihnen helfen?", 0.90);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 flex items-center gap-1 transition shrink-0"
                  title="Test selected voice"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Test Pronunciation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7-DAY MISSION SELECTOR STRIP */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          {austriaDays.map((d) => {
            const isSel = d.dayNumber === selectedDayNum;
            return (
              <button
                key={d.dayNumber}
                onClick={() => handleSelectScenarioDay(d.dayNumber)}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  isSel
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : d.dayNumber === 7
                    ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {d.dayNumber === 7 ? <Award className="w-3.5 h-3.5 text-amber-500" /> : <span>{getScenarioEmoji("", d.goalTitle)}</span>}
                <span>
                  Day {d.dayNumber}: {d.dayNumber === 7 ? "A Day in Vienna" : d.goalTitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONVERSATION MESSENGER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Messenger Chat Screen */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between min-h-[500px]">
          
          {/* Top Chat Info Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-500 flex items-center gap-1.5">
              <span>💬</span> Chatting with {scenario.roleplayPartner}
            </span>
            <button
              type="button"
              onClick={() => {
                if (audioLanguage === "english" && scenario.openingMessageEn) {
                  speakEnglish(scenario.openingMessageEn);
                } else if (audioLanguage === "bilingual" && scenario.openingMessageEn) {
                  speakBilingual(scenario.openingMessageDe, scenario.openingMessageEn);
                } else {
                  speakGerman(scenario.openingMessageDe);
                }
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
            >
              <Volume2 className="w-3.5 h-3.5" /> Replay Greeting
            </button>
          </div>

          {/* Voice Notice (If any) */}
          {voiceNotice && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-2 shadow-xs">
              <span>{voiceNotice}</span>
              <button
                type="button"
                onClick={() => setVoiceNotice(null)}
                className="text-slate-400 hover:text-slate-700 font-bold px-1.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Scrollable Messages Stream */}
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-start gap-2.5 max-w-[90%] sm:max-w-[85%]">
                  {m.sender === "ai" && (
                    <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 text-base flex items-center justify-center shrink-0 mt-0.5">
                      {getScenarioEmoji(scenario.roleplayPartner, scenario.setting)}
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-4 space-y-2 transition shadow-xs ${
                      m.sender === "user"
                        ? "bg-indigo-600 text-white rounded-tr-xs"
                        : "bg-slate-50 border border-slate-200/90 text-slate-800 rounded-tl-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className={`font-extrabold uppercase tracking-wider text-[11px] ${
                        m.sender === "user" ? "text-indigo-200" : "text-slate-500"
                      }`}>
                        {m.sender === "user" ? "You" : scenario.roleplayPartner}
                      </span>

                      {m.sender === "ai" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => speakGerman(m.german, 0.92)}
                            className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 text-[11px] font-bold"
                            title="Normal Speed"
                          >
                            <Volume2 className="w-3 h-3 text-indigo-600" /> 🇩🇪 DE
                          </button>
                          <button
                            type="button"
                            onClick={() => speakGerman(m.german, 0.70)}
                            className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 text-[11px] font-bold"
                            title="Slow Speed (Beginner friendly)"
                          >
                            🐢 Slow
                          </button>
                          {m.english && (
                            <button
                              type="button"
                              onClick={() => speakEnglish(m.english || "")}
                              className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 text-[11px] font-bold"
                              title="Listen in English"
                            >
                              <Volume2 className="w-3 h-3 text-emerald-600" /> 🇬🇧 EN
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Display Language logic */}
                    {m.sender === "ai" ? (
                      displayLanguage === "english" && m.english ? (
                        <div className="space-y-1.5">
                          <p className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                            {m.english}
                          </p>
                          <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-indigo-900">
                            <span className="text-[10px] font-bold uppercase tracking-wider block text-indigo-600">
                              🇩🇪 German Phrasing:
                            </span>
                            <p className="font-bold text-slate-800 text-sm mt-0.5">{m.german}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                            {m.german}
                          </p>
                          {m.english && (
                            <div className="p-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-600">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                English:
                              </span>
                              <p className="font-medium text-slate-700 mt-0.5">{m.english}</p>
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div>
                        <p className="text-sm sm:text-base font-bold text-white">{m.german}</p>
                        {m.audioUrl && (
                          <div className="mt-2 flex items-center gap-2 bg-indigo-700/80 rounded-xl px-2.5 py-1 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                const audio = new Audio(m.audioUrl);
                                audio.play().catch(() => {});
                              }}
                              className="px-2 py-0.5 rounded-lg bg-white text-indigo-900 font-bold flex items-center gap-1 text-[11px]"
                            >
                              <Play className="w-3 h-3 fill-current" /> Play Voice Note
                            </button>
                            <span className="text-[11px] text-indigo-200">🎙️ Audio Captured</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {m.sender === "user" && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      You
                    </div>
                  )}
                </div>

                {m.feedback && (
                  <span className="text-xs text-emerald-600 font-bold mt-1 px-3">
                    ★ {m.feedback}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* COACH CORRECTION CARD (If active) */}
          {activeCoachCard && (
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 space-y-2.5 text-xs shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-amber-900 uppercase">
                  {activeCoachCard.headline}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => speakGerman(activeCoachCard.mistake.correctSentence, 0.92)}
                    className="px-2 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 font-bold flex items-center gap-1 text-[11px]"
                    title="Hear in German"
                  >
                    <Volume2 className="w-3 h-3 text-amber-700" /> 🇩🇪 German
                  </button>
                  <button
                    type="button"
                    onClick={() => speakEnglish(activeCoachCard.mistake.explanation)}
                    className="px-2 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 font-bold flex items-center gap-1 text-[11px]"
                    title="Hear in English"
                  >
                    <Volume2 className="w-3 h-3 text-amber-700" /> 🇬🇧 English
                  </button>
                </div>
              </div>
              <div className="text-slate-800">
                Correct sentence:{" "}
                <strong className="text-emerald-700 text-sm">
                  „{activeCoachCard.mistake.correctSentence}“
                </strong>
                {activeCoachCard.mistake.englishTranslation && (
                  <div className="text-xs text-slate-600 mt-0.5">
                    English: &ldquo;{activeCoachCard.mistake.englishTranslation}&rdquo;
                  </div>
                )}
              </div>
              <p className="text-slate-700">
                <span className="font-bold text-amber-800">Coach explanation: </span>
                {activeCoachCard.mistake.explanation}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCustomText(activeCoachCard.mistake.correctSentence);
                    setActiveCoachCard(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold flex items-center gap-1 shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Try Speaking Again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const c = activeCoachCard.mistake.correctSentence;
                    setActiveCoachCard(null);
                    sendToMissionBackend(c);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-xs"
                >
                  Send Corrected Answer
                </button>
              </div>
            </div>
          )}

          {/* 1-TAP QUICK BEGINNER PROMPTS (Removes freeze & anxiety) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">
                💡 Need ideas? Tap to practice speaking:
              </span>
              <button
                type="button"
                onClick={() => sendToMissionBackend("Ich möchte einen Kaffee, bitte.")}
                className="text-indigo-600 hover:text-indigo-800 font-bold"
              >
                Quick Order Demo →
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {scenario.suggestedPrompts.map((sp, idx) => {
                const done = usedStages.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePromptClick(idx)}
                    disabled={done}
                    className={`px-3 py-2 rounded-xl border text-left text-xs transition flex items-center gap-2 ${
                      done
                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-default"
                        : "bg-slate-50 hover:bg-indigo-50 border-slate-200 text-slate-800 hover:text-indigo-700 hover:border-indigo-300"
                    }`}
                  >
                    <div>
                      <div className="font-bold">„{sp.german}“</div>
                      <div className="text-[11px] text-slate-500">{sp.english}</div>
                    </div>
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE RECORDING WAVEFORM & CONFIRMATION */}
          {isRecording && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-xs text-rose-900 shadow-lg space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <span className="font-extrabold text-rose-900 text-xs uppercase tracking-wider">
                    Recording Voice (0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds})
                  </span>
                </div>
                {/* Volume Equalizer */}
                <div className="flex items-end gap-1 h-5 px-2 bg-white rounded-lg border border-rose-200">
                  {[0.3, 0.7, 1.0, 0.6, 0.9, 0.4].map((scale, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-rose-500 transition-all duration-75"
                      style={{
                        height: `${Math.max(4, Math.min(20, (audioLevel / 100) * 20 * scale + (audioLevel > 5 ? 3 : 1)))}px`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="text-slate-800 text-xs bg-white rounded-xl p-3 border border-rose-200 flex items-center justify-between gap-2">
                <span className="italic truncate font-medium">
                  {customText ? `„${customText}“` : "Speak German now — microphone is actively capturing your voice..."}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={stopAndProcessVoice}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-500/20 flex items-center gap-1.5 transition"
                >
                  Finish &amp; Send Voice
                </button>
              </div>
            </div>
          )}

          {/* PENDING VOICE NOTE (Mobile Safari / quiet audio fallback) */}
          {pendingVoiceNote && (
            <div className="p-4 rounded-2xl bg-indigo-50 border-2 border-indigo-300 space-y-3 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
                  <span className="font-extrabold text-indigo-950 text-xs uppercase tracking-wider">
                    Voice Note Recorded ({pendingVoiceNote.durationSeconds}s)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const audio = new Audio(pendingVoiceNote.audioUrl);
                    audio.play().catch(() => {});
                  }}
                  className="px-3 py-1 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold border border-indigo-200 flex items-center gap-1.5 transition shadow-2xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Listen
                </button>
              </div>

              <p className="text-xs text-slate-600">
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
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-indigo-200 text-xs text-indigo-800 font-semibold transition"
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
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm transition"
                >
                  Send Voice Note Directly
                </button>
                <button
                  type="button"
                  onClick={() => setPendingVoiceNote(null)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-500 text-xs font-semibold transition border border-slate-200"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* INPUT BAR & PROMINENT CENTRAL MICROPHONE */}
          <form onSubmit={handleCustomSend} className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder='Type or tap the microphone to speak (e.g. "Einen Kaffee, bitte")...'
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
              <button
                type="button"
                data-testid="speak-mic-button"
                onClick={toggleVoiceRecording}
                className={`px-4 sm:px-5 py-3 rounded-2xl border text-xs font-bold flex items-center gap-2 transition ${
                  isRecording
                    ? "bg-rose-600 text-white border-rose-500 animate-pulse shadow-md shadow-rose-500/20"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                }`}
                title="Tap to speak German"
              >
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline">{isRecording ? "Stop Recording" : "Speak German"}</span>
              </button>
              <button
                type="submit"
                className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Right 4 Cols: Pronunciation Lab & Target Phrases */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Key Phrases &amp; Sounds
              </div>
              <span className="text-xs font-bold text-slate-500">
                {selectedDay.speaking.length} phrases
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Tap any phrase to hear native pronunciation before speaking:
            </p>

            <div className="space-y-2">
              {selectedDay.speaking.map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => speakGerman(sp.germanPhrase, 0.88)}
                  className="w-full text-left p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 transition group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-indigo-700">
                      {sp.germanPhrase}
                    </span>
                    <Volume2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {sp.englishMeaning}
                  </div>
                  {sp.phoneticGuide && (
                    <div className="text-xs font-medium text-indigo-600 italic mt-1">
                      [{sp.phoneticGuide}]
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
