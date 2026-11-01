export type CEFRLevel = "A1" | "A2" | "B1" | "B2";

export type LearningGoalType =
  | "daily_life"
  | "career"
  | "university"
  | "travel"
  | "certification";

export type DayState = "completed" | "today" | "available" | "locked";

export type ActivityType =
  | "todays_mission"
  | "vocabulary"
  | "grammar"
  | "listening"
  | "sentence_building"
  | "speaking"
  | "ai_conversation"
  | "daily_quiz"
  | "weekly_summary"
  | "adaptive_revision";

export type LearningStatus = "New" | "Learning" | "Improving" | "Strong";

export type FocusStatus = "Needs Practice" | "Improving" | "Strong" | "Mastered";

export type MistakeCategory =
  | "article_gender"
  | "noun_gender"
  | "nominative_case"
  | "accusative_case"
  | "dative_case"
  | "verb_conjugation"
  | "verb_position"
  | "word_order"
  | "sentence_order"
  | "vocabulary_choice"
  | "vocabulary"
  | "missing_word"
  | "politeness_expression"
  | "comprehension_difficulty"
  | "pronunciation";

export type ReadinessStatus =
  | "Not Started"
  | "Learning"
  | "Practice Needed"
  | "Ready";

export interface WhyWrongRemediation {
  learnerMistakeExample?: string;
  correctSentence: string;
  ruleHeadline: string;
  stepByStepBreakdown: string[];
  followUpQuestion: {
    prompt: string;
    options: string[];
    correctAnswer: string;
    successMessage: string;
  };
}

export interface VocabularyItem {
  id: string;
  word: string;
  article?: "der" | "die" | "das" | "";
  plural?: string;
  english: string;
  partOfSpeech: "noun" | "verb" | "adjective" | "phrase" | "adverb" | "pronoun";
  pronunciationHint: string;
  exampleDe: string;
  exampleEn: string;
  theme: string;
  grammarTag?: string;
  isChunkOrPhrase?: boolean;
  learningStatus?: LearningStatus;
}

export interface GrammarPoint {
  id: string;
  title: string;
  category:
    | "articles"
    | "verb_conjugation"
    | "word_order"
    | "separable_verbs"
    | "accusative_case"
    | "dative_case"
    | "modal_verbs"
    | "prepositions"
    | "questions"
    | "negation"
    | "time_expressions";
  summary: string;
  explanationEn: string;
  keyRules: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
  examples: {
    german: string;
    english: string;
    highlight: string;
  }[];
  checkQuestions: {
    id: string;
    prompt: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    grammarCategory: string;
    whyWrong?: WhyWrongRemediation;
  }[];
}

export interface ListeningExercise {
  id: string;
  title: string;
  contextDescription: string;
  dialogue: {
    speaker: string;
    german: string;
    english: string;
  }[];
  questions: {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }[];
}

export interface SentenceBuildingItem {
  id: string;
  englishPrompt: string;
  targetGerman: string;
  scrambledWords: string[];
  grammarHint: string;
  grammarCategory: string;
  whyWrong?: WhyWrongRemediation;
}

export interface SpeakingPromptItem {
  id: string;
  germanPhrase: string;
  englishMeaning: string;
  phoneticGuide: string;
  focusSound: string;
  contextTip: string;
}

export interface AIConversationScenario {
  id: string;
  title: string;
  roleplayPartner: string;
  setting: string;
  objective: string;
  openingMessageDe: string;
  openingMessageEn: string;
  suggestedPrompts: {
    stageLabel?: string;
    german: string;
    english: string;
    aiReplyDe: string;
    aiReplyEn: string;
    feedbackTip: string;
  }[];
  keyPhrasesToUse: string[];
}

export interface QuizQuestion {
  id: string;
  type: "vocabulary" | "grammar" | "article" | "sentence" | "listening";
  skillCategory:
    | "vocabulary"
    | "grammar"
    | "articles"
    | "separable_verbs"
    | "word_order"
    | "accusative_case"
    | "dative_case"
    | "verb_conjugation";
  question: string;
  germanContext?: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  isAdaptiveReview?: boolean;
  whyWrong?: WhyWrongRemediation;
}

export interface MissionBriefing {
  missionTitle: string;
  locationBadge: string;
  realLifeGoal: string;
  whatYouWillBeAbleToDo: string[];
  keyCapabilities: {
    german: string;
    english: string;
  }[];
  culturalTipAustria: string;
}

export interface LessonActivity {
  id: string;
  dayNumber: number;
  order: number;
  type: ActivityType;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  xpReward: number;
  completed: boolean;
  score?: number; // 0-100
  isAdaptiveBooster?: boolean;
  adaptiveReason?: string;
}

export interface LearningDay {
  dayNumber: number;
  weekNumber: number;
  dayOfWeek: number; // 1-7
  level: CEFRLevel;
  theme: string;
  goalTitle: string;
  subtitle: string;
  description: string;
  isWeeklyReview: boolean;
  estimatedMinutes: number;
  xpTotal: number;
  state: DayState;
  completedAt?: string;
  earnedXp?: number;
  quizScore?: number;
  speakingScore?: number;

  // Mission briefing for the 8-step flow
  missionBriefing?: MissionBriefing;

  // Structured Content
  vocabulary: VocabularyItem[];
  grammar: GrammarPoint;
  listening: ListeningExercise;
  sentenceBuilding: SentenceBuildingItem[];
  speaking: SpeakingPromptItem[];
  aiConversation: AIConversationScenario;
  dailyQuiz: QuizQuestion[];
  weeklySummaryNotes?: string[];

  // Activities checklist for this day (8 steps)
  activities: LessonActivity[];
}

