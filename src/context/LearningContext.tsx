"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  CEFRLevel,
  DetectedMistake,
  FocusStatus,
  LearningDay,
  LearningGoalType,
  LearningPlan,
  LearningStatus,
  MistakeCategory,
  MistakeMemoryEntry,
  MissionCompletionFeedback,
} from "@/types/learning";
import {
  ADAPTIVE_ACCUSATIVE_DRILLS,
  ADAPTIVE_ARTICLE_DRILLS,
  ADAPTIVE_DATIVE_DRILLS,
  ADAPTIVE_SEPARABLE_VERB_DRILLS,
  buildPersonalReviewFromMistakes,
  buildRealWorldReadinessList,
  createPersonalizedLearningPlan,
} from "@/data/a1Curriculum";
import {
  recordCorrectStructuresInMemory,
  upsertMistakeInMemory,
} from "@/lib/germanTutorEngine";

const STORAGE_KEY = "deutschnova_learning_plan_v3";
const AUTH_KEY = "deutschnova_auth_session_v1";

interface CompleteActivityPayload {
  dayNumber: number;
  activityId: string;
  score?: number;
  speakingScore?: number;
  grammarMistakeCategories?: string[];
  weakWordIds?: string[];
}

interface OnboardingPayload {
  learnerName: string;
  learnerEmail?: string;
  level: CEFRLevel;
  learningGoal: LearningGoalType;
  dailyTargetMinutes: number;
  startAtDay?: number;
  todayCompletedActivitiesCount?: number;
}

interface LearningContextValue {
  plan: LearningPlan;
  isHydrated: boolean;
  isLoggedIn: boolean;
  lastSyncedAt: string | null;
  activeDayNumber: number;
  activeDay: LearningDay;
  todayDay: LearningDay;
  activeActivityId: string | null;
  showDayCompleteModal: boolean;
  showOnboardingModal: boolean;
  setActiveDayNumber: (dayNumber: number) => void;
  setActiveActivityId: (activityId: string | null) => void;
  setShowDayCompleteModal: (show: boolean) => void;
  setShowOnboardingModal: (show: boolean) => void;
  completeActivity: (payload: CompleteActivityPayload) => void;
  advanceToNextDay: () => void;
  recordGrammarAttempt: (categoryId: string, isCorrect: boolean) => void;
  recordVocabularyAttempt: (wordId: string, isCorrect: boolean) => void;
  recordLearnerMistake: (mistake: DetectedMistake, dayNumber: number) => void;
  recordCorrectStructuresUsage: (categories: MistakeCategory[]) => void;
  saveMissionFeedback: (feedback: MissionCompletionFeedback) => void;
  completePersonalReview: () => void;
  resolveMistakeMemoryItem: (mistakeId: string) => void;
  reconfigurePlan: (payload: OnboardingPayload) => void;
  unlockAllDaysForPreview: () => void;
  loginUser: (email: string, name?: string) => Promise<void>;
  logoutUser: () => void;
}

