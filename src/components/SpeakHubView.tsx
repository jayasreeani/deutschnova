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
} from "lucide-react";
import { useLearning } from "@/context/LearningContext";
import { speakGerman } from "./ActivityPlayer";
import { DetectedMistake } from "@/types/learning";

export default function SpeakHubView() {
  const { plan, recordLearnerMistake } = useLearning();
  const austriaDays = plan.weeks[0]?.days || [];

  const [selectedDayNum, setSelectedDayNum] = useState<number>(
    plan.currentDayNumber <= 7 ? plan.currentDayNumber : 5
  );
  const [mode, setMode] = useState<"coach" | "real_life">("coach");
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
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const handleSelectScenarioDay = (dayNum: number) => {
    const target = austriaDays.find((d) => d.dayNumber === dayNum);
    if (!target) return;
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

  const sendToMissionBackend = async (text: string, stageIdx?: number) => {
    if (!text.trim()) return;
    setActiveCoachCard(null);
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

      if (mode === "coach" && data.requiresRetry && detected) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "user",
            german: text.trim(),
            feedback: `${data.coachHeadline || "Fast richtig!"} → ${detected.correctSentence}`,
          },
        ]);
        setActiveCoachCard({
          headline: data.coachHeadline || "Fast richtig!",
          mistake: detected,
        });
        speakGerman(detected.correctSentence, 0.9);
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
          feedback: mode === "coach" ? data.positiveNote : undefined,
        },
        {
          sender: "ai",
          german: data.aiReplyDe,
          english: data.aiReplyEn,
        },
      ]);
      speakGerman(data.aiReplyDe, 0.92);
    } catch {
      // ignore
    }
  };

  const handlePromptClick = (idx: number) => {
    const prompt = scenario.suggestedPrompts[idx];
    if (!prompt) return;
    sendToMissionBackend(prompt.german, idx);
  };

  const recognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const stopAndSendSpeech = () => {
    const toSend = (liveTranscriptRef.current || customText).trim();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
    if (toSend) {
      setCustomText("");
      liveTranscriptRef.current = "";
      sendToMissionBackend(toSend);
    }
  };

  const handleRealSpeechInput = async () => {
    setVoiceNotice(null);
    if (isRecording) {
      stopAndSendSpeech();
      return;
    }

    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition || typeof SpeechRecognition !== "function") {
      setVoiceNotice(
        "Speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari, or type your message below."
      );
      return;
    }

    // Explicitly check for mic permission if getUserMedia is available
    if (
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((t) => t.stop());
      } catch (err: any) {
        if (
          err?.name === "NotAllowedError" ||
          err?.name === "PermissionDeniedError"
        ) {
          setVoiceNotice(
            "Microphone access blocked: Please click the lock or camera icon in your browser address bar to allow microphone access, then try again."
          );
          return;
        }
      }
    }

    try {
      setIsRecording(true);
      liveTranscriptRef.current = "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition: any = new (SpeechRecognition as any)();
      recognitionRef.current = recognition;
      recognition.lang = "de-DE";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let finalStr = "";
        let interimStr = "";
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalStr += res[0]?.transcript || "";
          } else {
            interimStr += res[0]?.transcript || "";
          }
        }
        const textSpoken = (finalStr || interimStr).trim();
        if (textSpoken) {
          liveTranscriptRef.current = textSpoken;
          setCustomText(textSpoken);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (err: any) => {
        setIsRecording(false);
        recognitionRef.current = null;
        const errType = err?.error || "unknown";
        if (errType === "not-allowed" || errType === "service-not-allowed") {
          setVoiceNotice(
            "Microphone access blocked: Click the lock icon in your browser address bar to allow microphone access."
          );
        } else if (errType === "no-speech") {
          setVoiceNotice(
            "No speech detected: Speak closer to your microphone or type your response below."
          );
        } else if (errType === "network") {
          setVoiceNotice(
            "Speech recognition network error: Cloud speech services may be temporarily unavailable or blocked. You can type directly below."
          );
        } else if (errType !== "aborted") {
          setVoiceNotice(
            `Speech recognition notice (${errType}): Please try speaking again or type your message.`
          );
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
        const finalRecorded = liveTranscriptRef.current.trim();
        if (finalRecorded) {
          setCustomText("");
          liveTranscriptRef.current = "";
          sendToMissionBackend(finalRecorded);
        }
      };

      recognition.start();
    } catch (e: any) {
      setIsRecording(false);
      recognitionRef.current = null;
      setVoiceNotice(
        "Could not start microphone: " +
          (e?.message || "Please try typing below.")
      );
    }
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
              <button
                onClick={() => speakGerman(scenario.openingMessageDe)}
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
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {m.sender === "user" ? "You" : scenario.roleplayPartner}
                    </span>
                    <button
                      onClick={() => speakGerman(m.german)}
                      className="text-slate-400 hover:text-emerald-400"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold">{m.german}</p>
                  {m.english && (
                    <p className="text-xs text-slate-400 mt-1">{m.english}</p>
                  )}
                </div>
                {m.feedback && (
                  <span className="text-xs text-emerald-400 mt-1 px-2">
                    ★ {m.feedback}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Coach Mode Correction Card */}
          {activeCoachCard && (
            <div className="rounded-2xl bg-amber-950/50 border-2 border-amber-500/50 p-4 space-y-2.5 text-xs">
              <div className="font-extrabold text-amber-300 uppercase">
                {activeCoachCard.headline}
              </div>
              <div className="text-white">
                Correct sentence:{" "}
                <strong className="text-emerald-300">
                  „{activeCoachCard.mistake.correctSentence}“
                </strong>
              </div>
              <p className="text-slate-200">
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
                  onClick={handleRealSpeechInput}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isRecording
                      ? "bg-rose-500 text-white animate-pulse"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  {isRecording ? "Listening (de-DE)..." : "Speak via Mic"}
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

            {isRecording && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0"></span>
                <span className="font-bold shrink-0">Listening in German (de-DE)...</span>
                <span className="text-slate-200 italic truncate max-w-xs sm:max-w-md">
                  {customText ? `„${customText}“` : "Speak now into your microphone"}
                </span>
                <button
                  type="button"
                  onClick={stopAndSendSpeech}
                  className="ml-auto px-2.5 py-1 rounded-lg bg-rose-500 text-white font-extrabold text-xs shadow hover:bg-rose-600 shrink-0"
                >
                  Finish &amp; Send
                </button>
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
                onClick={handleRealSpeechInput}
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
