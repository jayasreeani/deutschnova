"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Volume2,
  ArrowRight,
  Sparkles,
  Award,
} from "lucide-react";
import { useLearning } from "@/context/LearningContext";
import { speakGerman } from "./ActivityPlayer";

interface MyLearningPathViewProps {
  onJumpToDay: (dayNumber: number, activityId?: string) => void;
}

export default function MyLearningPathView({
  onJumpToDay,
}: MyLearningPathViewProps) {
  const {
    plan,
    recordVocabularyAttempt,
    resolveMistakeMemoryItem,
  } = useLearning();

  const [activeSection, setActiveSection] = useState<
    "readiness" | "mistakes" | "vocabulary"
  >("readiness");
  const [followUpChoices, setFollowUpChoices] = useState<
    Record<string, string>
  >({});

  const austriaDaysCompleted = plan.weeks[0].days.filter(
    (d) => d.state === "completed"
  ).length;
  const austriaProgressPercent = Math.round((austriaDaysCompleted / 7) * 100);

  const focusAreaItems = Object.values(plan.grammarProgress);
  const vocabList = Object.values(plan.vocabularyProgress);

  const getFocusBadgeStyle = (status: string) => {
    if (status === "Needs Practice")
      return "bg-rose-50 text-rose-700 border-rose-200";
    if (status === "Improving")
      return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Clean Header + 4 Compact Stat Cards */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Your Progress &amp; Focus Areas
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Track your real-world readiness, mistake memory, and vocabulary mastery.
            </p>
          </div>

          <button
            onClick={() => onJumpToDay(plan.currentDayNumber)}
            className="btn-brand-primary px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition"
          >
            Continue Day {plan.currentDayNumber} <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase">
              CEFR Level
            </div>
            <div className="text-lg font-black text-indigo-600 mt-0.5">
              {plan.userProgress.currentLevel} Readiness
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase">
              Active Day
            </div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              Day {plan.currentDayNumber} of A1
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase">
              Week 1 Progress
            </div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {austriaDaysCompleted}/7 Days ({austriaProgressPercent}%)
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase">
              Current Streak
            </div>
            <div className="text-lg font-black text-amber-600 mt-0.5">
              🔥 {plan.streak.currentStreak} Days
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Pills */}
      <div className="flex items-center gap-1.5 bg-slate-200/70 p-1.5 rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setActiveSection("readiness")}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-extrabold transition ${
            activeSection === "readiness"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Real-World Readiness (7)
        </button>
        <button
          onClick={() => setActiveSection("mistakes")}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-extrabold transition ${
            activeSection === "mistakes"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Mistake Memory ({plan.mistakeMemory.length})
        </button>
        <button
          onClick={() => setActiveSection("vocabulary")}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-extrabold transition ${
            activeSection === "vocabulary"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Vocabulary ({vocabList.length})
        </button>
      </div>

      {/* SECTION 1: REAL-WORLD READINESS */}
      {activeSection === "readiness" &&
        plan.realWorldReadiness &&
        plan.realWorldReadiness.length > 0 && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Practical Capabilities in Austria (A1)
                </h2>
                <p className="text-xs text-slate-500">
                  Requires completed lessons, mission practice, and zero unresolved recurring mistakes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {plan.realWorldReadiness.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl p-4 border border-slate-200/90 bg-slate-50/50 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-500">
                        Day {item.dayNumber} • {item.locationContext}
                      </span>
                      <span
                        className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                          item.status === "Ready"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.status === "Practice Needed"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : item.status === "Learning"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="text-sm font-extrabold text-slate-900">
                      {item.capabilityTitle}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.evidenceSummary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Words: <strong>{item.vocabMasteredCount}/{item.vocabTotalCount}</strong>
                    </span>
                    <button
                      onClick={() =>
                        onJumpToDay(
                          item.dayNumber,
                          `d${item.dayNumber}-act-ai`
                        )
                      }
                      className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
                    >
                      Open Day {item.dayNumber} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* SECTION 2: MISTAKE MEMORY & FOCUS AREAS */}
      {activeSection === "mistakes" && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Personal Mistake Memory
              </h2>
              <p className="text-xs text-slate-500">
                1st slip = Improving • 2+ slips = Needs Practice • Correct usage in missions = Mastered
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plan.mistakeMemory.map((m) => {
                const chosen = followUpChoices[m.id];
                const isCorrect =
                  chosen && chosen === m.followUpQuestion?.correctAnswer;

                return (
                  <div
                    key={m.id}
                    className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                          {m.categoryLabel}
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getFocusBadgeStyle(
                            m.status
                          )}`}
                        >
                          {m.status} ({m.occurrences}x)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2.5">
                          <div className="text-[10px] font-bold uppercase text-rose-700">
                            You Said
                          </div>
                          <div className="text-xs font-semibold text-rose-900 line-through mt-0.5">
                            {m.learnerInput}
                          </div>
                        </div>
                        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5">
                          <div className="text-[10px] font-bold uppercase text-emerald-700">
                            Correct German
                          </div>
                          <div className="text-xs font-extrabold text-emerald-900 mt-0.5">
                            {m.correctGerman}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-900">Why:</strong>{" "}
                        {m.whyExplanation}
                      </p>
                    </div>

                    {m.followUpQuestion && (
                      <div className="pt-3 border-t border-slate-200 space-y-2">
                        <div className="text-xs font-bold text-slate-800">
                          Quick Practice: {m.followUpQuestion.prompt}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {m.followUpQuestion.options.map((opt) => {
                            const selected = chosen === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => {
                                  setFollowUpChoices((p) => ({
                                    ...p,
                                    [m.id]: opt,
                                  }));
                                  if (opt === m.followUpQuestion?.correctAnswer) {
                                    resolveMistakeMemoryItem(m.id);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                                  selected
                                    ? opt === m.followUpQuestion?.correctAnswer
                                      ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                                      : "bg-rose-50 border-rose-500 text-rose-800"
                                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {chosen && (
                          <p
                            className={`text-xs font-semibold ${
                              isCorrect ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {isCorrect
                              ? "✓ Correct! Status updated."
                              : `Try "${m.followUpQuestion.correctAnswer}".`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grammar Focus Areas */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
            <h3 className="text-base font-extrabold text-slate-900">
              Grammar Focus Areas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {focusAreaItems.map((item) => (
                <div
                  key={item.categoryId}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {item.recommendedAction}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${getFocusBadgeStyle(
                      item.focusStatus
                    )}`}
                  >
                    {item.focusStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: VOCABULARY BANK */}
      {activeSection === "vocabulary" && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Tracked Vocabulary ({vocabList.length} words)
            </h2>
            <p className="text-xs text-slate-500">
              Tap Practice ✓ to update word mastery or listen to native German audio.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vocabList.slice(0, 14).map((v) => (
              <div
                key={v.wordId}
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 truncate">
                    {v.article ? `${v.article} ` : ""}
                    {v.word}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {v.english}
                    {v.plural ? ` • Pl: ${v.plural}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getFocusBadgeStyle(
                      v.needsReview ? "Needs Practice" : "Strong"
                    )}`}
                  >
                    {v.status}
                  </span>
                  <button
                    onClick={() => recordVocabularyAttempt(v.wordId, true)}
                    className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold"
                    title="Mark practiced"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() =>
                      speakGerman(
                        v.article ? `${v.article} ${v.word}` : v.word,
                        0.9
                      )
                    }
                    className="p-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
