"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Flame,
  Trophy,
  BookOpen,
  Brain,
  Mic,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useLearning } from "@/context/LearningContext";

interface DayCompleteModalProps {
  onPracticeMore: () => void;
}

export default function DayCompleteModal({
  onPracticeMore,
}: DayCompleteModalProps) {
  const {
    plan,
    activeDay,
    showDayCompleteModal,
    setShowDayCompleteModal,
    advanceToNextDay,
  } = useLearning();

  useEffect(() => {
    if (showDayCompleteModal) {
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore if confetti fails in headless mode
      }
    }
  }, [showDayCompleteModal]);

  if (!showDayCompleteModal) return null;

  const xpEarned = activeDay.activities.reduce(
    (sum, a) => sum + (a.completed ? a.xpReward : 0),
    0
  );
  const wordsLearnedCount = activeDay.vocabulary.length;
  const grammarLearnedTitle = activeDay.grammar.title;
  const speakingScore =
    activeDay.speakingScore ?? plan.speakingProgress.overallScore ?? 88;
  const quizScore = activeDay.quizScore ?? 92;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl shadow-emerald-500/10 relative my-8">
        {/* Header Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30 mb-4">
            <Trophy className="w-8 h-8" />
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Day {activeDay.dayNumber} of{" "}
            {activeDay.level} Complete
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Day Complete!
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Ausgezeichnet! You mastered{" "}
            <strong className="text-white">{activeDay.goalTitle}</strong> (
            {activeDay.subtitle}).
          </p>
        </div>

        {/* Summary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 text-center">
            <div className="text-xs text-slate-400 mb-1">XP Earned</div>
            <div className="text-2xl font-extrabold text-amber-400">
              +{xpEarned} XP
            </div>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 text-center">
            <div className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Words
              Learned
            </div>
            <div className="text-2xl font-extrabold text-emerald-400">
              {wordsLearnedCount} Words
            </div>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 text-center">
            <div className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Current Streak
            </div>
            <div className="text-2xl font-extrabold text-orange-400">
              {plan.streak.currentStreak} Days
            </div>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 text-center">
            <div className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1">
              <Mic className="w-3.5 h-3.5 text-rose-400" /> Speaking Score
            </div>
            <div className="text-xl font-extrabold text-rose-300">
              {speakingScore}%
            </div>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 text-center">
            <div className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" /> Quiz Score
            </div>
            <div className="text-xl font-extrabold text-sky-300">
              {quizScore}%
            </div>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 text-center">
            <div className="text-xs text-slate-400 mb-1">Longest Streak</div>
            <div className="text-xl font-extrabold text-slate-200">
              {plan.streak.longestStreak} Days
            </div>
          </div>
        </div>

        {/* Grammar & Words Learned Detail */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex items-start gap-2.5">
            <Brain className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="text-slate-400 block">Grammar Learned:</span>
              <strong className="text-white text-sm">
                {grammarLearnedTitle}
              </strong>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-xs text-slate-400 block mb-1.5">
              Words Mastered Today:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeDay.vocabulary.map((w) => (
                <span
                  key={w.id}
                  className="text-xs bg-slate-900 border border-slate-700 text-emerald-300 px-2.5 py-1 rounded-lg font-medium"
                >
                  {w.article ? `${w.article} ` : ""}
                  {w.word}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Two Primary Actions: Practice More & Continue Tomorrow */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => {
              setShowDayCompleteModal(false);
              onPracticeMore();
            }}
            className="w-full sm:w-1/2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" /> Practice More
          </button>

          <button
            onClick={advanceToNextDay}
            className="w-full sm:w-1/2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition"
          >
            Continue Tomorrow (Day {Math.min(21, activeDay.dayNumber + 1)}){" "}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
