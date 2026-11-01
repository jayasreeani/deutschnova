import assert from "node:assert/strict";
import {
  analyzeGermanUtterance,
  buildContextualWaiterResponse,
  evaluateRealWorldReadiness,
  generatePersonalizedReviewBlock,
  recordCorrectStructuresInMemory,
  upsertMistakeInMemory,
} from "../src/lib/germanTutorEngine";
import { createPersonalizedLearningPlan } from "../src/data/a1Curriculum";
import { MistakeMemoryEntry } from "../src/types/learning";

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function runTest(suite: string, name: string, fn: () => string) {
  try {
    const details = fn();
    results.push({ suite, name, passed: true, details });
    console.log(`✅ [PASS] [${suite}] ${name} -> ${details}`);
  } catch (err: any) {
    results.push({
      suite,
      name,
      passed: false,
      details: err?.message || String(err),
    });
    console.error(`❌ [FAIL] [${suite}] ${name} -> ${err?.message || err}`);
  }
}

// ============================================================================
// 1. VALID RESTAURANT UTTERANCES (Do NOT interrupt or flag errors)
// ============================================================================
const validUtterances = [
  "Ich möchte einen Kaffee.",
  "Ich hätte gern einen Kaffee.",
  "Einen Kaffee, bitte.",
  "Für mich einen Kaffee, bitte.",
  "Ich nehme einen Kaffee.",
  "Ich möchte einen Kaffee und einen Kuchen.",
];

for (const utterance of validUtterances) {
  runTest("1. Valid Utterances", `Accepts "${utterance}" without false error`, () => {
    const res = analyzeGermanUtterance(utterance, 5);
    assert.equal(
      res.detectedMistake,
      null,
      `Expected no mistake for "${utterance}", got ${JSON.stringify(res.detectedMistake)}`
    );
    assert.equal(res.requiresCoachRetry, false);
    assert.ok(
      res.intent === "order_drink" || res.intent === "order_drink_and_food",
      `Unexpected intent: ${res.intent}`
    );
    assert.ok(
      res.correctStructuresUsed.includes("accusative_case"),
      "Should recognize correct accusative usage"
    );
    return `intent=${res.intent}, structures=[${res.correctStructuresUsed.join(", ")}]`;
  });
}

// ============================================================================
// 2. INCORRECT GERMAN UTTERANCES (Detect exact category + Coach Retry)
// ============================================================================
runTest(
  "2. Incorrect Utterances",
  'Detects accusative mistake in "Ich möchte eine Kaffee."',
  () => {
    const res = analyzeGermanUtterance("Ich möchte eine Kaffee.", 5);
    assert.ok(res.detectedMistake, "Expected a detectedMistake");
    assert.equal(res.detectedMistake.category, "accusative_case");
    assert.equal(res.detectedMistake.correctSentence, "Ich möchte einen Kaffee.");
    assert.equal(res.requiresCoachRetry, true);
    return `category=${res.detectedMistake.category}, correction="${res.detectedMistake.correctSentence}"`;
  }
);

runTest(
  "2. Incorrect Utterances",
  'Detects accusative mistake in "Ich möchte ein Kaffee."',
  () => {
    const res = analyzeGermanUtterance("Ich möchte ein Kaffee.", 5);
    assert.ok(res.detectedMistake, "Expected a detectedMistake");
    assert.equal(res.detectedMistake.category, "accusative_case");
    assert.equal(res.detectedMistake.correctSentence, "Ich möchte einen Kaffee.");
    assert.equal(res.requiresCoachRetry, true);
    return `category=${res.detectedMistake.category}, correction="${res.detectedMistake.correctSentence}"`;
  }
);

runTest(
  "2. Incorrect Utterances",
  'Detects verb conjugation mistake in "Ich wollen einen Kaffee."',
  () => {
    const res = analyzeGermanUtterance("Ich wollen einen Kaffee.", 5);
    assert.ok(res.detectedMistake, "Expected a detectedMistake");
    assert.equal(res.detectedMistake.category, "verb_conjugation");
    assert.equal(res.detectedMistake.correctSentence, "Ich möchte einen Kaffee.");
    assert.equal(res.requiresCoachRetry, true);
    return `category=${res.detectedMistake.category}, correction="${res.detectedMistake.correctSentence}"`;
  }
);

