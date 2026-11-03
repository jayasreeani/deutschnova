"use client";

import React, { useState } from "react";
import { Sparkles, Check, X, Compass } from "lucide-react";
import { CEFRLevel, LearningGoalType } from "@/types/learning";
import { useLearning } from "@/context/LearningContext";

export default function OnboardingModal() {
  const {
    plan,
    showOnboardingModal,
    setShowOnboardingModal,
    reconfigurePlan,
  } = useLearning();

  const [learnerName, setLearnerName] = useState(plan.learnerName || "Aarav");
  const [level, setLevel] = useState<CEFRLevel>(plan.level || "A1");
  const [goal, setGoal] = useState<LearningGoalType>(
    plan.learningGoal || "university"
  );
  const [dailyMinutes, setDailyMinutes] = useState<number>(
    plan.dailyTargetMinutes || 15
  );
  const [presetMode, setPresetMode] = useState<
    "day1_fresh" | "day6_austria" | "day7_vienna" | "day12_routine"
  >("day1_fresh");

  if (!showOnboardingModal) return null;

  const handleCreateJourney = (e: React.FormEvent) => {
    e.preventDefault();
    reconfigurePlan({
      learnerName: learnerName.trim() || "Learner",
      level,
      learningGoal: goal,
      dailyTargetMinutes: dailyMinutes,
      startAtDay:
        presetMode === "day1_fresh"
          ? 1
          : presetMode === "day6_austria"
          ? 6
          : presetMode === "day7_vienna"
          ? 7
          : 12,
      todayCompletedActivitiesCount:
        presetMode === "day6_austria"
          ? 5
          : presetMode === "day12_routine"
          ? 4
          : 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl my-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full mb-2">
              <Compass className="w-3.5 h-3.5" /> Personalized Onboarding
            </span>
            <h2 className="text-2xl font-extrabold text-white">
              Configure Your Learning Journey
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              DeutschNova automatically builds your connected day-by-day
              real-life readiness plan so you never have to decide what to study
              next.
            </p>
          </div>
          <button
            onClick={() => setShowOnboardingModal(false)}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreateJourney} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              value={learnerName}
              onChange={(e) => setLearnerName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* CEFR Level */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Current CEFR Level (MVP Focus: A1)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["A1", "A2", "B1", "B2"] as CEFRLevel[]).map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={`py-2.5 rounded-xl font-bold text-sm border transition ${
                    level === lvl
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Learning Goal */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Primary Learning Goal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: "university", label: "University & Study in Austria" },
                { id: "daily_life", label: "Daily Life & Integration" },
                { id: "travel", label: "Travel & Real-Life Survival" },
                { id: "career", label: "Work & Tech Career" },
              ].map((g) => (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => setGoal(g.id as LearningGoalType)}
                  className={`p-3 rounded-xl text-left text-xs font-semibold border transition flex items-center justify-between ${
                    goal === g.id
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <span>{g.label}</span>
                  {goal === g.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Daily Study Target */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Daily Study Target
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 15, 20, 30].map((mins) => (
                <button
                  type="button"
                  key={mins}
                  onClick={() => setDailyMinutes(mins)}
                  className={`py-2 rounded-xl font-bold text-xs border transition ${
                    dailyMinutes === mins
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {mins} min/day
                </button>
              ))}
            </div>
          </div>

          {/* Starting Point Preset */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Journey Starting Point (&ldquo;My First Week in Austria&rdquo;)
            </label>
            <div className="space-y-2">
              {[
                {
                  id: "day1_fresh",
                  title:
                    "Day 1 of A1 — Complete Beginner (Recommended)",
                  desc: "Start from scratch in Austria (Ich heiße..., Ich komme aus..., Ich spreche...). Zero previous knowledge required.",
                },
                {
                  id: "day6_austria",
                  title:
                    "Day 6 of A1 — Introduce Yourself at University (5/8 Done)",
                  desc: "Showcases 'My First Week in Austria', Dative 'mit meiner Freundin', & 'Why was I wrong?'",
                },
                {
                  id: "day7_vienna",
                  title: "Day 7 of A1 — REAL-LIFE CHALLENGE: 'A Day in Vienna'",
                  desc: "Combined 5-stage AI scenario (Bakery, Train Ticket, Directions, University, Restaurant)",
                },
                {
                  id: "day12_routine",
                  title: "Day 12 of A1 — Daily Routine (Week 2)",
                  desc: "Explore Week 2 Daily Routine & Separable Verbs",
                },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() =>
                    setPresetMode(
                      item.id as
                        | "day6_austria"
                        | "day1_fresh"
                        | "day7_vienna"
                        | "day12_routine"
                    )
                  }
                  className={`w-full p-3 rounded-xl text-left border transition ${
                    presetMode === item.id
                      ? "bg-emerald-500/15 border-emerald-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs font-bold">{item.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition"
          >
            <Sparkles className="w-4 h-4" /> Save & Open My Learning Journey
          </button>
        </form>
      </div>
    </div>
  );
}