export interface LearningWeek {
  weekNumber: number;
  level: CEFRLevel;
  title: string;
  description: string;
  focusThemes: string[];
  days: LearningDay[];
  isCompleted: boolean;
}

export interface VocabularyProgress {
  wordId: string;
  word: string;
  article?: string;
  plural?: string;
  english: string;
  theme: string;
  masteryScore: number; // 0-100
  correctCount: number;
  mistakeCount: number;
  needsReview: boolean;
  status: LearningStatus;
  lastPracticedAt: string;
}

export interface GrammarProgress {
  categoryId: string;
  title: string;
  description: string;
  accuracy: number; // 0-100
  attempts: number;
  mistakes: number;
  isWeakArea: boolean;
  focusStatus: FocusStatus;
  recommendedAction: string;
  lastPracticedAt: string;
}

export interface MistakeMemoryEntry {
  id: string;
  category: MistakeCategory;
  categoryLabel: string;
  word?: string; // e.g. "der Kaffee"
  learnerUsage?: string; // e.g. "eine Kaffee"
  correctUsage?: string; // e.g. "einen Kaffee"
  status: FocusStatus;
  learnerInput: string;
  correctGerman: string;
  whyExplanation: string;
  context?: string;
  transformationSteps: string[];
  occurrences: number;
  correctCountAfterMistake?: number;
  firstObservedDay?: number;
  firstObservedAt?: string;
  lastSeenDay: number;
  lastObservedAt?: string;
  followUpQuestion: {
    prompt: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  };
}

export interface DetectedMistake {
  category: MistakeCategory;
  categoryLabel: string;
  word: string;
  learnerUsage: string;
  correctUsage: string;
  learnerSentence: string;
  correctSentence: string;
  coachHeadline: string;
  explanation: string;
  transformationSteps: string[];
  severity?: "material" | "minor" | "supportive";
  confidence?: "high" | "medium" | "low";
  context?: string;
}

export interface MissionCompletionFeedback {
  missionId: string;
  dayNumber: number;
  mode: "coach" | "real_life";
  completedAt: string;
  whatYouDidWell: string[];
  importantCorrections: {
    learnerSentence: string;
    correctSentence: string;
    explanation: string;
    word: string;
    learnerUsage: string;
    correctUsage: string;
  }[];
  newWordsUsed: {
    german: string;
    english: string;
  }[];
  grammarToReview: string[];
  focusAreaImpact: {
    categoryLabel: string;
    status: FocusStatus;
    occurrences: number;
    note: string;
  };
  nextRecommendedPractice: string;
}

export interface PersonalReviewItem {
  id: string;
  baseWord: string;
  targetForm: string;
  promptSentence: string;
  correctAnswer: string;
  options: string[];
  explanation: string;
}

export interface PersonalReviewBlock {
  id: string;
  title: string; // "PERSONAL REVIEW – 3 MINUTES" or "DAILY REINFORCEMENT – 3 MINUTES"
  sourceCategory: string;
  sourceCategoryLabel: string;
  triggerReason: string;
  estimatedMinutes: number;
  completed: boolean;
  isReinforcementOnly?: boolean;
  items: PersonalReviewItem[];
}

export interface RealWorldReadinessItem {
  id: string;
  dayNumber: number;
  capabilityTitle: string;
  locationContext: string;
  status: ReadinessStatus;
  evidenceSummary: string;
  vocabMasteredCount: number;
  vocabTotalCount: number;
  missionCompleted: boolean;
  missionModeUsed?: "coach" | "real_life";
  unresolvedMistakesCount: number;
  lastUpdatedAt: string;
}

export interface SpeakingProgress {
  overallScore: number; // 0-100
  pronunciationScore: number; // 0-100
  fluencyScore: number; // 0-100
  phrasesPracticed: number;
  challengingSounds: string[];
  recentScores: { dayNumber: number; score: number; date: string }[];
}

export interface DailyStreak {
  currentStreak: number;
  longestStreak: number;
  xpEarnedToday: number;
  dailyTargetMinutes: number;
  dailyTargetXp: number;
  minutesStudiedToday: number;
  lastCompletedDate: string;
  weeklyActivity: {
    dayLabel: string; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
    completed: boolean;
    xp: number;
  }[];
}

export interface UserProgress {
  currentLevel: CEFRLevel;
  learningGoal: LearningGoalType;
  dailyStudyTargetMinutes: number;
  currentWeek: number;
  currentDay: number;
  totalXp: number;
  wordsLearnedCount: number;
  grammarConceptsCount: number;
  lessonsCompletedCount: number;
  // Performance metrics (0-100)
  vocabularyAccuracy: number;
  grammarAccuracy: number;
  listeningAccuracy: number;
  speakingAccuracy: number;
  pronunciationAccuracy: number;
  quizAccuracy: number;
  weakAreas: string[];
}

export interface LearningPlan {
  id: string;
  learnerName: string;
  learnerEmail?: string;
  createdAt: string;
  updatedAt: string;
  onboardingCompleted: boolean;
  level: CEFRLevel;
  learningGoal: LearningGoalType;
  dailyTargetMinutes: number;
  currentDayNumber: number;
  weeks: LearningWeek[];
  userProgress: UserProgress;
  vocabularyProgress: Record<string, VocabularyProgress>;
  grammarProgress: Record<string, GrammarProgress>;
  mistakeMemory: MistakeMemoryEntry[];
  realWorldReadiness?: RealWorldReadinessItem[];
  personalReview?: PersonalReviewBlock;
  lastMissionFeedback?: Record<number, MissionCompletionFeedback>;
  speakingProgress: SpeakingProgress;
  streak: DailyStreak;
}