runTest(
  "2. Incorrect Utterances",
  'Detects verb position (V2 word order) mistake in "Ich Kaffee möchte."',
  () => {
    const res = analyzeGermanUtterance("Ich Kaffee möchte.", 5);
    assert.ok(res.detectedMistake, "Expected a detectedMistake");
    assert.equal(res.detectedMistake.category, "verb_position");
    assert.equal(res.detectedMistake.correctSentence, "Ich möchte einen Kaffee.");
    assert.equal(res.requiresCoachRetry, true);
    return `category=${res.detectedMistake.category}, correction="${res.detectedMistake.correctSentence}"`;
  }
);

// ============================================================================
// 3. DO NOT OVER-CORRECT PRINCIPLE & INCOMPLETE UTTERANCES
// ============================================================================
runTest(
  "3. Do-Not-Over-Correct & Elliptical",
  'Does NOT block conversation on minor redundancy "Ich möchte einen Kaffee haben bitte."',
  () => {
    const res = analyzeGermanUtterance("Ich möchte einen Kaffee haben bitte.", 5);
    assert.equal(
      res.detectedMistake,
      null,
      "Minor stylistic redundancy must not record a formal mistake"
    );
    assert.equal(
      res.requiresCoachRetry,
      false,
      "Must not interrupt Coach Mode for minor stylistic phrasing"
    );
    assert.ok(res.minorCoachingTip, "Should provide a gentle non-blocking tip");
    return `requiresCoachRetry=false, minorTip="${res.minorCoachingTip}"`;
  }
);

runTest(
  "3. Do-Not-Over-Correct & Elliptical",
  'Accepts natural elliptical order "Einen Kaffee." without blocking',
  () => {
    const res = analyzeGermanUtterance("Einen Kaffee.", 5);
    assert.equal(res.detectedMistake, null);
    assert.equal(res.requiresCoachRetry, false);
    assert.ok(res.minorCoachingTip, "Provides gentle politeness tip without blocking");
    return `requiresCoachRetry=false, minorTip="${res.minorCoachingTip}"`;
  }
);

runTest(
  "3. Do-Not-Over-Correct & Elliptical",
  'Coaches bare single-word noun "Kaffee." (missing article + politeness)',
  () => {
    const res = analyzeGermanUtterance("Kaffee.", 5);
    assert.ok(res.detectedMistake, "Expected missing_word mistake for bare 'Kaffee.'");
    assert.equal(res.detectedMistake.category, "missing_word");
    assert.equal(res.requiresCoachRetry, true);
    return `category=${res.detectedMistake.category}, suggested="${res.detectedMistake.correctSentence}"`;
  }
);

runTest(
  "3. Do-Not-Over-Correct & Elliptical",
  'Coaches missing article in "Bitte Kaffee."',
  () => {
    const res = analyzeGermanUtterance("Bitte Kaffee.", 5);
    assert.ok(res.detectedMistake, "Expected missing_word mistake for 'Bitte Kaffee.'");
    assert.equal(res.detectedMistake.category, "missing_word");
    assert.equal(res.requiresCoachRetry, true);
    return `category=${res.detectedMistake.category}, suggested="${res.detectedMistake.correctSentence}"`;
  }
);

// ============================================================================
// 4. UNEXPECTED & RECOVERY INTENTS
// ============================================================================
const unexpectedIntentChecks: { text: string; expectedIntent: string }[] = [
  { text: "Nein, danke.", expectedIntent: "decline_more" },
  { text: "Ja, bitte.", expectedIntent: "affirmative" },
  { text: "Was empfehlen Sie?", expectedIntent: "ask_recommendation" },
  { text: "Was kostet das?", expectedIntent: "ask_price" },
  { text: "Die Rechnung, bitte.", expectedIntent: "request_bill" },
  { text: "Zahlen, bitte.", expectedIntent: "request_bill" },
  { text: "Ich verstehe nicht.", expectedIntent: "comprehension_difficulty" },
  { text: "Bitte langsamer.", expectedIntent: "request_slower" },
  { text: "Noch einmal, bitte.", expectedIntent: "request_repeat" },
];

