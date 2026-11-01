"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Volume2,
  ArrowRight,
} from "lucide-react";
import { WhyWrongRemediation } from "@/types/learning";
import { speakGerman } from "./ActivityPlayer";

interface WhyWasIWrongCardProps {
  learnerChoice?: string;
  remediation: WhyWrongRemediation;
  onApplicationSolved?: () => void;
}

export default function WhyWasIWrongCard({
  learnerChoice,
  remediation,
  onApplicationSolved,
}: WhyWasIWrongCardProps) {
  const [followUpSelected, setFollowUpSelected] = useState<string | null>(null);
  const isFollowUpCorrect =
    followUpSelected === remediation.followUpQuestion.correctAnswer;

  return (
    <div className="mt-3 bg-gradient-to-b from-amber-950/50 to-slate-900 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-full">
          <HelpCircle className="w-3.5 h-3.5" /> Why Was I Wrong? • AI Coach
        </span>
        <button
          type="button"
          onClick={() => speakGerman(remediation.correctSentence)}
          className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg"
        >
          <Volume2 className="w-3.5 h-3.5" /> Hear Correct
        </button>
      </div>

      {/* Learner vs Correct Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3">
          <div className="text-rose-300 font-bold uppercase tracking-wider mb-0.5">
            Learner:
          </div>
          <div className="text-rose-100 line-through font-medium">
            {learnerChoice || remediation.learnerMistakeExample}
          </div>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3">
          <div className="text-emerald-300 font-bold uppercase tracking-wider mb-0.5">
            Correct:
          </div>
          <div className="text-white font-bold text-sm">
            {remediation.correctSentence}
          </div>
        </div>
      </div>

      {/* Why? Explanation + Transformation Steps */}
      <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-2">
        <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
          Why?
        </div>
        <p className="text-sm font-semibold text-white">
          {remediation.ruleHeadline}
        </p>
        <div className="space-y-1 pt-1">
          {remediation.stepByStepBreakdown.map((step, idx) => (
            <div
              key={idx}
              className="text-xs font-mono text-emerald-300 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2"
            >
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ONE Immediate Application Exercise */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Immediate Application Exercise
        </div>
        <p className="text-xs sm:text-sm font-semibold text-white">
          {remediation.followUpQuestion.prompt}
        </p>
        <div className="flex flex-wrap gap-2">
          {remediation.followUpQuestion.options.map((opt) => {
            const isSelected = followUpSelected === opt;
            const isRight = opt === remediation.followUpQuestion.correctAnswer;
            return (
              <button
                type="button"
                key={opt}
                onClick={() => {
                  setFollowUpSelected(opt);
                  if (isRight && onApplicationSolved) {
                    onApplicationSolved();
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                  isSelected
                    ? isRight
                      ? "bg-emerald-500 text-slate-950 border-emerald-400"
                      : "bg-rose-500/25 text-rose-200 border-rose-500"
                    : "bg-slate-950 text-slate-200 border-slate-700 hover:border-emerald-500/50"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {followUpSelected && (
          <div
            className={`text-xs font-semibold flex items-center gap-1.5 pt-1 ${
              isFollowUpCorrect ? "text-emerald-400" : "text-amber-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {isFollowUpCorrect
                ? remediation.followUpQuestion.successMessage
                : `Almost! Try "${remediation.followUpQuestion.correctAnswer}".`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
