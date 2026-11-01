"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Lock,
  Play,
  Calendar as CalendarIcon,
  Unlock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useLearning } from "@/context/LearningContext";
import { LearningDay } from "@/types/learning";

interface LearningCalendarProps {
  onSelectDay?: (dayNumber: number) => void;
}

export default function LearningCalendar({
  onSelectDay,
}: LearningCalendarProps) {
  const {
    plan,
    activeDayNumber,
    setActiveDayNumber,
    unlockAllDaysForPreview,
  } = useLearning();

  const [expandedWeek, setExpandedWeek] = useState<number>(1);

  const handleDayClick = (day: LearningDay) => {
    if (day.state === "locked") return;
    setActiveDayNumber(day.dayNumber);
    if (onSelectDay) onSelectDay(day.dayNumber);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <CalendarIcon className="w-3.5 h-3.5" /> 21-Day Curriculum
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">
            Full {plan.level} Course Roadmap
          </h3>
        </div>

        <button
          onClick={unlockAllDaysForPreview}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition"
          title="Unlock all future lessons to preview the full 21-day A1 curriculum"
        >
          <Unlock className="w-3.5 h-3.5 text-indigo-600" /> Unlock All Days
        </button>
      </div>

      {/* Collapsible Weeks List */}
      <div className="space-y-3">
        {plan.weeks.map((week) => {
          const completedInWeek = week.days.filter(
            (d) => d.state === "completed"
          ).length;
          const isOpen = expandedWeek === week.weekNumber;

          return (
            <div
              key={week.weekNumber}
              className="border border-slate-200/90 rounded-2xl overflow-hidden bg-slate-50/40"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedWeek(isOpen ? 0 : week.weekNumber)
                }
                className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-100/60 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                      {week.title}
                    </h4>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {completedInWeek}/7 Done
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {week.description}
                  </p>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-200/70 bg-white">
                  {week.days.map((day) => {
                    const isSelected = day.dayNumber === activeDayNumber;
                    const doneActs = day.activities.filter(
                      (a) => a.completed
                    ).length;

                    return (
                      <button
                        key={day.dayNumber}
                        onClick={() => handleDayClick(day)}
                        disabled={day.state === "locked"}
                        className={`text-left rounded-2xl p-3.5 border transition-all flex flex-col justify-between gap-2 ${
                          isSelected
                            ? "bg-indigo-50/70 border-2 border-indigo-600 shadow-sm"
                            : day.state === "completed"
                            ? "bg-emerald-50/40 border border-emerald-200 hover:border-emerald-300"
                            : day.state === "available" || day.state === "today"
                            ? "bg-white border border-slate-200 hover:border-indigo-300"
                            : "bg-slate-50 border border-slate-200/70 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span
                              className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                isSelected
                                  ? "bg-indigo-600 text-white"
                                  : day.state === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              Day {day.dayNumber}
                            </span>

                            {day.state === "completed" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : day.state === "locked" ? (
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <Play className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            )}
                          </div>

                          <div className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                            {day.goalTitle}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1.5 border-t border-slate-100">
                          <span>{day.theme}</span>
                          <span>{doneActs}/8 steps</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