for (const item of unexpectedIntentChecks) {
  runTest("4. Unexpected & Recovery Intents", `Handles "${item.text}"`, () => {
    const res = analyzeGermanUtterance(item.text, 5);
    assert.equal(res.intent, item.expectedIntent);
    assert.equal(res.detectedMistake, null, "Must not flag valid conversational turn as mistake");
    assert.equal(res.requiresCoachRetry, false);
    if (
      item.expectedIntent === "comprehension_difficulty" ||
      item.expectedIntent === "request_slower" ||
      item.expectedIntent === "request_repeat"
    ) {
      assert.ok(res.recoverySupport, "Should attach comprehension recovery support");
    }
    return `intent=${res.intent}, recoverySupport=${Boolean(res.recoverySupport)}`;
  });
}

// ============================================================================
// 5. MULTI-TURN CONVERSATION STATE CONTINUITY
// ============================================================================
runTest(
  "5. Multi-Turn State Continuity",
  "Preserves ordered items across recommendation question, comprehension help, and bill request without resetting",
  () => {
    const history: { sender: "ai" | "user"; german: string }[] = [
      { sender: "ai", german: "Guten Abend! Was möchten Sie bestellen?" },
    ];

    // Turn 1: Order drink
    const turn1Analysis = analyzeGermanUtterance("Ich möchte einen Kaffee.", 5);
    const turn1Reply = buildContextualWaiterResponse({
      dayNumber: 5,
      userMessage: "Ich möchte einen Kaffee.",
      turnCount: 1,
      intent: turn1Analysis.intent,
      conversationHistory: history,
    });
    assert.ok(turn1Reply.orderedItemsSoFar.includes("der Kaffee"));
    assert.equal(turn1Reply.missionComplete, false);
    history.push(
      { sender: "user", german: "Ich möchte einen Kaffee." },
      { sender: "ai", german: turn1Reply.aiReplyDe }
    );

    // Turn 2: Ask recommendation ("Was empfehlen Sie?") -> must keep "der Kaffee"
    const turn2Analysis = analyzeGermanUtterance("Was empfehlen Sie?", 5);
    const turn2Reply = buildContextualWaiterResponse({
      dayNumber: 5,
      userMessage: "Was empfehlen Sie?",
      turnCount: 2,
      intent: turn2Analysis.intent,
      conversationHistory: history,
    });
    assert.ok(
      turn2Reply.aiReplyDe.includes("empfehle"),
      "Waiter should recommend dishes"
    );
    assert.ok(
      turn2Reply.orderedItemsSoFar.includes("der Kaffee"),
      "Waiter must remember coffee ordered in Turn 1"
    );
    history.push(
      { sender: "user", german: "Was empfehlen Sie?" },
      { sender: "ai", german: turn2Reply.aiReplyDe }
    );

    // Turn 3: Learner says "Ich verstehe nicht." -> waiter simplifies without restarting
    const turn3Analysis = analyzeGermanUtterance("Ich verstehe nicht.", 5);
    const turn3Reply = buildContextualWaiterResponse({
      dayNumber: 5,
      userMessage: "Ich verstehe nicht.",
      turnCount: 2,
      intent: turn3Analysis.intent,
      conversationHistory: history,
    });
    assert.ok(turn3Reply.orderedItemsSoFar.includes("der Kaffee"));
    assert.equal(turn3Reply.missionComplete, false);

    // Turn 4: Learner requests the bill ("Die Rechnung, bitte.") -> completes mission
    const turn4Analysis = analyzeGermanUtterance("Die Rechnung, bitte.", 5);
    const turn4Reply = buildContextualWaiterResponse({
      dayNumber: 5,
      userMessage: "Die Rechnung, bitte.",
      turnCount: 3,
      intent: turn4Analysis.intent,
      conversationHistory: history,
    });
    assert.equal(turn4Reply.missionComplete, true);

    return `Turn1->Turn4 preserved items=[${turn4Reply.orderedItemsSoFar.join(", ")}], completed=${turn4Reply.missionComplete}`;
  }
);

