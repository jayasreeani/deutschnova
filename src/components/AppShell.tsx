"use client";

import React, { useState } from "react";
import {
  Flame,
  Trophy,
  Compass,
  Settings,
  BookOpen,
  Mic,
  BarChart3,
  User,
  MapPin,
  CheckCircle2,
  Play,
  Smartphone,
  Monitor,
} from "lucide-react";
import { useLearning } from "@/context/LearningContext";
import TodayDashboard from "./TodayDashboard";
import MyLearningPathView from "./MyLearningPathView";
import LearningCalendar from "./LearningCalendar";
import SpeakHubView from "./SpeakHubView";
import ProfileView from "./ProfileView";
import DayCompleteModal from "./DayCompleteModal";
import OnboardingModal from "./OnboardingModal";

export type ActiveTab =
  | "today"
  | "learn"
  | "speak"
  | "progress"
  | "profile"
  | "learning_path"
  | "calendar";

export default function AppShell({
  initialTab = "today",
}: {
  initialTab?: ActiveTab;
}) {
  const normalizedInitial: "today" | "learn" | "speak" | "progress" | "profile" =
    initialTab === "learning_path"
      ? "progress"
      : initialTab === "calendar"
      ? "learn"
      : initialTab;

  const [activeTab, setActiveTab] = useState<
    "today" | "learn" | "speak" | "progress" | "profile"
  >(normalizedInitial);
  const [mobilePreviewMode, setMobilePreviewMode] = useState<boolean>(false);

  const {
    plan,
    activeDay,
    setActiveDayNumber,
    setActiveActivityId,
    setShowOnboardingModal,
  } = useLearning();

  const week1 = plan.weeks[0];

  return (
    <div className="theme-light-surface min-h-screen text-slate-900 flex flex-col pb-28">
      {/* Clean Frosted White Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <button
            onClick={() => {
              setActiveActivityId(null);
              setActiveTab("today");
            }}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
              D
            </div>
            <div>
              <div className="text-sm sm:text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
                DeutschNova
                <span className="text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {plan.level}
                </span>
              </div>
              <div className="text-xs text-slate-500 hidden sm:block">
                Real-Life German Coach
              </div>
            </div>
          </button>

          {/* Desktop Navigation Pills */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 border border-slate-200/80 p-1 rounded-2xl">
            <button
              onClick={() => {
                setActiveActivityId(null);
                setActiveTab("today");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === "today"
                  ? "bg-white text-indigo-700 font-extrabold shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Today
            </button>
            <button
              onClick={() => setActiveTab("learn")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === "learn"
                  ? "bg-white text-indigo-700 font-extrabold shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Roadmap
            </button>
            <button
              onClick={() => setActiveTab("speak")}
              className={`px-4 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
                activeTab === "speak"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Speak
            </button>
            <button
              onClick={() => setActiveTab("progress")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === "progress"
                  ? "bg-white text-indigo-700 font-extrabold shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Progress
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === "profile"
                  ? "bg-white text-indigo-700 font-extrabold shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Profile
            </button>
          </nav>

          {/* Compact Right Status Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobilePreviewMode((v) => !v)}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                mobilePreviewMode
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
              title="Toggle between Smartphone Frame and Standard layout"
            >
              {mobilePreviewMode ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Standard</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Phone View</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {plan.streak.currentStreak}d
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold">
              <Trophy className="w-3.5 h-3.5 text-indigo-500" />
              {plan.userProgress.totalXp} XP
            </div>
            <button
              onClick={() => setShowOnboardingModal(true)}
              className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition"
              title="Customize Learning Plan"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Focused, Breathable Main Container (max-w-4xl instead of overloaded full-screen grid) */}
      <main
        className={`flex-1 w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 transition-all duration-300 ${
          mobilePreviewMode
            ? "max-w-[430px] my-4 rounded-[40px] border-[6px] border-slate-300 bg-white shadow-2xl"
            : "max-w-4xl"
        }`}
      >
        {activeTab === "today" && (
          <TodayDashboard
            onOpenLearningPath={() => {
              setActiveTab("progress");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onOpenSpeakHub={() => {
              setActiveTab("speak");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {activeTab === "learn" && (
          <div className="space-y-6">
            {week1 && (
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full mb-2">
                      <MapPin className="w-3.5 h-3.5" /> Week 1 • Vienna Journey
                    </span>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                      My First Week in Austria
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Select any day to jump directly into its real-life mission.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("today")}
                    className="btn-brand-primary px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-sm"
                  >
                    Back to Day {activeDay.dayNumber}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {week1.days.map((day) => {
                    const isCurrent = day.dayNumber === activeDay.dayNumber;
                    return (
                      <button
                        key={day.dayNumber}
                        onClick={() => {
                          setActiveDayNumber(day.dayNumber);
                          setActiveActivityId(null);
                          setActiveTab("today");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={`text-left rounded-2xl p-4 border transition flex items-center justify-between gap-3 ${
                          isCurrent
                            ? "bg-indigo-50/70 border-2 border-indigo-500 shadow-sm"
                            : day.state === "completed"
                            ? "bg-emerald-50/40 border border-emerald-200 hover:border-emerald-300"
                            : "bg-slate-50/70 border border-slate-200 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                isCurrent
                                  ? "bg-indigo-600 text-white"
                                  : day.state === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              Day {day.dayNumber}
                            </span>
                            <span className="text-xs text-slate-500 truncate">
                              {day.theme}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {day.goalTitle}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {day.state === "completed" ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Play className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <LearningCalendar
              onSelectDay={(dayNum) => {
                setActiveDayNumber(dayNum);
                setActiveActivityId(null);
                setActiveTab("today");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        )}

        {activeTab === "speak" && <SpeakHubView />}

        {activeTab === "progress" && (
          <MyLearningPathView
            onJumpToDay={(dayNum, activityId) => {
              setActiveDayNumber(dayNum);
              if (activityId) setActiveActivityId(activityId);
              setActiveTab("today");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {activeTab === "profile" && (
          <ProfileView
            onJumpToToday={() => {
              setActiveTab("today");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
      </main>

      {/* Clean Floating Bottom Navigation Dock */}
      <div className="fixed bottom-3 inset-x-0 z-50 px-3 pointer-events-none">
        <nav
          aria-label="Bottom Navigation"
          className="pointer-events-auto max-w-md mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl px-3 py-2 shadow-xl shadow-slate-900/10"
        >
          <div className="grid grid-cols-5 items-center gap-1">
            <button
              onClick={() => {
                setActiveActivityId(null);
                setActiveTab("today");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
                activeTab === "today"
                  ? "text-indigo-600 bg-indigo-50 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[11px] mt-0.5">Today</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("learn");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
                activeTab === "learn"
                  ? "text-indigo-600 bg-indigo-50 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[11px] mt-0.5">Roadmap</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("speak");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex flex-col items-center justify-center -mt-4"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition transform active:scale-95 ${
                  activeTab === "speak"
                    ? "bg-indigo-700 text-white ring-4 ring-indigo-100"
                    : "bg-gradient-to-br from-indigo-600 to-violet-600 text-white"
                }`}
              >
                <Mic className="w-5 h-5" />
              </div>
              <span
                className={`text-[11px] font-extrabold mt-1 ${
                  activeTab === "speak" ? "text-indigo-700" : "text-slate-700"
                }`}
              >
                Speak
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("progress");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
                activeTab === "progress"
                  ? "text-indigo-600 bg-indigo-50 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-[11px] mt-0.5">Progress</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("profile");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
                activeTab === "profile"
                  ? "text-indigo-600 bg-indigo-50 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[11px] mt-0.5">Profile</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Modals */}
      <DayCompleteModal onPracticeMore={() => setActiveTab("speak")} />
      <OnboardingModal />
    </div>
  );
}
