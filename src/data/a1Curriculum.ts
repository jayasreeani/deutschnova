import {
  CEFRLevel,
  GrammarProgress,
  LearningDay,
  LearningGoalType,
  LearningPlan,
  LearningWeek,
  LessonActivity,
  MistakeMemoryEntry,
  MissionCompletionFeedback,
  PersonalReviewBlock,
  QuizQuestion,
  RealWorldReadinessItem,
  VocabularyProgress,
} from "../types/learning";
import {
  evaluateRealWorldReadiness,
  generatePersonalizedReviewBlock,
} from "../lib/germanTutorEngine";
import { A1_WEEK_1_DAYS } from "./a1Week1";
import { A1_WEEK_2_DAYS } from "./a1Week2";
import { A1_WEEK_3_DAYS } from "./a1Week3";

export const ALL_A1_RAW_DAYS = [
  ...A1_WEEK_1_DAYS,
  ...A1_WEEK_2_DAYS,
  ...A1_WEEK_3_DAYS,
];

export const ADAPTIVE_ACCUSATIVE_DRILLS: QuizQuestion[] = [
  {
    id: "adapt-acc-kaffee-1",
    type: "grammar",
    skillCategory: "accusative_case",
    question:
      "[Personal Review: Masculine Accusative] Complete: 'Ich möchte ___ Kaffee und ___ Kuchen, bitte.' (der Kaffee, der Kuchen)",
    germanContext:
      "Recorded from your Restaurant Mission: masculine 'der' becomes 'einen' when ordering.",
    options: ["einen / einen", "eine / eine", "ein / ein", "der / der"],
    correctAnswer: "einen / einen",
    explanation:
      "Both 'der Kaffee' and 'der Kuchen' are masculine nouns. After 'Ich möchte...', they take 'einen': einen Kaffee, einen Kuchen.",
    isAdaptiveReview: true,
    whyWrong: {
      learnerMistakeExample: "Ich möchte eine Kaffee.",
      correctSentence: "Ich möchte einen Kaffee.",
      ruleHeadline:
        "Masculine nouns ('der') require 'einen' as the direct object!",
      stepByStepBreakdown: [
        "der Kaffee → einen Kaffee",
        "der Kuchen → einen Kuchen",
        "der Apfel → einen Apfel",
      ],
      followUpQuestion: {
        prompt: "Try now: 'Ich esse gern ___ Apfel (der Apfel).'",
        options: ["einen", "eine", "ein"],
        correctAnswer: "einen",
        successMessage: "Perfekt! 'der Apfel' → 'einen Apfel'.",
      },
    },
  },
];

export const ADAPTIVE_DATIVE_DRILLS: QuizQuestion[] = [
  {
    id: "adapt-dat-1",
    type: "grammar",
    skillCategory: "dative_case",
    question:
      "[Adaptive Dative Revision] Complete: 'Ich gehe mit ___ Freundin in die Bibliothek.'",
    germanContext:
      '"mit" always requires the dative case (die → der, meine → meiner).',
    options: ["meiner", "meine", "meinen", "mein"],
    correctAnswer: "meiner",
    explanation:
      "'mit' requires the dative case: die Freundin → mit der Freundin | meine Freundin → mit meiner Freundin.",
    isAdaptiveReview: true,
    whyWrong: {
      learnerMistakeExample: "Ich gehe mit meine Freundin.",
      correctSentence: "Ich gehe mit meiner Freundin.",
      ruleHeadline: '"mit" requires the dative case!',
      stepByStepBreakdown: [
        "die Freundin → mit der Freundin",
        "meine Freundin → mit meiner Freundin",
      ],
      followUpQuestion: {
        prompt:
          "Immediate Application: 'Ich spreche mit ___ Schwester (die Schwester).'",
        options: ["meiner", "meine", "meinen"],
        correctAnswer: "meiner",
        successMessage: "Perfekt! 'die Schwester' → 'mit meiner Schwester'.",
      },
    },
  },
  {
    id: "adapt-dat-2",
    type: "grammar",
    skillCategory: "dative_case",
    question:
      "[Adaptive Dative Revision] Complete: 'Wie komme ich ___ Bahnhof und ___ Universität?'",
    germanContext: "zu + dem = zum (masc./neut.) | zu + der = zur (feminine).",
    options: ["zum / zur", "zur / zum", "in / nach", "mit / für"],
    correctAnswer: "zum / zur",
    explanation:
      "'der Bahnhof' becomes 'zum Bahnhof' and 'die Universität' becomes 'zur Universität'.",
    isAdaptiveReview: true,
  },
];

