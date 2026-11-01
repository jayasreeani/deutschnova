"use client";

import React, { useState } from "react";
import {
  Flame,
  Trophy,
  Compass,
  Settings,
  Sparkles,
  CheckCircle2,
  MapPin,
  Clock,
  Award,
  LogOut,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { useLearning } from "@/context/LearningContext";

interface ProfileViewProps {
  onJumpToToday: () => void;
}

export default function ProfileView({ onJumpToToday }: ProfileViewProps) {
  const {
    plan,
    reconfigurePlan,
    setShowOnboardingModal,
    isLoggedIn,
    loginUser,
    logoutUser,
  } = useLearning();

  const [emailInput, setEmailInput] = useState(
    plan.learnerEmail || "aarav@deutschnova.at"
  );
  const [nameInput, setNameInput] = useState(plan.learnerName || "Aarav");
  const [authStatusMsg, setAuthStatusMsg] = useState<string | null>(null);

  const quickSwitchPreset = (
    startAtDay: number,
    todayCompletedActivitiesCount: number
  ) => {
    reconfigurePlan({
      learnerName: plan.learnerName,
      level: plan.level,
      learningGoal: plan.learningGoal,
      dailyTargetMinutes: plan.dailyTargetMinutes,
      startAtDay,
      todayCompletedActivitiesCount,
    });
    onJumpToToday();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await loginUser(emailInput, nameInput);
    setAuthStatusMsg(
      `Logged in as ${emailInput} — LearningPlan & Mistake Memory restored from server store (/api/learning-plan).`
    );
  };

  const handleLogoutClick = () => {
    logoutUser();
    setAuthStatusMsg(
      "Logged out of active session. Click 'Log Back In & Restore Progress' below to verify persistence after logout/login."
    );
  };

  return (
    <div className="space-y-6">
      {/* Profile Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg">
              {plan.learnerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white">
                  {plan.learnerName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                  CEFR {plan.level} • Real-Life Readiness
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Active Theme: <strong>My First Week in Austria (Vienna)</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowOnboardingModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition"
          >
            <Settings className="w-4 h-4 text-emerald-400" /> Edit Learning
            Preferences
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" /> Current Streak
            </div>
            <div className="text-xl font-black text-white mt-1">
              {plan.streak.currentStreak} Days
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" /> Total XP
            </div>
            <div className="text-xl font-black text-amber-400 mt-1">
              {plan.userProgress.totalXp} XP
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" /> Daily Target
            </div>
            <div className="text-xl font-black text-white mt-1">
              {plan.dailyTargetMinutes} min/day
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-sky-400" /> Active Day
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              Day {plan.currentDayNumber} of A1
            </div>
          </div>
        </div>
      </div>

      {/* Authentication & Server Progress Persistence (Logout / Login Verification) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" /> Authentication &amp; Server
              Persistence (/api/learning-plan)
            </div>
            <h2 className="text-lg font-extrabold text-white">
              Account Session &amp; Logout / Login Persistence Test
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Your learning day progress, vocabulary status, Personal Mistake
              Memory, and Real-World Readiness are persisted in{" "}
              <code className="text-emerald-300">prisma/deutschnova_store.json</code>{" "}
              and <code className="text-emerald-300">localStorage</code>.
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
              isLoggedIn
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
            }`}
          >
            {isLoggedIn ? `Signed In (${plan.learnerEmail || "aarav@deutschnova.at"})` : "Signed Out"}
          </span>
        </div>

        {authStatusMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200">
            {authStatusMsg}
          </div>
        )}

        <form
          onSubmit={handleLoginSubmit}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Learner Name
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Account Email (Server Key)
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleLogoutClick}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            ) : null}
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <LogIn className="w-3.5 h-3.5" />{" "}
              {isLoggedIn ? "Sync / Switch User" : "Log Back In & Restore"}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Scenario / Journey Switcher for "MY FIRST WEEK IN AUSTRIA" */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" /> Instant MVP Journey Switcher
        </div>
        <h2 className="text-lg font-extrabold text-white">
          Jump to Any Point in &ldquo;My First Week in Austria&rdquo;
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Test the connected 7-day Austria experience, including Day 5 (Order
          Food at a Restaurant — Primary End-to-End Test), Day 6 (University +
          Dative), or Day 7 (&ldquo;A Day in Vienna&rdquo;).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              day: 5,
              done: 0,
              title: "Day 5: Order Food at a Restaurant (Primary E2E Test)",
              desc: "Full 8-step restaurant flow: Today's Mission → Vocabulary (der Kaffee) → Grammar → Listening → Practice → Speaking → Dynamic AI Waiter (Coach & Real-Life Mode) → Daily Review.",
            },
            {
              day: 1,
              done: 0,
              title: "Day 1: Introduce Yourself to Another Student",
              desc: "Start fresh at Day 1 in Vienna (Ich heiße..., Ich komme aus..., Ich bin Student/in).",
            },
            {
              day: 6,
              done: 5,
              title: "Day 6: Introduce Yourself at University (5/8 Completed)",
              desc: "Dative case 'mit meiner Freundin' + 'Why was I wrong?' coach.",
            },
            {
              day: 7,
              done: 0,
              title: "Day 7: REAL-LIFE CHALLENGE — 'A Day in Vienna'",
              desc: "5-stage combined AI scenario (Bakery → Train Station → Directions → University → Restaurant).",
            },
          ].map((preset) => {
            const isCurrent = plan.currentDayNumber === preset.day;
            return (
              <button
                key={preset.day}
                onClick={() => quickSwitchPreset(preset.day, preset.done)}
                className={`p-4 rounded-2xl text-left border transition flex flex-col justify-between gap-2 ${
                  isCurrent
                    ? "bg-emerald-950/35 border-2 border-emerald-400"
                    : "bg-slate-950/80 border border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                      Day {preset.day} of A1
                    </span>
                    {isCurrent && (
                      <span className="text-xs font-bold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {preset.title}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{preset.desc}</p>
                </div>
                <div className="text-xs font-bold text-amber-400 pt-1">
                  Switch to Day {preset.day} →
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modular Mobile-Ready Architecture Info */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              AI German Real-Life Readiness Coach
            </div>
            <div className="text-xs text-slate-400">
              Move from learning German to confidently using German in real-life
              situations.
            </div>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          Mobile-First Responsive Web MVP
        </span>
      </div>
    </div>
  );
}