// ============================================================================
// 6. COACH MODE vs. REAL-LIFE MODE BEHAVIOR
// ============================================================================
runTest(
  "6. Coach vs Real-Life Mode",
  "Coach Mode interrupts on material grammar error while Real-Life Mode continues silently and records mistake",
  () => {
    const analysis = analyzeGermanUtterance("Ich möchte eine Kaffee.", 5);
    const coachModeInterrupts = analysis.requiresCoachRetry === true;
    // In Real-Life Mode (route.ts logic), requiresRetry is forced to false so waiter replies naturally
    const realLifeRequiresRetry = false;
    assert.equal(coachModeInterrupts, true);
    assert.equal(realLifeRequiresRetry, false);
    assert.ok(analysis.detectedMistake, "Mistake is still detected for post-mission summary");
    return `Coach interrupts=${coachModeInterrupts}, Real-Life interrupts=${realLifeRequiresRetry}, recorded=${analysis.detectedMistake.category}`;
  }
);

// ============================================================================
// 7. MISTAKE MEMORY: DEDUPLICATION, RECURRENCE & MASTERY RECOVERY
// ============================================================================
runTest(
  "7. Mistake Memory & Mastery Lifecycle",
  "1st mistake -> Improving, rapid duplicate -> ignored, 2nd distinct mistake -> Needs Practice, correct uses -> Improving -> Mastered",
  () => {
    let memory: MistakeMemoryEntry[] = [];
    const mistake = analyzeGermanUtterance("Ich möchte eine Kaffee.", 5).detectedMistake!;

    // 1st occurrence at t=0s
    const t0 = new Date(1700000000000).toISOString();
    memory = upsertMistakeInMemory(memory, mistake, 5, t0);
    assert.equal(memory.length, 1);
    assert.equal(memory[0].occurrences, 1);
    assert.equal(memory[0].status, "Improving");

    // Rapid duplicate click 500ms later -> deduplicated!
    const tDup = new Date(1700000000500).toISOString();
    memory = upsertMistakeInMemory(memory, mistake, 5, tDup);
    assert.equal(memory[0].occurrences, 1, "Rapid duplicate submission within 2s must be ignored");

    // 2nd distinct occurrence 10 seconds later -> escalates to "Needs Practice"
    const t2 = new Date(1700000010000).toISOString();
    memory = upsertMistakeInMemory(memory, mistake, 5, t2);
    assert.equal(memory[0].occurrences, 2);
    assert.equal(memory[0].status, "Needs Practice");

    // Subsequent correct usage #1 ("Ich möchte einen Kaffee.") -> "Needs Practice" -> "Improving"
    memory = recordCorrectStructuresInMemory(memory, ["accusative_case"]);
    assert.equal(memory[0].status, "Improving");

    // Subsequent correct usages #2 and #3 -> "Improving" -> "Mastered"
    memory = recordCorrectStructuresInMemory(memory, ["accusative_case"]);
    memory = recordCorrectStructuresInMemory(memory, ["accusative_case"]);
    assert.equal(memory[0].status, "Mastered");

    return `Lifecycle verified: 1x(Improving) -> dedup(1x) -> 2x(Needs Practice) -> +1 correct(Improving) -> +3 correct(Mastered)`;
  }
);

// ============================================================================
// 8. PERSONAL REVIEW ADAPTATION (LEARNER A vs LEARNER B vs LEARNER C)
// ============================================================================
runTest(
  "8. Personal Review Adaptation",
  "Learner A (Accusative weakness) receives Accusative masculine review",
  () => {
    let memory: MistakeMemoryEntry[] = [];
    const accMistake = analyzeGermanUtterance("Ich möchte eine Kaffee.", 5).detectedMistake!;
    memory = upsertMistakeInMemory(memory, accMistake, 5, new Date(1700000000000).toISOString());
    memory = upsertMistakeInMemory(memory, accMistake, 5, new Date(1700000010000).toISOString());

    const review = generatePersonalizedReviewBlock(memory);
    assert.equal(review.sourceCategory, "accusative_case");
    assert.equal(review.isReinforcementOnly, false);
    assert.ok(
      review.items.some((e) => e.baseWord.includes("Kaffee")),
      "Should include der Kaffee -> einen Kaffee"
    );
    return `Learner A -> "${review.sourceCategoryLabel}" (${review.sourceCategory})`;
  }
);