export const ADAPTIVE_ARTICLE_DRILLS: QuizQuestion[] = [
  {
    id: "adapt-art-1",
    type: "article",
    skillCategory: "articles",
    question:
      "[Adaptive Gender Revision] Choose the correct article & plural for 'table' (Tisch):",
    germanContext: "Always learn German nouns with their article and plural!",
    options: [
      "der Tisch (Plural: die Tische)",
      "das Tisch (Plural: die Tischer)",
      "die Tisch (Plural: die Tische)",
      "den Tisch (Plural: der Tische)",
    ],
    correctAnswer: "der Tisch (Plural: die Tische)",
    explanation:
      "'der Tisch' is masculine and forms its plural as 'die Tische'.",
    isAdaptiveReview: true,
  },
  {
    id: "adapt-art-2",
    type: "article",
    skillCategory: "accusative_case",
    question:
      "[Adaptive Accusative Revision] Complete: 'Ich hätte gern ___ Kaffee und ___ Brötchen, bitte.'",
    germanContext:
      "Direct object after 'Ich hätte gern': masculine changes to 'einen'.",
    options: ["einen / ein", "ein / einen", "eine / ein", "der / das"],
    correctAnswer: "einen / ein",
    explanation:
      "'der Kaffee' becomes 'einen Kaffee' in the accusative case; 'das Brötchen' stays 'ein Brötchen'.",
    isAdaptiveReview: true,
  },
];

export const ADAPTIVE_SEPARABLE_VERB_DRILLS: QuizQuestion[] = [
  {
    id: "adapt-sep-1",
    type: "grammar",
    skillCategory: "separable_verbs",
    question:
      "[Adaptive Revision: Separable Verbs] Complete: 'Wann ___ der Zug nach Salzburg ___?' (abfahren)",
    options: [
      "fährt ... ab",
      "abfährt ... —",
      "fahren ... ab",
      "fährst ... an",
    ],
    correctAnswer: "fährt ... ab",
    explanation:
      "'abfahren' splits in present-tense main clauses: 'fährt' in Position 2, 'ab' at the end.",
    isAdaptiveReview: true,
  },
];