const LearningContext = createContext<LearningContextValue | undefined>(
  undefined
);

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<LearningPlan>(() =>
    createPersonalizedLearningPlan({
      learnerName: "Aarav",
      learnerEmail: "aarav@deutschnova.ai",
      level: "A1",
      learningGoal: "daily_life",
      dailyTargetMinutes: 15,
      startAtDay: 5,
      todayCompletedActivitiesCount: 0,
    })
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [activeDayNumber, setActiveDayNumberState] = useState<number>(5);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [showDayCompleteModal, setShowDayCompleteModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Load persisted plan from localStorage and/or server DB on mount
  useEffect(() => {
    let mounted = true;
    async function initPlan() {
      try {
        const authRaw = localStorage.getItem(AUTH_KEY);
        if (authRaw) {
          const authParsed = JSON.parse(authRaw);
          if (authParsed.loggedOut) {
            if (mounted) setIsLoggedIn(false);
          }
        }

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: LearningPlan = JSON.parse(saved);
          if (
            parsed &&
            parsed.weeks &&
            parsed.weeks.length > 0 &&
            Array.isArray(parsed.mistakeMemory)
          ) {
            if (mounted) {
              setPlan(parsed);
              setActiveDayNumberState(parsed.currentDayNumber || 5);
            }
            return;
          }
        }

        // If no local plan, fetch from server persistence endpoint
        const res = await fetch(
          "/api/learning-plan?email=aarav@deutschnova.ai"
        );
        if (res.ok) {
          const data = await res.json();
          if (data.learningPlan && mounted) {
            setPlan(data.learningPlan);
            setActiveDayNumberState(data.learningPlan.currentDayNumber || 5);
          }
        }
      } catch (err) {
        console.error("Failed to load learning plan:", err);
      } finally {
        if (mounted) setIsHydrated(true);
      }
    }
    initPlan();
    return () => {
      mounted = false;
    };
  }, []);

  // Persist whenever plan changes (both localStorage and server API)
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      fetch("/api/learning-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          email: plan.learnerEmail || "aarav@deutschnova.ai",
          plan,
        }),
      })
        .then((r) => {
          if (r.ok) setLastSyncedAt(new Date().toLocaleTimeString());
        })
        .catch(() => {
          // Offline fallback handled by localStorage
        });
    } catch (err) {
      console.error("Failed to save learning plan to storage:", err);
    }
  }, [plan, isHydrated]);

  const allDays = plan.weeks.flatMap((w) => w.days);
  const todayDay =
    allDays.find((d) => d.dayNumber === plan.currentDayNumber) || allDays[0];
  const activeDay =
    allDays.find((d) => d.dayNumber === activeDayNumber) || todayDay;

  const setActiveDayNumber = (dayNum: number) => {
    setActiveDayNumberState(dayNum);
    setActiveActivityId(null);
  };

  const computeFocusStatus = (
    accuracy: number,
    occurrences = 1
  ): FocusStatus => {
    if (occurrences >= 2 || accuracy < 70) return "Needs Practice";
    if (accuracy < 86) return "Improving";
    return "Strong";
  };

  const computeVocabStatus = (score: number): LearningStatus => {
    if (score < 50) return "New";
    if (score < 70) return "Learning";
    if (score < 85) return "Improving";
    return "Strong";
  };

  /**
   * Connects a real conversation or practice mistake to Personal Mistake Memory,
   * tracks recurrence & mastery (1 mistake = Improving, 2+ = Needs Practice, recovery -> Improving -> Mastered),
   * and generates the adaptive 3-minute Personal Review block + updates Real-World Readiness.
   */
  const recordLearnerMistake = (
    mistake: DetectedMistake,
    dayNumber: number
  ) => {
    setPlan((prev) => {
      const updatedMemory = upsertMistakeInMemory(
        prev.mistakeMemory,
        mistake,
        dayNumber
      );

      // If deduplicated (no change), return prev
      if (updatedMemory === prev.mistakeMemory) return prev;

      const updatedEntry = updatedMemory[0];
      const newOccurrences = updatedEntry?.occurrences || 1;

      // Also update grammarProgress for this category
      const grammarCatKey =
        mistake.category === "noun_gender" ||
        mistake.category === "article_gender"
          ? "articles"
          : mistake.category === "verb_position" ||
            mistake.category === "sentence_order"
          ? "word_order"
          : mistake.category;
      const existingGrammar = prev.grammarProgress[grammarCatKey];
      const updatedGrammarProgress = { ...prev.grammarProgress };

      if (existingGrammar) {
        const attempts = existingGrammar.attempts + 1;
        const mistakes = existingGrammar.mistakes + 1;
        const newAcc = Math.max(
          45,
          Math.round(((attempts - mistakes) / attempts) * 100)
        );
        const focusStatus = computeFocusStatus(newAcc, newOccurrences);

        updatedGrammarProgress[grammarCatKey] = {
          ...existingGrammar,
          attempts,
          mistakes,
          accuracy: newAcc,
          isWeakArea: newOccurrences >= 2 || newAcc < 72,
          focusStatus,
          recommendedAction:
            newOccurrences >= 2
              ? `Recurring pattern (${newOccurrences}x): Complete "PERSONAL REVIEW – 3 MINUTES" (${mistake.word} → ${mistake.correctUsage}).`
              : `Noted once ("${mistake.learnerUsage}" → "${mistake.correctUsage}"). Keep practicing in context.`,
          lastPracticedAt: new Date().toISOString(),
        };
      }

      // Inject adaptive drill into current and next day's Daily Review if recurring
      const drillToInject =
        mistake.category === "accusative_case"
          ? ADAPTIVE_ACCUSATIVE_DRILLS[0]
          : mistake.category === "dative_case"
          ? ADAPTIVE_DATIVE_DRILLS[0]
          : ADAPTIVE_ARTICLE_DRILLS[0];

      const updatedWeeks = prev.weeks.map((w) => ({
        ...w,
        days: w.days.map((d) => {
          if (d.dayNumber === dayNumber || d.dayNumber === dayNumber + 1) {
            const hasDrill = d.dailyQuiz.some((q) => q.id === drillToInject.id);
            if (!hasDrill) {
              return {
                ...d,
                dailyQuiz: [drillToInject, ...d.dailyQuiz],
              };
            }
          }
          return d;
        }),
      }));

      const allUpdatedDays = updatedWeeks.flatMap((w) => w.days);

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        weeks: updatedWeeks,
        mistakeMemory: updatedMemory,
        grammarProgress: updatedGrammarProgress,
        personalReview: buildPersonalReviewFromMistakes(updatedMemory),
        realWorldReadiness: buildRealWorldReadinessList(
          allUpdatedDays,
          updatedMemory,
          prev.lastMissionFeedback
        ),
      };
    });
  };

  /**
   * Records correct usage of grammatical categories so learners recover from
   * "Needs Practice" -> "Improving" -> "Mastered".
   */
  const recordCorrectStructuresUsage = (categories: MistakeCategory[]) => {
    if (!categories || categories.length === 0) return;
    setPlan((prev) => {
      const updatedMemory = recordCorrectStructuresInMemory(
        prev.mistakeMemory,
        categories
      );
      const allDaysList = prev.weeks.flatMap((w) => w.days);
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        mistakeMemory: updatedMemory,
        personalReview: buildPersonalReviewFromMistakes(updatedMemory),
        realWorldReadiness: buildRealWorldReadinessList(
          allDaysList,
          updatedMemory,
          prev.lastMissionFeedback
        ),
      };
    });
  };

  const saveMissionFeedback = (feedback: MissionCompletionFeedback) => {
    setPlan((prev) => {
      const updatedFeedbackMap = {
        ...(prev.lastMissionFeedback || {}),
        [feedback.dayNumber]: feedback,
      };

      // Update Real-World Readiness based on actual mission evidence
      const allUpdatedDays = prev.weeks.flatMap((w) => w.days);
      const baseReadiness =
        prev.realWorldReadiness || buildRealWorldReadinessList(allUpdatedDays);

      const updatedReadiness = baseReadiness.map((item) => {
        if (item.dayNumber !== feedback.dayNumber) return item;
        const targetDay = allUpdatedDays.find(
          (d) => d.dayNumber === feedback.dayNumber
        );
        const completedSteps =
          targetDay?.activities.filter((a) => a.completed).length || 0;
        const unresolvedCount = feedback.importantCorrections.length;

        // Evidence-based status rule:
        // If recurring mistakes occurred during the mission and aren't resolved yet -> "Practice Needed"
        // If core learning steps + mission completed with accuracy -> "Ready"
        let nextStatus: "Not Started" | "Learning" | "Practice Needed" | "Ready" =
          "Learning";
        let summary = "";

        if (unresolvedCount >= 2) {
          nextStatus = "Practice Needed";
          summary = `Mission completed in ${
            feedback.mode === "coach" ? "Coach Mode" : "Real-Life Mode"
          }, but ${unresolvedCount} grammar/article corrections were needed (${feedback.importantCorrections
            .map((c) => `${c.word} → ${c.correctUsage}`)
            .join(", ")}). Complete the 3-minute Personal Review to reach Ready.`;
        } else if (completedSteps >= 4) {
          nextStatus = "Ready";
          summary = `Verified Ready: Completed Day ${
            feedback.dayNumber
          } learning steps and successfully ordered in ${
            feedback.mode === "coach" ? "Coach Mode" : "Real-Life Mode"
          } using ${feedback.newWordsUsed.map((w) => w.german).join(", ") || "authentic German phrases"}.`;
        } else {
          nextStatus = "Learning";
          summary = `Completed the conversation mission (${completedSteps}/8 daily steps done). Complete Vocabulary, Grammar, and Daily Review to lock in Ready status.`;
        }

        return {
          ...item,
          status: nextStatus,
          evidenceSummary: summary,
          missionCompleted: true,
          missionModeUsed: feedback.mode,
          unresolvedMistakesCount: unresolvedCount,
          lastUpdatedAt: new Date().toISOString(),
        };
      });

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        lastMissionFeedback: updatedFeedbackMap,
        realWorldReadiness: updatedReadiness,
      };
    });
  };

  const completePersonalReview = () => {
    setPlan((prev) => {
      if (!prev.personalReview) return prev;
      const cat = prev.personalReview.sourceCategory;
      const updatedMemory = prev.mistakeMemory.map((m) => {
        if (m.category !== cat) return m;
        const nextStatus: FocusStatus =
          m.status === "Needs Practice" ? "Improving" : "Mastered";
        return {
          ...m,
          correctCountAfterMistake: (m.correctCountAfterMistake || 0) + 2,
          status: nextStatus,
          lastObservedAt: new Date().toISOString(),
        };
      });

      const updatedGrammar = { ...prev.grammarProgress };
      if (updatedGrammar[cat]) {
        updatedGrammar[cat] = {
          ...updatedGrammar[cat],
          accuracy: Math.min(100, updatedGrammar[cat].accuracy + 10),
          focusStatus: "Improving",
          isWeakArea: false,
          recommendedAction:
            "Personal Review completed! Your accuracy with this structure has improved.",
          lastPracticedAt: new Date().toISOString(),
        };
      }

      const allDaysList = prev.weeks.flatMap((w) => w.days);
      const updatedReadiness = buildRealWorldReadinessList(
        allDaysList,
        updatedMemory,
        prev.lastMissionFeedback
      );

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        personalReview: {
          ...prev.personalReview,
          completed: true,
        },
        mistakeMemory: updatedMemory,
        grammarProgress: updatedGrammar,
        realWorldReadiness: updatedReadiness,
        userProgress: {
          ...prev.userProgress,
          totalXp: prev.userProgress.totalXp + 35,
          grammarAccuracy: Math.min(100, prev.userProgress.grammarAccuracy + 3),
        },
      };
    });
  };

  const recordGrammarAttempt = (categoryId: string, isCorrect: boolean) => {
    setPlan((prev) => {
      const existing = prev.grammarProgress[categoryId];
      if (!existing) return prev;

      const attempts = existing.attempts + 1;
      const mistakes = existing.mistakes + (isCorrect ? 0 : 1);
      const newAccuracy = Math.max(
        35,
        Math.min(100, Math.round(((attempts - mistakes) / attempts) * 100))
      );
      const isWeakArea = newAccuracy < 75;
      const focusStatus = computeFocusStatus(newAccuracy, isCorrect ? 1 : 2);

      const updatedGrammarProgress = {
        ...prev.grammarProgress,
        [categoryId]: {
          ...existing,
          attempts,
          mistakes,
          accuracy: newAccuracy,
          isWeakArea,
          focusStatus,
          recommendedAction:
            focusStatus === "Needs Practice"
              ? `Adaptive Revision Active: Extra ${existing.title
                  .split("(")[0]
                  .trim()} exercises scheduled in your Personal Review.`
              : focusStatus === "Improving"
              ? `Improving steadily! Keep practicing ${existing.title
                  .split("(")[0]
                  .trim()} in context.`
              : "Strong mastery! Keep reinforcing in real-life missions.",
          lastPracticedAt: new Date().toISOString(),
        },
      };

      const weakAreasList = Object.values(updatedGrammarProgress)
        .filter((g) => g.isWeakArea)
        .map((g) => g.title.split("(")[0].trim());

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        grammarProgress: updatedGrammarProgress,
        userProgress: {
          ...prev.userProgress,
          grammarAccuracy: isCorrect
            ? Math.min(100, prev.userProgress.grammarAccuracy + 1)
            : Math.max(40, prev.userProgress.grammarAccuracy - 2),
          weakAreas:
            weakAreasList.length > 0
              ? weakAreasList
              : prev.userProgress.weakAreas,
        },
      };
    });
  };

  const recordVocabularyAttempt = (wordId: string, isCorrect: boolean) => {
    setPlan((prev) => {
      const allVocab = prev.weeks
        .flatMap((w) => w.days)
        .flatMap((d) => d.vocabulary);
      const vocabItem = allVocab.find((v) => v.id === wordId);
      const existing = prev.vocabularyProgress[wordId];

      const currentScore = existing ? existing.masteryScore : 65;
      const newScore = isCorrect
        ? Math.min(100, currentScore + 18)
        : Math.max(25, currentScore - 20);
      const needsReview = newScore < 72;

      const updatedVocabProgress = {
        ...prev.vocabularyProgress,
        [wordId]: {
          wordId,
          word: vocabItem?.word || existing?.word || wordId,
          article: vocabItem?.article || existing?.article || "",
          plural: vocabItem?.plural || existing?.plural || "",
          english: vocabItem?.english || existing?.english || "",
          theme: vocabItem?.theme || existing?.theme || "A1",
          masteryScore: newScore,
          correctCount: (existing?.correctCount || 0) + (isCorrect ? 1 : 0),
          mistakeCount: (existing?.mistakeCount || 0) + (isCorrect ? 0 : 1),
          needsReview,
          status: computeVocabStatus(newScore),
          lastPracticedAt: new Date().toISOString(),
        },
      };

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        vocabularyProgress: updatedVocabProgress,
        userProgress: {
          ...prev.userProgress,
          vocabularyAccuracy: isCorrect
            ? Math.min(100, prev.userProgress.vocabularyAccuracy + 1)
            : Math.max(45, prev.userProgress.vocabularyAccuracy - 2),
        },
      };
    });
  };

  const resolveMistakeMemoryItem = (mistakeId: string) => {
    setPlan((prev) => {
      const updatedMemory = prev.mistakeMemory.map((m) => {
        if (m.id !== mistakeId) return m;
        const nextStatus: FocusStatus =
          m.status === "Needs Practice" ? "Improving" : "Mastered";
        return {
          ...m,
          correctCountAfterMistake: (m.correctCountAfterMistake || 0) + 1,
          status: nextStatus,
          lastObservedAt: new Date().toISOString(),
        };
      });
      const allDaysList = prev.weeks.flatMap((w) => w.days);
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        mistakeMemory: updatedMemory,
        personalReview: buildPersonalReviewFromMistakes(updatedMemory),
        realWorldReadiness: buildRealWorldReadinessList(
          allDaysList,
          updatedMemory,
          prev.lastMissionFeedback
        ),
      };
    });
  };

  const completeActivity = ({
    dayNumber,
    activityId,
    score = 92,
    speakingScore,
    grammarMistakeCategories = [],
  }: CompleteActivityPayload) => {
    let justFinishedAllDayActivities = false;

    setPlan((prev) => {
      let xpAwarded = 0;
      let minutesAwarded = 0;
      let activityTypeCompleted = "";

      const updatedWeeks = prev.weeks.map((week) => {
        const updatedDays = week.days.map((day) => {
          if (day.dayNumber !== dayNumber) {
            if (
              day.dayNumber === dayNumber + 1 &&
              grammarMistakeCategories.length > 0
            ) {
              const needsAccusative =
                grammarMistakeCategories.includes("accusative_case");
              const needsDative =
                grammarMistakeCategories.includes("dative_case");
              const needsSeparable =
                grammarMistakeCategories.includes("separable_verbs");
              const drillToAdd = needsAccusative
                ? ADAPTIVE_ACCUSATIVE_DRILLS[0]
                : needsDative
                ? ADAPTIVE_DATIVE_DRILLS[0]
                : needsSeparable
                ? ADAPTIVE_SEPARABLE_VERB_DRILLS[0]
                : ADAPTIVE_ARTICLE_DRILLS[0];
              const alreadyHas = day.dailyQuiz.some(
                (q) => q.id === drillToAdd.id
              );
              if (!alreadyHas) {
                return {
                  ...day,
                  dailyQuiz: [...day.dailyQuiz, drillToAdd],
                };
              }
            }
            return day;
          }

          const updatedActivities = day.activities.map((act) => {
            if (act.id === activityId) {
              if (!act.completed) {
                xpAwarded = act.xpReward;
                minutesAwarded = act.estimatedMinutes;
              }
              activityTypeCompleted = act.type;
              return {
                ...act,
                completed: true,
                score: score ?? act.score ?? 92,
              };
            }
            return act;
          });

          const allCompleted = updatedActivities.every((a) => a.completed);
          const wasAlreadyAllCompleted = day.activities.every(
            (a) => a.completed
          );
          if (allCompleted && !wasAlreadyAllCompleted) {
            justFinishedAllDayActivities = true;
          }

          return {
            ...day,
            activities: updatedActivities,
            earnedXp: (day.earnedXp || 0) + xpAwarded,
            quizScore:
              activityTypeCompleted === "daily_quiz"
                ? score
                : day.quizScore ?? (allCompleted ? 92 : undefined),
            speakingScore:
              speakingScore ??
              (activityTypeCompleted === "speaking"
                ? score
                : day.speakingScore ?? (allCompleted ? 88 : undefined)),
          };
        });

        return {
          ...week,
          days: updatedDays,
        };
      });

      const allUpdatedDays = updatedWeeks.flatMap((w) => w.days);
      const targetDay = allUpdatedDays.find((d) => d.dayNumber === dayNumber);
      const updatedVocabProgress = { ...prev.vocabularyProgress };

      if (targetDay && activityTypeCompleted === "vocabulary") {
        targetDay.vocabulary.forEach((v) => {
          const existing = updatedVocabProgress[v.id];
          updatedVocabProgress[v.id] = {
            wordId: v.id,
            word: v.word,
            article: v.article,
            plural: v.plural,
            english: v.english,
            theme: v.theme,
            masteryScore: Math.max(existing?.masteryScore || 0, 88),
            correctCount: (existing?.correctCount || 0) + 1,
            mistakeCount: existing?.mistakeCount || 0,
            needsReview: false,
            status: "Strong",
            lastPracticedAt: new Date().toISOString(),
          };
        });
      }

      // Recompute Real-World Readiness from updated day activities while preserving any Practice Needed mission overrides
      const freshReadiness = buildRealWorldReadinessList(allUpdatedDays).map(
        (item) => {
          const prevItem = (prev.realWorldReadiness || []).find(
            (p) => p.dayNumber === item.dayNumber
          );
          if (
            prevItem &&
            prevItem.status === "Practice Needed" &&
            !prev.personalReview?.completed
          ) {
            return prevItem;
          }
          return item;
        }
      );

      const newXpToday = prev.streak.xpEarnedToday + xpAwarded;
      const updatedWeeklyActivity = prev.streak.weeklyActivity.map(
        (item, idx) =>
          idx === 4
            ? {
                ...item,
                completed: true,
                xp: item.xp + xpAwarded,
              }
            : item
      );

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        weeks: updatedWeeks,
        vocabularyProgress: updatedVocabProgress,
        realWorldReadiness: freshReadiness,
        userProgress: {
          ...prev.userProgress,
          totalXp: prev.userProgress.totalXp + xpAwarded,
          wordsLearnedCount:
            activityTypeCompleted === "vocabulary" && xpAwarded > 0
              ? prev.userProgress.wordsLearnedCount +
                (targetDay?.vocabulary.length || 6)
              : prev.userProgress.wordsLearnedCount,
          grammarConceptsCount:
            activityTypeCompleted === "grammar" && xpAwarded > 0
              ? prev.userProgress.grammarConceptsCount + 1
              : prev.userProgress.grammarConceptsCount,
          quizAccuracy:
            activityTypeCompleted === "daily_quiz"
              ? Math.round((prev.userProgress.quizAccuracy + score) / 2)
              : prev.userProgress.quizAccuracy,
          speakingAccuracy:
            activityTypeCompleted === "speaking"
              ? Math.round((prev.userProgress.speakingAccuracy + score) / 2)
              : prev.userProgress.speakingAccuracy,
        },
        speakingProgress:
          activityTypeCompleted === "speaking"
            ? {
                ...prev.speakingProgress,
                overallScore: Math.round(
                  (prev.speakingProgress.overallScore + score) / 2
                ),
                pronunciationScore: Math.round(
                  (prev.speakingProgress.pronunciationScore + score) / 2
                ),
                phrasesPracticed: prev.speakingProgress.phrasesPracticed + 2,
              }
            : prev.speakingProgress,
        streak: {
          ...prev.streak,
          xpEarnedToday: newXpToday,
          minutesStudiedToday:
            prev.streak.minutesStudiedToday + minutesAwarded,
          weeklyActivity: updatedWeeklyActivity,
        },
      };
    });

    if (justFinishedAllDayActivities) {
      setShowDayCompleteModal(true);
    }
  };

  const advanceToNextDay = () => {
    const nextDayNum = Math.min(21, plan.currentDayNumber + 1);
    setPlan((prev) => {
      const nextNum = Math.min(21, prev.currentDayNumber + 1);
      const updatedWeeks = prev.weeks.map((week) => {
        const updatedDays = week.days.map((day) => {
          if (day.dayNumber < nextNum) {
            return {
              ...day,
              state: "completed" as const,
              completedAt: day.completedAt || new Date().toISOString(),
              activities: day.activities.map((a) => ({
                ...a,
                completed: true,
                score: a.score ?? 92,
              })),
            };
          }
          if (day.dayNumber === nextNum) {
            return {
              ...day,
              state: "today" as const,
            };
          }
          if (day.dayNumber === nextNum + 1) {
            return {
              ...day,
              state: "available" as const,
            };
          }
          return day;
        });
        return {
          ...week,
          days: updatedDays,
          isCompleted: updatedDays.every((d) => d.state === "completed"),
        };
      });

      const allUpdatedDays = updatedWeeks.flatMap((w) => w.days);
      const newStreak = prev.streak.currentStreak + 1;
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        currentDayNumber: nextNum,
        weeks: updatedWeeks,
        realWorldReadiness: buildRealWorldReadinessList(allUpdatedDays),
        userProgress: {
          ...prev.userProgress,
          currentDay: nextNum,
          currentWeek: Math.ceil(nextNum / 7),
          lessonsCompletedCount: prev.userProgress.lessonsCompletedCount + 1,
        },
        streak: {
          ...prev.streak,
          currentStreak: newStreak,
          longestStreak: Math.max(prev.streak.longestStreak, newStreak),
        },
      };
    });

    setActiveDayNumberState(nextDayNum);
    setActiveActivityId(null);
    setShowDayCompleteModal(false);
  };

  const reconfigurePlan = (payload: OnboardingPayload) => {
    const freshPlan = createPersonalizedLearningPlan({
      learnerName: payload.learnerName,
      learnerEmail:
        payload.learnerEmail || plan.learnerEmail || "aarav@deutschnova.ai",
      level: payload.level,
      learningGoal: payload.learningGoal,
      dailyTargetMinutes: payload.dailyTargetMinutes,
      startAtDay: payload.startAtDay ?? 5,
      todayCompletedActivitiesCount:
        payload.todayCompletedActivitiesCount ?? 0,
    });
    setPlan(freshPlan);
    setActiveDayNumberState(freshPlan.currentDayNumber);
    setActiveActivityId(null);
    setShowOnboardingModal(false);
    setShowDayCompleteModal(false);
  };

  const unlockAllDaysForPreview = () => {
    setPlan((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => ({
        ...w,
        days: w.days.map((d) => ({
          ...d,
          state: d.state === "locked" ? ("available" as const) : d.state,
        })),
      })),
    }));
  };

  const loginUser = async (email: string, name?: string) => {
    const normalizedEmail = email.trim().toLowerCase() || "aarav@deutschnova.ai";
    try {
      const res = await fetch("/api/learning-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email: normalizedEmail,
          name: name || "Aarav",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.learningPlan) {
          setPlan(data.learningPlan);
          setActiveDayNumberState(data.learningPlan.currentDayNumber || 5);
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(data.learningPlan)
          );
        }
      }
    } catch (err) {
      console.error("Login sync error:", err);
    } finally {
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify({ email: normalizedEmail, loggedOut: false })
      );
      setIsLoggedIn(true);
    }
  };

  const logoutUser = () => {
    // Save current plan to server before clearing localStorage
    fetch("/api/learning-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        email: plan.learnerEmail || "aarav@deutschnova.ai",
        plan,
      }),
    }).catch(() => {});

    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(AUTH_KEY, JSON.stringify({ loggedOut: true }));
    setIsLoggedIn(false);
  };

  return (
    <LearningContext.Provider
      value={{
        plan,
        isHydrated,
        isLoggedIn,
        lastSyncedAt,
        activeDayNumber,
        activeDay,
        todayDay,
        activeActivityId,
        showDayCompleteModal,
        showOnboardingModal,
        setActiveDayNumber,
        setActiveActivityId,
        setShowDayCompleteModal,
        setShowOnboardingModal,
        completeActivity,
        advanceToNextDay,
        recordGrammarAttempt,
        recordVocabularyAttempt,
        recordLearnerMistake,
        recordCorrectStructuresUsage,
        saveMissionFeedback,
        completePersonalReview,
        resolveMistakeMemoryItem,
        reconfigurePlan,
        unlockAllDaysForPreview,
        loginUser,
        logoutUser,
      }}
    >
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const ctx = useContext(LearningContext);
  if (!ctx) {
    throw new Error("useLearning must be used within a LearningProvider");
  }
  return ctx;
}