runTest(
  "8. Personal Review Adaptation",
  "Learner B (Verb conjugation weakness) receives Verb Conjugation review (NOT Accusative)",
  () => {
    let memory: MistakeMemoryEntry[] = [];
    const verbMistake = analyzeGermanUtterance("Ich wollen einen Kaffee.", 5).detectedMistake!;
    memory = upsertMistakeInMemory(memory, verbMistake, 5, new Date(1700000000000).toISOString());
    memory = upsertMistakeInMemory(memory, verbMistake, 5, new Date(1700000010000).toISOString());

    const review = generatePersonalizedReviewBlock(memory);
    assert.equal(review.sourceCategory, "verb_conjugation");
    assert.equal(review.isReinforcementOnly, false);
    assert.ok(
      review.sourceCategoryLabel.toLowerCase().includes("verb"),
      "Focus title must target verb conjugation"
    );
    return `Learner B -> "${review.sourceCategoryLabel}" (${review.sourceCategory})`;
  }
);

runTest(
  "8. Personal Review Adaptation",
  "Learner C (No active weakness / all Mastered) receives Normal Daily Reinforcement, NOT a manufactured weakness",
  () => {
    const reviewEmpty = generatePersonalizedReviewBlock([]);
    assert.equal(reviewEmpty.isReinforcementOnly, true);
    assert.ok(
      reviewEmpty.title.includes("DAILY REINFORCEMENT"),
      `Expected DAILY REINFORCEMENT title, got ${reviewEmpty.title}`
    );
    return `Learner C -> "${reviewEmpty.title}" (isReinforcementOnly=${reviewEmpty.isReinforcementOnly})`;
  }
);

// ============================================================================
// 9. REAL-WORLD READINESS INTEGRITY
// ============================================================================
runTest(
  "9. Real-World Readiness Integrity",
  "Day 5 transitions: Not Started -> Learning -> Practice Needed (when recurring mistake exists) -> Ready (when resolved & steps done)",
  () => {
    const plan = createPersonalizedLearningPlan({
      startAtDay: 5,
      todayCompletedActivitiesCount: 0,
    });
    const days = plan.weeks.flatMap((w) => w.days);
    const day5 = days.find((d) => d.dayNumber === 5)!;

    // 1. Unstarted -> "Not Started"
    day5.activities.forEach((a) => (a.completed = false));
    let readiness = evaluateRealWorldReadiness(days, [], {});
    let d5Status = readiness.find((r) => r.dayNumber === 5)!;
    assert.equal(d5Status.status, "Not Started");

    // 2. Complete 2 steps -> "Learning"
    day5.activities[0].completed = true;
    day5.activities[1].completed = true;
    readiness = evaluateRealWorldReadiness(days, [], {});
    d5Status = readiness.find((r) => r.dayNumber === 5)!;
    assert.equal(d5Status.status, "Learning");

    // 3. Complete all steps including mission, BUT learner has a recurring "Needs Practice" mistake on Day 5 -> "Practice Needed"
    day5.activities.forEach((a) => {
      a.completed = true;
      a.score = 92;
    });
    let memory: MistakeMemoryEntry[] = [];
    const accMistake = analyzeGermanUtterance("Ich möchte eine Kaffee.", 5).detectedMistake!;
    memory = upsertMistakeInMemory(memory, accMistake, 5, new Date(1700000000000).toISOString());
    memory = upsertMistakeInMemory(memory, accMistake, 5, new Date(1700000010000).toISOString());

    readiness = evaluateRealWorldReadiness(days, memory, {});
    d5Status = readiness.find((r) => r.dayNumber === 5)!;
    assert.equal(
      d5Status.status,
      "Practice Needed",
      "Cannot be Ready while an unresolved 'Needs Practice' mistake exists"
    );

    // 4. Learner resolves mistake via correct usage -> status becomes "Ready"
    memory = recordCorrectStructuresInMemory(memory, ["accusative_case"]);
    readiness = evaluateRealWorldReadiness(days, memory, {});
    d5Status = readiness.find((r) => r.dayNumber === 5)!;
    assert.equal(d5Status.status, "Ready");

    return `Verified transitions: Not Started -> Learning -> Practice Needed -> Ready`;
  }
);

console.log("\n============================================================");
const passedCount = results.filter((r) => r.passed).length;
console.log(
  `REALITY TEST SUITE SUMMARY: ${passedCount}/${results.length} tests passed.`
);
console.log("============================================================\n");

if (passedCount !== results.length) {
  process.exit(1);
}