export const INITIAL_MISTAKE_MEMORY: MistakeMemoryEntry[] = [
  {
    id: "mm-acc-1",
    category: "accusative_case",
    categoryLabel: "Accusative / Masculine Noun",
    word: "der Kaffee",
    learnerUsage: "eine Kaffee",
    correctUsage: "einen Kaffee",
    status: "Improving",
    learnerInput: "Ich möchte eine Kaffee.",
    correctGerman: "Ich möchte einen Kaffee.",
    whyExplanation:
      '"der Kaffee" is a masculine noun. When ordering or buying something (direct object), masculine "der / ein" changes to "den / einen".',
    transformationSteps: [
      "der Kaffee → einen Kaffee",
      "der Kuchen → einen Kuchen",
      "der Apfel → einen Apfel",
    ],
    occurrences: 1,
    lastSeenDay: 5,
    followUpQuestion: {
      prompt: "Complete: 'Ich möchte bitte ___ Kaffee und ___ Salat.'",
      options: ["einen / einen", "eine / eine", "ein / ein"],
      correctAnswer: "einen / einen",
      explanation:
        "Both 'der Kaffee' and 'der Salat' are masculine → 'einen Kaffee' and 'einen Salat'.",
    },
  },
  {
    id: "mm-dative-1",
    category: "dative_case",
    categoryLabel: "Dative Case (mit + Dativ)",
    word: "die Freundin",
    learnerUsage: "mit meine Freundin",
    correctUsage: "mit meiner Freundin",
    status: "Needs Practice",
    learnerInput: "Ich gehe mit meine Freundin.",
    correctGerman: "Ich gehe mit meiner Freundin.",
    whyExplanation: '"mit" requires the dative case.',
    transformationSteps: [
      "die Freundin → mit der Freundin",
      "meine Freundin → mit meiner Freundin",
    ],
    occurrences: 2,
    lastSeenDay: 4,
    followUpQuestion: {
      prompt: "Complete: 'Ich lerne heute mit ___ Freundin in der Bibliothek.'",
      options: ["meiner", "meine", "meinen"],
      correctAnswer: "meiner",
      explanation:
        "After 'mit', feminine 'meine' always takes '-er': mit meiner Freundin.",
    },
  },
  {
    id: "mm-gender-1",
    category: "noun_gender",
    categoryLabel: "Noun Gender (der / die / das)",
    word: "der Tisch / die Rechnung",
    learnerUsage: "das Tisch / der Rechnung",
    correctUsage: "der Tisch / die Rechnung",
    status: "Improving",
    learnerInput: "das Tisch / der Rechnung",
    correctGerman:
      "der Tisch (Plural: die Tische) / die Rechnung (Plural: die Rechnungen)",
    whyExplanation:
      "Always learn German nouns with their article and plural. Nouns ending in '-ung' are 100% feminine ('die').",
    transformationSteps: [
      "der Tisch → Plural: die Tische (table)",
      "die Rechnung → Plural: die Rechnungen (-ung is always 'die'!)",
    ],
    occurrences: 1,
    lastSeenDay: 5,
    followUpQuestion: {
      prompt: "Which article belongs to '___ Rechnung, bitte' (the bill)?",
      options: ["Die", "Der", "Das"],
      correctAnswer: "Die",
      explanation:
        "All nouns ending in '-ung' are feminine: die Rechnung, die Vorlesung.",
    },
  },
];

export function buildPersonalReviewFromMistakes(
  mistakeMemory: MistakeMemoryEntry[]
): PersonalReviewBlock {
  return generatePersonalizedReviewBlock(mistakeMemory);
}

export function buildRealWorldReadinessList(
  days: LearningDay[],
  mistakeMemory: MistakeMemoryEntry[] = [],
  lastMissionFeedback: Record<number, MissionCompletionFeedback> = {}
): RealWorldReadinessItem[] {
  return evaluateRealWorldReadiness(days, mistakeMemory, lastMissionFeedback);
}

export function buildActivitiesForDay(
  rawDay: Omit<LearningDay, "state" | "activities">,
  isCompleted: boolean,
  isTodayPrecompletedCount = 0,
  weakAreas: string[] = []
): LessonActivity[] {
  const missionTitle =
    rawDay.missionBriefing?.missionTitle || `Mission: ${rawDay.goalTitle}`;

  // Consistent 8-step daily flow:
  // 1. Today's Mission, 2. Vocabulary, 3. Grammar, 4. Listen, 5. Practice, 6. Speak, 7. Real-Life Mission, 8. Daily Review
  const baseActivities: Omit<LessonActivity, "completed" | "score">[] = [
    {
      id: `act-d${rawDay.dayNumber}-1`,
      dayNumber: rawDay.dayNumber,
      order: 1,
      type: "todays_mission",
      title: "Today's Mission",
      subtitle: missionTitle,
      estimatedMinutes: 1,
      xpReward: 15,
    },
    {
      id: `act-d${rawDay.dayNumber}-2`,
      dayNumber: rawDay.dayNumber,
      order: 2,
      type: "vocabulary",
      title: "Vocabulary",
      subtitle: `${rawDay.vocabulary.length} expressions & nouns with articles/plurals`,
      estimatedMinutes: 3,
      xpReward: 20,
    },
    {
      id: `act-d${rawDay.dayNumber}-3`,
      dayNumber: rawDay.dayNumber,
      order: 3,
      type: "grammar",
      title: "Grammar",
      subtitle: rawDay.grammar.title,
      estimatedMinutes: 3,
      xpReward: 20,
    },
    {
      id: `act-d${rawDay.dayNumber}-4`,
      dayNumber: rawDay.dayNumber,
      order: 4,
      type: "listening",
      title: "Listening",
      subtitle: rawDay.listening.title,
      estimatedMinutes: 2,
      xpReward: 20,
    },
    {
      id: `act-d${rawDay.dayNumber}-5`,
      dayNumber: rawDay.dayNumber,
      order: 5,
      type: "sentence_building",
      title: "Practice",
      subtitle: "Sentence construction & 'Why was I wrong?' coaching",
      estimatedMinutes: 2,
      xpReward: 20,
    },
    {
      id: `act-d${rawDay.dayNumber}-6`,
      dayNumber: rawDay.dayNumber,
      order: 6,
      type: "speaking",
      title: "Speaking",
      subtitle: "Pronunciation & spoken real-life confidence",
      estimatedMinutes: 2,
      xpReward: 25,
    },
    {
      id: `act-d${rawDay.dayNumber}-7`,
      dayNumber: rawDay.dayNumber,
      order: 7,
      type: "ai_conversation",
      title: "Real-Life Mission",
      subtitle: rawDay.aiConversation.title,
      estimatedMinutes: 3,
      xpReward: 30,
    },
    {
      id: `act-d${rawDay.dayNumber}-8`,
      dayNumber: rawDay.dayNumber,
      order: 8,
      type: "daily_quiz",
      title: "Daily Review",
      subtitle:
        weakAreas.length > 0
          ? `End-of-day review + Adaptive ${weakAreas[0]} booster`
          : "Short end-of-day readiness check",
      estimatedMinutes: 2,
      xpReward: 25,
      isAdaptiveBooster: weakAreas.length > 0,
      adaptiveReason:
        weakAreas.length > 0
          ? `Includes personalized revision for: ${weakAreas.slice(0, 2).join(", ")}`
          : undefined,
    },
  ];

  return baseActivities.map((act, idx) => {
    const completed = isCompleted || idx < isTodayPrecompletedCount;
    return {
      ...act,
      completed,
      score: completed ? (idx % 2 === 0 ? 94 : 90) : undefined,
    };
  });
}

export function createPersonalizedLearningPlan(options?: {
  learnerName?: string;
  learnerEmail?: string;
  level?: CEFRLevel;
  learningGoal?: LearningGoalType;
  dailyTargetMinutes?: number;
  startAtDay?: number;
  todayCompletedActivitiesCount?: number;
}): LearningPlan {
  const learnerName = options?.learnerName || "Aarav";
  const learnerEmail = options?.learnerEmail || "aarav@deutschnova.ai";
  const level = options?.level || "A1";
  const learningGoal = options?.learningGoal || "daily_life";
  const dailyTargetMinutes = options?.dailyTargetMinutes || 15;
  // Default to Day 5 of Week 1 ("ORDER FOOD AT A RESTAURANT") so the primary end-to-end validation journey starts immediately on Day 5!
  const currentDayNumber = options?.startAtDay ?? 5;
  const todayPrecompleted = options?.todayCompletedActivitiesCount ?? 0;

  const weakAreas = [
    "Accusative Case (der Kaffee → einen Kaffee)",
    "Dative Case (mit meiner Freundin)",
    "Noun Gender (der/die/das)",
  ];

  const daysWithState: LearningDay[] = ALL_A1_RAW_DAYS.map((rawDay) => {
    const isCompleted = rawDay.dayNumber < currentDayNumber;
    const isToday = rawDay.dayNumber === currentDayNumber;
    const isAvailable =
      rawDay.dayNumber <= 7 || rawDay.dayNumber === currentDayNumber + 1;

    const state = isCompleted
      ? "completed"
      : isToday
      ? "today"
      : isAvailable
      ? "available"
      : "locked";

    let enrichedQuiz = [...rawDay.dailyQuiz];
    if (rawDay.dayNumber >= currentDayNumber) {
      const hasAdaptive = enrichedQuiz.some((q) => q.isAdaptiveReview);
      if (!hasAdaptive) {
        enrichedQuiz = [
          ...enrichedQuiz,
          ADAPTIVE_ACCUSATIVE_DRILLS[0],
          ADAPTIVE_DATIVE_DRILLS[
            rawDay.dayNumber % ADAPTIVE_DATIVE_DRILLS.length
          ],
        ];
      }
    }

    const missionBriefing = rawDay.missionBriefing || {
      missionTitle: `Mission: Master ${rawDay.goalTitle} in Real Life`,
      locationBadge: "📍 Everyday Life in Austria & Germany",
      realLifeGoal: rawDay.description,
      whatYouWillBeAbleToDo: [
        `Use ${rawDay.vocabulary.length} core expressions for ${rawDay.theme} with correct articles and plurals`,
        `Apply ${rawDay.grammar.title} naturally in conversation`,
        `Complete the real-life roleplay: ${rawDay.aiConversation.title}`,
      ],
      keyCapabilities: rawDay.vocabulary.slice(0, 4).map((v) => ({
        german: `${v.article ? v.article + " " : ""}${v.word}`,
        english: v.english,
      })),
      culturalTipAustria:
        "Focus on speaking full, practical phrases out loud rather than memorizing isolated words.",
    };

    return {
      ...rawDay,
      missionBriefing,
      dailyQuiz: enrichedQuiz,
      state,
      completedAt: isCompleted
        ? new Date(
            Date.now() - (currentDayNumber - rawDay.dayNumber) * 86400000
          ).toISOString()
        : undefined,
      earnedXp: isCompleted
        ? rawDay.xpTotal
        : isToday
        ? todayPrecompleted * 20
        : 0,
      quizScore: isCompleted ? 88 + (rawDay.dayNumber % 10) : undefined,
      speakingScore: isCompleted ? 86 + (rawDay.dayNumber % 11) : undefined,
      activities: buildActivitiesForDay(
        rawDay,
        isCompleted,
        isToday ? todayPrecompleted : 0,
        weakAreas
      ),
    };
  });

  const weeks: LearningWeek[] = [
    {
      weekNumber: 1,
      level: "A1",
      title: "Week 1: My First Week in Austria (MVP Flagship Journey)",
      description:
        "7 connected real-life missions in Vienna: 1. Student Intro → 2. Bakery Order → 3. Train Ticket → 4. Directions → 5. Restaurant → 6. University → 7. 'A Day in Vienna' Challenge.",
      focusThemes: [
        "1. Student Intro",
        "2. Bakery Order",
        "3. Train Ticket",
        "4. Directions",
        "5. Restaurant",
        "6. University",
        "7. A Day in Vienna",
      ],
      days: daysWithState.filter((d) => d.weekNumber === 1),
      isCompleted: currentDayNumber > 7,
    },
    {
      weekNumber: 2,
      level: "A1",
      title: "Week 2: Everyday Life & Daily Routine",
      description:
        "Telling time, café culture, grocery shopping, apartments, daily routine with separable verbs, and city navigation.",
      focusThemes: [
        "Time",
        "Food",
        "Shopping",
        "Home",
        "Daily Routine",
        "Directions",
      ],
      days: daysWithState.filter((d) => d.weekNumber === 2),
      isCompleted: currentDayNumber > 14,
    },
    {
      weekNumber: 3,
      level: "A1",
      title: "Week 3: Mobility, Health, Study & Work",
      description:
        "Public transit, hotels & travel, doctor visits, campus life, office & work, and modal verbs.",
      focusThemes: [
        "Transportation",
        "Travel",
        "Health",
        "University",
        "Work",
        "Modal Verbs",
      ],
      days: daysWithState.filter((d) => d.weekNumber === 3),
      isCompleted: currentDayNumber > 21,
    },
  ];

  const vocabularyProgress: Record<string, VocabularyProgress> = {};
  daysWithState
    .filter((d) => d.dayNumber <= Math.max(7, currentDayNumber))
    .forEach((day, dIdx) => {
      day.vocabulary.forEach((item, vIdx) => {
        const isDayCompleted = day.dayNumber < currentDayNumber;
        const isWeakWord =
          (item.grammarTag === "accusative_case" ||
            item.grammarTag === "dative_case") &&
          !isDayCompleted &&
          (dIdx + vIdx) % 2 === 0;
        vocabularyProgress[item.id] = {
          wordId: item.id,
          word: item.word,
          article: item.article,
          plural: item.plural,
          english: item.english,
          theme: item.theme,
          masteryScore: isDayCompleted ? 92 : isWeakWord ? 55 : 68,
          correctCount: isDayCompleted ? 4 : 1,
          mistakeCount: isWeakWord ? 1 : 0,
          needsReview: !isDayCompleted,
          status: isDayCompleted
            ? "Strong"
            : isWeakWord
            ? "Learning"
            : "Improving",
          lastPracticedAt: new Date(
            Date.now() - dIdx * 3600000 * 12
          ).toISOString(),
        };
      });
    });

  const grammarProgress: Record<string, GrammarProgress> = {
    accusative_case: {
      categoryId: "accusative_case",
      title: "Accusative / Masculine Noun (der Kaffee → einen Kaffee)",
      description:
        "Changing masculine 'der/ein' to 'den/einen' when ordering food or drinks ('Ich möchte einen Kaffee', 'Ich nehme einen Salat').",
      accuracy: 74,
      attempts: 14,
      mistakes: 3,
      isWeakArea: false,
      focusStatus: "Improving",
      recommendedAction:
        "Watch masculine nouns ('der Kaffee', 'der Salat') when ordering in a restaurant.",
      lastPracticedAt: new Date().toISOString(),
    },
    dative_case: {
      categoryId: "dative_case",
      title: "Dative Case (mit meiner Freundin / zum / zur)",
      description:
        "Using dative endings after 'mit' (mit meiner Freundin, mit dem Zug) and 'zu' (zum Bahnhof, zur Universität).",
      accuracy: 66,
      attempts: 15,
      mistakes: 5,
      isWeakArea: true,
      focusStatus: "Needs Practice",
      recommendedAction:
        "Adaptive Revision Active: Short 'mit + Dative' exercises automatically added to your Daily Review.",
      lastPracticedAt: new Date().toISOString(),
    },
    articles: {
      categoryId: "articles",
      title: "Noun Gender (der, die, das & Plurals)",
      description:
        "Learning nouns together with their article and plural form (der Tisch / die Tische, die Rechnung / die Rechnungen).",
      accuracy: 76,
      attempts: 24,
      mistakes: 6,
      isWeakArea: false,
      focusStatus: "Improving",
      recommendedAction:
        "Improving steadily! Keep reviewing nouns with der/die/das + plural.",
      lastPracticedAt: new Date().toISOString(),
    },
    word_order: {
      categoryId: "word_order",
      title: "Verb Position & Sentence Order (V2 Rule)",
      description:
        "Keeping the conjugated verb in Position 2 in statements and W-questions.",
      accuracy: 86,
      attempts: 20,
      mistakes: 3,
      isWeakArea: false,
      focusStatus: "Strong",
      recommendedAction: "Good control of V2 word order in everyday sentences.",
      lastPracticedAt: new Date().toISOString(),
    },
    time_expressions: {
      categoryId: "time_expressions",
      title: "Numbers & Time ('um halb zehn', Prices)",
      description:
        "Understanding prices in euros, train platforms, and the German 'halb' time rule.",
      accuracy: 92,
      attempts: 20,
      mistakes: 1,
      isWeakArea: false,
      focusStatus: "Strong",
      recommendedAction: "Strong! You handle prices and train times accurately.",
      lastPracticedAt: new Date().toISOString(),
    },
    verb_conjugation: {
      categoryId: "verb_conjugation",
      title: "Present Tense Verbs (möchten, nehmen, essen, trinken)",
      description:
        "Conjugating core A1 verbs for ich, du, er/sie, and formal Sie.",
      accuracy: 88,
      attempts: 28,
      mistakes: 3,
      isWeakArea: false,
      focusStatus: "Strong",
      recommendedAction: "Strong foundation in personal introductions and ordering.",
      lastPracticedAt: new Date().toISOString(),
    },
    separable_verbs: {
      categoryId: "separable_verbs",
      title: "Separable Verbs (abfahren, aufstehen, einkaufen)",
      description:
        "Placing the conjugated stem in Position 2 and the prefix at the end.",
      accuracy: 82,
      attempts: 14,
      mistakes: 2,
      isWeakArea: false,
      focusStatus: "Improving",
      recommendedAction: "Solid progress with 'Der Zug fährt um 9 Uhr ab'.",
      lastPracticedAt: new Date().toISOString(),
    },
  };

  const completedDaysCount = daysWithState.filter(
    (d) => d.state === "completed"
  ).length;
  const wordsLearnedCount =
    completedDaysCount * 6 + (todayPrecompleted > 0 ? 6 : 0);

  return {
    id: "plan-deutschnova-austria-v3",
    learnerName,
    learnerEmail,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    onboardingCompleted: true,
    level,
    learningGoal,
    dailyTargetMinutes,
    currentDayNumber,
    weeks,
    userProgress: {
      currentLevel: level,
      learningGoal,
      dailyStudyTargetMinutes: dailyTargetMinutes,
      currentWeek: Math.ceil(currentDayNumber / 7),
      currentDay: currentDayNumber,
      totalXp: completedDaysCount * 160 + todayPrecompleted * 20,
      wordsLearnedCount,
      grammarConceptsCount:
        completedDaysCount + (todayPrecompleted >= 3 ? 1 : 0),
      lessonsCompletedCount: completedDaysCount,
      vocabularyAccuracy: 86,
      grammarAccuracy: 76,
      listeningAccuracy: 90,
      speakingAccuracy: 88,
      pronunciationAccuracy: 86,
      quizAccuracy: 85,
      weakAreas,
    },
    vocabularyProgress,
    grammarProgress,
    mistakeMemory: INITIAL_MISTAKE_MEMORY,
    realWorldReadiness: buildRealWorldReadinessList(daysWithState),
    personalReview: buildPersonalReviewFromMistakes(INITIAL_MISTAKE_MEMORY),
    lastMissionFeedback: {},
    speakingProgress: {
      overallScore: 88,
      pronunciationScore: 86,
      fluencyScore: 89,
      phrasesPracticed:
        completedDaysCount * 2 + (todayPrecompleted >= 6 ? 2 : 0),
      challengingSounds: [
        "Accusative '-en' ending (einen Kaffee, einen Salat)",
        "Dative '-er' vs '-e' ending (mit meiner Freundin)",
        "ch after e/i (ich möchte, die Rechnung)",
      ],
      recentScores: [
        { dayNumber: 1, score: 86, date: "4 days ago" },
        { dayNumber: 2, score: 85, date: "3 days ago" },
        { dayNumber: 3, score: 88, date: "2 days ago" },
        { dayNumber: 4, score: 90, date: "Yesterday" },
      ],
    },
    streak: {
      currentStreak: 5,
      longestStreak: 8,
      xpEarnedToday: todayPrecompleted * 20,
      dailyTargetMinutes,
      dailyTargetXp: 160,
      minutesStudiedToday: todayPrecompleted * 2,
      lastCompletedDate: new Date().toISOString().split("T")[0],
      weeklyActivity: [
        { dayLabel: "Mon", completed: true, xp: 160 },
        { dayLabel: "Tue", completed: true, xp: 160 },
        { dayLabel: "Wed", completed: true, xp: 160 },
        { dayLabel: "Thu", completed: true, xp: 160 },
        {
          dayLabel: "Fri",
          completed: todayPrecompleted >= 8,
          xp: todayPrecompleted * 20,
        },
        { dayLabel: "Sat", completed: false, xp: 0 },
        { dayLabel: "Sun", completed: false, xp: 0 },
      ],
    },
  };
}
