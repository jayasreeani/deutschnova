import {
  DetectedMistake,
  FocusStatus,
  LearningDay,
  MistakeCategory,
  MistakeMemoryEntry,
  MissionCompletionFeedback,
  PersonalReviewBlock,
  RealWorldReadinessItem,
} from "../types/learning";

export type RestaurantIntent =
  | "order_drink_and_food"
  | "order_drink"
  | "order_food"
  | "change_order"
  | "ask_recommendation"
  | "ask_price"
  | "request_bill"
  | "decline_more"
  | "affirmative"
  | "comprehension_difficulty"
  | "request_slower"
  | "request_repeat"
  | "greeting_or_table"
  | "unexpected_or_other";

export interface UtteranceAnalysisResult {
  intent: RestaurantIntent;
  detectedMistake: DetectedMistake | null;
  requiresCoachRetry: boolean;
  minorCoachingTip?: string;
  recoverySupport?: {
    type: "not_understood" | "slower" | "repeat";
    simplifiedGerman: string;
    englishExplanation: string;
    suggestedReplies: string[];
  };
  correctStructuresUsed: MistakeCategory[];
  wordsDetected: { german: string; english: string }[];
  orderedItemsExtracted: string[];
  communicativeStrengths: string[];
  confidence: "high" | "medium" | "low";
  engineSource: "deterministic_rules" | "llm_enhanced";
}

const VOCAB_CATALOG: {
  match: RegExp;
  german: string;
  english: string;
  kind: "drink" | "food" | "other";
}[] = [
  { match: /\bkaffee\b/i, german: "der Kaffee", english: "coffee", kind: "drink" },
  { match: /\bwasser\b/i, german: "das Wasser", english: "water", kind: "drink" },
  { match: /\btee\b/i, german: "der Tee", english: "tea", kind: "drink" },
  { match: /\b(?:apfel|orangen)?saft\b/i, german: "der Saft", english: "juice", kind: "drink" },
  { match: /\bsuppe\b/i, german: "die Suppe", english: "soup", kind: "food" },
  { match: /\bsalat\b/i, german: "der Salat", english: "salad", kind: "food" },
  { match: /\bschnitzel\b/i, german: "das Schnitzel", english: "schnitzel", kind: "food" },
  { match: /\bkuchen\b/i, german: "der Kuchen", english: "cake", kind: "food" },
  { match: /\b(?:apfelstrudel|strudel)\b/i, german: "der Apfelstrudel", english: "apple strudel", kind: "food" },
  { match: /\bapfel\b/i, german: "der Apfel", english: "apple", kind: "food" },
  { match: /\bbrötchen\b/i, german: "das Brötchen", english: "bread roll", kind: "food" },
  { match: /\bsemmel\b/i, german: "die Semmel", english: "bread roll", kind: "food" },
  { match: /\bbrot\b/i, german: "das Brot", english: "bread", kind: "food" },
  { match: /\bspeisekarte\b/i, german: "die Speisekarte", english: "menu", kind: "other" },
  { match: /\brechnung\b/i, german: "die Rechnung", english: "bill", kind: "other" },
  { match: /\bfahrkarte\b/i, german: "die Fahrkarte", english: "train ticket", kind: "other" },
];

/**
 * Recognizes the learner's conversational intent in a restaurant / everyday context
 * without requiring exact string matches.
 */
export function recognizeRestaurantIntent(text: string): RestaurantIntent {
  const raw = text.trim();
  const lower = raw.toLowerCase();

  if (!raw) return "unexpected_or_other";

  // 1. Comprehension difficulty / communication recovery
  if (
    /\b(verstehe\s+nicht|nicht\s+verstanden|was\s+bedeutet|wie\s+heißt\s+das|hilf|hilfe)\b/i.test(
      lower
    )
  ) {
    return "comprehension_difficulty";
  }
  if (/\b(langsamer|langsam)\b/i.test(lower)) {
    return "request_slower";
  }
  if (/\b(noch\s+einmal|wiederholen|wie\s+bitte|nochmal)\b/i.test(lower)) {
    return "request_repeat";
  }

  // 2. Request bill / payment (even early)
  if (
    /\b(rechnung|zahlen|bezahlen|zusammen\s+oder\s+getrennt|mit\s+karte\s+zahlen|bar\s+zahlen)\b/i.test(
      lower
    )
  ) {
    return "request_bill";
  }

  // 3. Ask for recommendation
  if (
    /\b(empfehlen|empfehlung|was\s+ist\s+gut|was\s+haben\s+sie|was\s+gibt\s+es)\b/i.test(
      lower
    )
  ) {
    return "ask_recommendation";
  }

  // 4. Ask for price
  if (/\b(was\s+kostet|wie\s+viel\s+kostet|wieviel\s+kostet|preis|teuer)\b/i.test(lower)) {
    return "ask_price";
  }

  // 5. Order change / self-correction ("Nein, lieber...", "Doch keinen...", "Stattdessen...")
  const hasDrink = /\b(kaffee|wasser|tee|saft|cola|bier|milch|trinken)\b/i.test(lower);
  const hasFood =
    /\b(suppe|salat|schnitzel|kuchen|apfelstrudel|strudel|apfel|brot|brötchen|semmel|pizza|pasta|fisch|essen)\b/i.test(
      lower
    );

  if (
    /\b(lieber|doch\s+nicht|doch\s+kein|stattdessen|änderung|anders)\b/i.test(lower) &&
    (hasDrink || hasFood)
  ) {
    return "change_order";
  }

  // 6. Ordering both drink and food
  if (hasDrink && hasFood) {
    return "order_drink_and_food";
  }

  // 7. Ordering drink or food
  if (hasDrink) {
    return "order_drink";
  }
  if (hasFood) {
    return "order_food";
  }

  // 8. Polite decline ("Nein, danke", "Das ist alles", "Sonst nichts")
  if (
    /\b(nein\s*,?\s*danke|nein|nichts\s+mehr|das\s+ist\s+alles|sonst\s+nichts|kein\s+bedarf)\b/i.test(
      lower
    )
  ) {
    return "decline_more";
  }

  // 9. Affirmative ("Ja, bitte", "Ja, gerne")
  if (/\b(ja\s*,?\s*bitte|ja\s*,?\s*gern|ja\s*,?\s*gerne|gerne|klar|natürlich|ja)\b/i.test(lower)) {
    return "affirmative";
  }

  // 10. Greeting or asking for table / menu
  if (
    /\b(guten\s+abend|guten\s+tag|hallo|servus|grüß\s+gott|tisch\s+für|speisekarte)\b/i.test(
      lower
    )
  ) {
    return "greeting_or_table";
  }

  return "unexpected_or_other";
}

/**
 * Generalized German A1 Mistake & Linguistic Analyzer.
 * Implements the "Do Not Over-Correct" principle:
 * - Material grammar/meaning errors trigger Coach Mode retry (`requiresCoachRetry: true`).
 * - Minor stylistic redundancies (e.g. "Ich möchte einen Kaffee haben bitte.") or elliptical orders ("Einen Kaffee.")
 *   do NOT block conversation flow (`requiresCoachRetry: false`), offering at most a gentle non-blocking tip.
 * - Low-confidence or unknown sentences never fabricate a false mistake.
 */
export function analyzeGermanUtterance(
  text: string,
  dayNumber = 5
): UtteranceAnalysisResult {
  const raw = text.trim();
  const lower = raw.toLowerCase();
  const intent = recognizeRestaurantIntent(raw);

  const wordsDetected: { german: string; english: string }[] = [];
  const orderedItemsExtracted: string[] = [];
  const communicativeStrengths: string[] = [];
  const correctStructuresUsed: MistakeCategory[] = [];

  VOCAB_CATALOG.forEach((v) => {
    if (v.match.test(raw)) {
      wordsDetected.push({ german: v.german, english: v.english });
      if (v.kind === "drink" || v.kind === "food") {
        orderedItemsExtracted.push(v.german);
      }
    }
  });

  // Track positive structures used by the learner (for Mastery & Recovery!)
  if (
    /\b(ich\s+möchte|ich\s+hätte\s+gern|ich\s+hätte\s+gerne|ich\s+nehme|ich\s+bestelle|ich\s+trinke|ich\s+esse)\b/i.test(
      raw
    )
  ) {
    correctStructuresUsed.push("verb_conjugation");
    correctStructuresUsed.push("verb_position");
    communicativeStrengths.push(
      "Used accurate verb conjugation and V2 word order ('Ich möchte...' / 'Ich hätte gern...' / 'Ich nehme...')"
    );
  }

  if (
    /\b(einen\s+kaffee|einen\s+salat|einen\s+kuchen|einen\s+apfel|einen\s+apfelstrudel|einen\s+tee|einen\s+saft)\b/i.test(
      raw
    )
  ) {
    correctStructuresUsed.push("accusative_case");
    correctStructuresUsed.push("article_gender");
    communicativeStrengths.push(
      "Applied masculine Accusative article ('einen') accurately"
    );
  }

  if (/\b(eine\s+suppe|ein\s+wasser|ein\s+schnitzel|das\s+schnitzel|die\s+rechnung)\b/i.test(raw)) {
    correctStructuresUsed.push("article_gender");
  }

  if (/\b(mit\s+meiner\s+freundin|mit\s+meinem\s+freund|mit\s+der\s+karte|zum\s+bahnhof|zur\s+universität)\b/i.test(raw)) {
    correctStructuresUsed.push("dative_case");
  }

  if (/\bbitte\b/i.test(raw) || /\bdanke\b/i.test(raw) || /\bfür\s+mich\b/i.test(raw)) {
    correctStructuresUsed.push("politeness_expression");
    communicativeStrengths.push("Used polite real-life phrasing ('bitte' / 'danke')");
  }

  // Handle "I don't understand" / slower / repeat recovery intents immediately (NEVER mark as a mistake!)
  if (
    intent === "comprehension_difficulty" ||
    intent === "request_slower" ||
    intent === "request_repeat"
  ) {
    communicativeStrengths.push(
      "Used an authentic German communication recovery phrase ('Ich verstehe nicht' / 'Bitte langsamer' / 'Noch einmal, bitte')"
    );
    return {
      intent,
      detectedMistake: null,
      requiresCoachRetry: false,
      recoverySupport: {
        type:
          intent === "comprehension_difficulty"
            ? "not_understood"
            : intent === "request_slower"
            ? "slower"
            : "repeat",
        simplifiedGerman:
          "Kein Problem! Ich frage einfach: Möchten Sie etwas trinken (zum Beispiel: einen Kaffee oder ein Wasser) oder etwas essen?",
        englishExplanation:
          "The waiter is asking what you would like to order. You can answer with a simple chunk like 'Einen Kaffee, bitte.' or 'Ich möchte einen Kaffee.'",
        suggestedReplies: [
          "Ich möchte einen Kaffee, bitte.",
          "Ein Wasser, bitte.",
          "Was empfehlen Sie?",
        ],
      },
      correctStructuresUsed,
      wordsDetected,
      orderedItemsExtracted,
      communicativeStrengths,
      confidence: "high",
      engineSource: "deterministic_rules",
    };
  }

  // -------------------------------------------------------------------------
  // MISTAKE RULE 1: Verb Position / Word Order (SOV in main clause, e.g. "Ich Kaffee möchte.", "Ich einen Kaffee möchte.")
  // -------------------------------------------------------------------------
  if (
    /^ich\s+(?:einen\s+|eine\s+|ein\s+|der\s+|die\s+|das\s+)?(kaffee|wasser|tee|saft|suppe|salat|schnitzel|kuchen|apfel|rechnung)\s+(möchte|nehme|will|trinke|esse|hätte)\b/i.test(
      raw
    )
  ) {
    const match = raw.match(
      /^ich\s+(?:einen\s+|eine\s+|ein\s+|der\s+|die\s+|das\s+)?(kaffee|wasser|tee|saft|suppe|salat|schnitzel|kuchen|apfel|rechnung)\s+(möchte|nehme|will|trinke|esse|hätte)/i
    )!;
    const nounRaw = match[1];
    const verbRaw = match[2].toLowerCase();
    const nounCapitalized =
      nounRaw.charAt(0).toUpperCase() + nounRaw.slice(1).toLowerCase();
    const isMasc = /^(kaffee|salat|kuchen|apfel|tee|saft)$/i.test(nounRaw);
    const isFem = /^(suppe|rechnung)$/i.test(nounRaw);
    const correctArticle = isMasc ? "einen" : isFem ? "eine" : "ein";
    const correctPhrase = `Ich ${verbRaw === "hätte" ? "hätte gern" : verbRaw} ${correctArticle} ${nounCapitalized}.`;

    return {
      intent,
      detectedMistake: {
        category: "verb_position",
        categoryLabel: "Verb Position / Word Order (V2 Rule)",
        word: `${verbRaw} (Position 2)`,
        learnerUsage: raw.replace(/[.!?]+$/, ""),
        correctUsage: correctPhrase.replace(/[.!?]+$/, ""),
        learnerSentence: raw,
        correctSentence: correctPhrase,
        englishTranslation: `I would like a ${nounRaw.toLowerCase()}, please.`,
        coachHeadline: "Almost right! Watch the verb position.",
        explanation: `In a German statement, the action verb ("${verbRaw}") must stand in Position 2 right after "Ich" → "${correctPhrase}"`,
        transformationSteps: [
          "Position 1: Subject (Ich)",
          `Position 2: Conjugated Verb (${verbRaw})`,
          `Object at the end: ${correctArticle} ${nounCapitalized}`,
        ],
        severity: "material",
        confidence: "high",
        context: `Day ${dayNumber} Restaurant Mission`,
      },
      requiresCoachRetry: true,
      correctStructuresUsed,
      wordsDetected,
      orderedItemsExtracted,
      communicativeStrengths,
      confidence: "high",
      engineSource: "deterministic_rules",
    };
  }

  // -------------------------------------------------------------------------
  // MISTAKE RULE 2: Verb Conjugation (e.g. "Ich wollen einen Kaffee.", "Ich möchten...", "Ich nehmen...", "Ich trinken...")
  // -------------------------------------------------------------------------
  const verbConjMatch = raw.match(
    /\bich\s+(wollen|möchten|nehmen|trinken|essen|bestellen|haben)\b/i
  );
  if (verbConjMatch) {
    const wrongVerb = verbConjMatch[1].toLowerCase();
    const verbFixMap: Record<
      string,
      { rightVerb: string; politeAlternative: string; ruleNote: string }
    > = {
      wollen: {
        rightVerb: "möchte",
        politeAlternative: "Ich möchte",
        ruleNote:
          'With "ich", "wollen" conjugates to "ich will", and in a restaurant "Ich möchte..." (I would like) is much more polite than "Ich wollen".',
      },
      möchten: {
        rightVerb: "möchte",
        politeAlternative: "Ich möchte",
        ruleNote:
          'With "ich", drop the "-n": say "Ich möchte..." ("wir/Sie möchten" uses -en).',
      },
      nehmen: {
        rightVerb: "nehme",
        politeAlternative: "Ich nehme",
        ruleNote:
          'With "ich", verb endings take "-e": "ich nehme" (not "ich nehmen").',
      },
      trinken: {
        rightVerb: "trinke",
        politeAlternative: "Ich trinke",
        ruleNote:
          'With "ich", use the "-e" ending: "ich trinke" (not "ich trinken").',
      },
      essen: {
        rightVerb: "esse",
        politeAlternative: "Ich esse",
        ruleNote: 'With "ich", use the "-e" ending: "ich esse" (not "ich essen").',
      },
      bestellen: {
        rightVerb: "bestelle",
        politeAlternative: "Ich bestelle",
        ruleNote:
          'With "ich", use the "-e" ending: "ich bestelle" (not "ich bestellen").',
      },
      haben: {
        rightVerb: "hätte gern",
        politeAlternative: "Ich hätte gern",
        ruleNote:
          'With "ich", "haben" is "ich habe", or politely in a restaurant: "Ich hätte gern...".',
      },
    };

    const fix = verbFixMap[wrongVerb];
    // Also fix any masculine article error in the same sentence so the corrected sentence is 100% clean
    let correctedSentence = raw
      .replace(
        new RegExp(`\\bich\\s+${wrongVerb}\\b`, "i"),
        fix.politeAlternative
      )
      .replace(/\b(eine|ein|der)\s+kaffee\b/i, "einen Kaffee")
      .replace(/\b(eine|ein|der)\s+salat\b/i, "einen Salat")
      .replace(/\b(eine|ein|der)\s+kuchen\b/i, "einen Kuchen");
    correctedSentence =
      correctedSentence.charAt(0).toUpperCase() +
      correctedSentence.slice(1).replace(/[.!?]*$/, ".");

    return {
      intent,
      detectedMistake: {
        category: "verb_conjugation",
        categoryLabel: "Verb Conjugation (ich-Form & Polite Ordering)",
        word: `ich ${wrongVerb}`,
        learnerUsage: `Ich ${wrongVerb}`,
        correctUsage: fix.politeAlternative,
        learnerSentence: raw,
        correctSentence: correctedSentence,
        englishTranslation: "I would like a coffee, please.",
        coachHeadline: "Almost right! Watch the verb conjugation.",
        explanation: fix.ruleNote,
        transformationSteps: [
          `Infinitive / Plural: ${wrongVerb}`,
          `1st Person Singular (ich): ${fix.politeAlternative}`,
          `Ich ${wrongVerb} → ${fix.politeAlternative}`,
        ],
        severity: "material",
        confidence: "high",
        context: `Day ${dayNumber} Restaurant Mission`,
      },
      requiresCoachRetry: true,
      correctStructuresUsed,
      wordsDetected,
      orderedItemsExtracted,
      communicativeStrengths,
      confidence: "high",
      engineSource: "deterministic_rules",
    };
  }

  // -------------------------------------------------------------------------
  // MISTAKE RULE 3: Masculine Accusative Case (e.g. "Ich möchte eine Kaffee.", "Ich möchte ein Kaffee.", "Für mich eine Salat.")
  // -------------------------------------------------------------------------
  const masculineNouns: {
    noun: string;
    english: string;
    wrongRegex: RegExp;
  }[] = [
    {
      noun: "Kaffee",
      english: "coffee",
      wrongRegex: /\b(eine|ein|der)\s+kaffee\b/i,
    },
    {
      noun: "Salat",
      english: "salad",
      wrongRegex: /\b(eine|ein|der)\s+(?:großen\s+|gemischten\s+)?salat\b/i,
    },
    {
      noun: "Kuchen",
      english: "cake",
      wrongRegex: /\b(eine|ein|der)\s+kuchen\b/i,
    },
    {
      noun: "Apfelstrudel",
      english: "apple strudel",
      wrongRegex: /\b(eine|ein|der)\s+apfelstrudel\b/i,
    },
    {
      noun: "Apfel",
      english: "apple",
      wrongRegex: /\b(eine|ein|der)\s+apfel\b/i,
    },
    {
      noun: "Tee",
      english: "tea",
      wrongRegex: /\b(eine|ein|der)\s+tee\b/i,
    },
    {
      noun: "Saft",
      english: "juice",
      wrongRegex: /\b(eine|ein|der)\s+(?:apfel|orangen)?saft\b/i,
    },
  ];

  // Ensure it's not a nominative subject sentence like "Der Kaffee ist gut" or "Ein Kaffee kostet..."
  const isNominativeSubjectSentence =
    /^(der|ein)\s+(kaffee|salat|kuchen|apfel|tee|saft)\s+(ist|kostet|schmeckt|kommt)\b/i.test(
      raw
    );

  if (!isNominativeSubjectSentence) {
    for (const item of masculineNouns) {
      const match = raw.match(item.wrongRegex);
      if (match) {
        const wrongArticle = match[1];
        const learnerUsage = `${wrongArticle} ${item.noun}`;
        const correctUsage = `einen ${item.noun}`;
        const correctedFull = raw.replace(
          item.wrongRegex,
          `einen ${item.noun}`
        );
        const formattedCorrect =
          correctedFull.charAt(0).toUpperCase() +
          correctedFull.slice(1).replace(/[.!?]*$/, ".");

        return {
          intent,
          detectedMistake: {
            category: "accusative_case",
            categoryLabel: "Accusative / masculine noun",
            word: `der ${item.noun}`,
            learnerUsage,
            correctUsage,
            learnerSentence: raw,
            correctSentence: formattedCorrect,
            englishTranslation: `I would like a ${item.english}, please.`,
            coachHeadline: "Almost right! Use the masculine accusative case (einen).",
            explanation: `"der ${item.noun}" is a masculine noun. When ordering ("Ich möchte..." / "Für mich..."), masculine nouns take "einen" → "${correctUsage}".`,
            transformationSteps: [
              `der ${item.noun} (masculine noun)`,
              `Direct object (Accusative): der → den | ein/eine → einen`,
              `${learnerUsage} → ${correctUsage}`,
            ],
            severity: "material",
            confidence: "high",
            context: `Day ${dayNumber} Restaurant Mission`,
          },
          requiresCoachRetry: true,
          correctStructuresUsed,
          wordsDetected,
          orderedItemsExtracted,
          communicativeStrengths,
          confidence: "high",
          engineSource: "deterministic_rules",
        };
      }
    }
  }

  // -------------------------------------------------------------------------
  // MISTAKE RULE 4: Nominative Case error ("Einen Kaffee kostet...", "Einen Kaffee ist...")
  // -------------------------------------------------------------------------
  if (/^einen\s+(kaffee|salat|kuchen|tee|saft)\s+(ist|kostet|schmeckt)\b/i.test(raw)) {
    const m = raw.match(/^einen\s+(kaffee|salat|kuchen|tee|saft)\s+(ist|kostet|schmeckt)/i)!;
    const noun = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    const corrected = raw.replace(/^einen\s+\w+/i, `Der ${noun}`);
    return {
      intent,
      detectedMistake: {
        category: "nominative_case",
        categoryLabel: "Nominative Subject (der / ein)",
        word: `der ${noun}`,
        learnerUsage: `Einen ${noun}`,
        correctUsage: `Der ${noun}`,
        learnerSentence: raw,
        correctSentence: corrected,
        englishTranslation: `The ${noun.toLowerCase()} is...`,
        coachHeadline: "Almost right! Subject stays in the nominative case (der/ein).",
        explanation: `Here "${noun}" is the subject of "${m[2]}", so it stays in the Nominative case ("Der ${noun}" or "Ein ${noun}").`,
        transformationSteps: [
          `Subject of "${m[2]}" = Nominative`,
          `Einen ${noun} → Der ${noun}`,
        ],
        severity: "material",
        confidence: "high",
        context: `Day ${dayNumber} Restaurant Mission`,
      },
      requiresCoachRetry: true,
      correctStructuresUsed,
      wordsDetected,
      orderedItemsExtracted,
      communicativeStrengths,
      confidence: "high",
      engineSource: "deterministic_rules",
    };
  }

  // -------------------------------------------------------------------------
  // MISTAKE RULE 5: Feminine / Neuter Article & Gender ("einen Suppe", "eine Wasser", "der Rechnung", "eine Schnitzel")
  // -------------------------------------------------------------------------
  if (/\b(einen|ein|der|das)\s+suppe\b/i.test(raw)) {
    const match = raw.match(/\b(einen|ein|der|das)\s+suppe\b/i)!;
    const learnerUsage = `${match[1]} Suppe`;
    const correctedFull = raw.replace(
      /\b(einen|ein|der|das)\s+suppe\b/i,
      "eine Suppe"
    );
    return {
      intent,
      detectedMistake: {
        category: "article_gender",
        categoryLabel: "Article / Noun Gender (der / die / das)",
        word: "die Suppe",
        learnerUsage,
        correctUsage: "eine Suppe",
        learnerSentence: raw,
        correctSentence:
          correctedFull.charAt(0).toUpperCase() +
          correctedFull.slice(1).replace(/[.!?]*$/, "."),
        englishTranslation: "A soup, please.",
        coachHeadline: "Almost right! 'die Suppe' is feminine (eine Suppe).",
        explanation:
          '"die Suppe" is feminine ("die"), so "a soup" is always "eine Suppe".',
        transformationSteps: [
          "die Suppe (feminine noun)",
          `${learnerUsage} → eine Suppe`,
        ],
        severity: "material",
        confidence: "high",
        context: `Day ${dayNumber} Restaurant Mission`,
      },
      requiresCoachRetry: true,
      correctStructuresUsed,
      wordsDetected,
      orderedItemsExtracted,
      communicativeStrengths,
      confidence: "high",
      engineSource: "deterministic_rules",
    };
  }

  if (/\b(einen|eine|der|die)\s+(wasser|schnitzel|brot|brötchen)\b/i.test(raw)) {
    const match = raw.match(
      /\b(einen|eine|der|die)\s+(wasser|schnitzel|brot|brötchen)\b/i
    )!;
    const noun =
      match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
    const learnerUsage = `${match[1]} ${noun}`;
    const targetArt = /^(der|die)$/i.test(match[1]) ? "das" : "ein";
    const correctUsage = `${targetArt} ${noun}`;
    const correctedFull = raw.replace(
      /\b(einen|eine|der|die)\s+(wasser|schnitzel|brot|brötchen)\b/i,
      correctUsage
    );
    return {
      intent,
      detectedMistake: {
        category: "article_gender",
        categoryLabel: "Article / Noun Gender (der / die / das)",
        word: `das ${noun}`,
        learnerUsage,
        correctUsage,
        learnerSentence: raw,
        correctSentence:
          correctedFull.charAt(0).toUpperCase() +
          correctedFull.slice(1).replace(/[.!?]*$/, "."),
        englishTranslation: `A ${noun.toLowerCase()}, please.`,
        coachHeadline: "Almost right! Neuter nouns take 'ein' or 'das'.",
        explanation: `"das ${noun}" is neuter ("das"), so use "${correctUsage}".`,
        transformationSteps: [
          `das ${noun} (neuter noun)`,
          `${learnerUsage} → ${correctUsage}`,
        ],
        severity: "material",
        confidence: "high",
        context: `Day ${dayNumber} Restaurant Mission`,
      },
      requiresCoachRetry: true,
      correctStructuresUsed,
      wordsDetected,
      orderedItemsExtracted,
      communicativeStrengths,
      confidence: "high",
      engineSource: "deterministic_rules",
    };
  }

  if (/\b(der|das|einen|ein)\s+rechnung\b/i.test(raw)) {
    const match = raw.match(/\b(der|das|einen|ein)\s+rechnung\b/i)!;
    const learnerUsage = `${match[1]} Rechnung`;
    return {
      intent,
      detectedMistake: {
        category: "article_gender",
        categoryLabel: "Article / Noun Gender (der / die / das)",
        word: "die Rechnung",
        learnerUsage,
        correctUsage: "die Rechnung",
        learnerSentence: raw,
        correctSentence: "Die Rechnung, bitte.",
        englishTranslation: "The bill, please.",
        coachHeadline: "Almost right! 'die Rechnung' is feminine (Die Rechnung, bitte).",
        explanation:
          'All German nouns ending in "-ung" are feminine ("die") → "Die Rechnung, bitte."',
        transformationSteps: [
          "die Rechnung (-ung is always feminine 'die')",
          `${learnerUsage} → Die Rechnung, bitte.`,
        ],
        severity: "material",
        confidence: "high",
        context: `Day ${dayNumber} Restaurant Mission`,
      },
      requiresCoachRetry: true,
      correctStructuresUsed,
      wordsDetected,
      orderedItemsExtracted,
      communicativeStrengths,
      confidence: "high",
      engineSource: "deterministic_rules",
    };
  }

  // -------------------------------------------------------------------------
  // MISTAKE RULE 6: Dative Case ("mit meine Freundin", "mit die Karte")
  // -------------------------------------------------------------------------
  if (/\bmit\s+(meine|die)\s+(freundin|karte|schwester)\b/i.test(raw)) {
    const m = raw.match(/\bmit\s+(meine|die)\s+(freundin|karte|schwester)\b/i)!;
    const det = m[1].toLowerCase() === "meine" ? "meiner" : "der";
    const noun = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
    const learnerUsage = `mit ${m[1]} ${noun}`;
    const correctUsage = `mit ${det} ${noun}`;
    const correctedFull = raw.replace(
      /\bmit\s+(meine|die)\s+(freundin|karte|schwester)\b/i,
      correctUsage
    );
    return {
      intent,
      detectedMistake: {
        category: "dative_case",
        categoryLabel: "Dative Case (mit + Dativ)",
        word: `die ${noun}`,
        learnerUsage,
        correctUsage,
        learnerSentence: raw,
        correctSentence: correctedFull,
        englishTranslation: `with my ${noun.toLowerCase()}`,
        coachHeadline: "Almost right! 'mit' takes the dative case (mit meiner...).",
        explanation: `"mit" always requires the Dative case: die ${noun} → ${correctUsage}.`,
        transformationSteps: [
          `die ${noun} (feminine)`,
          `After "mit" (Dative): die → der | meine → meiner`,
          `${learnerUsage} → ${correctUsage}`,
        ],
        severity: "material",
        confidence: "high",
        context: `Day ${dayNumber} Mission`,
      },
      requiresCoachRetry: true,
      correctStructuresUsed,
      wordsDetected,
      orderedItemsExtracted,
      communicativeStrengths,
      confidence: "high",
      engineSource: "deterministic_rules",
    };
  }

  // -------------------------------------------------------------------------
  // RULE 7: Bare / Incomplete 1-2 Word Fragment Without Article ("Kaffee.", "Bitte Kaffee.", "Wasser.")
  // -------------------------------------------------------------------------
  const bareFragmentMatch = raw.match(
    /^(?:bitte\s+)?(kaffee|salat|kuchen|suppe|wasser|schnitzel|tee|saft)(?:\s*,?\s*bitte)?[.!?]*$/i
  );
  if (bareFragmentMatch) {
    const nounRaw = bareFragmentMatch[1];
    const nounCap =
      nounRaw.charAt(0).toUpperCase() + nounRaw.slice(1).toLowerCase();
    const isMasc = /^(kaffee|salat|kuchen|tee|saft)$/i.test(nounRaw);
    const isFem = /^suppe$/i.test(nounRaw);
    const art = isMasc ? "Einen" : isFem ? "Eine" : "Ein";
    const baseArt = isMasc ? "der" : isFem ? "die" : "das";
    const politeChunk = `${art} ${nounCap}, bitte.`;

    return {
      intent,
      detectedMistake: {
        category: "missing_word",
        categoryLabel: "Missing Article / Polite Ordering Chunk",
        word: `${baseArt} ${nounCap}`,
        learnerUsage: raw.replace(/[.!?]+$/, ""),
        correctUsage: `${art} ${nounCap}, bitte`,
        learnerSentence: raw,
        correctSentence: politeChunk,
        englishTranslation: `A ${nounRaw.toLowerCase()}, please.`,
        coachHeadline: "Almost right! Add the article for a natural order.",
        explanation: `In Austria and Germany, include the article ("${art.toLowerCase()} ${nounCap}") and "bitte": "${politeChunk}" or "Ich möchte ${art.toLowerCase()} ${nounCap}, bitte."`,
        transformationSteps: [
          `${baseArt} ${nounCap}`,
          `Short polite order: "${politeChunk}"`,
          `Full sentence: "Ich möchte ${art.toLowerCase()} ${nounCap}, bitte."`,
        ],
        severity: "material",
        confidence: "high",
        context: `Day ${dayNumber} Restaurant Mission`,
      },
      requiresCoachRetry: true,
      correctStructuresUsed,
      wordsDetected,
      orderedItemsExtracted,
      communicativeStrengths,
      confidence: "high",
      engineSource: "deterministic_rules",
    };
  }

  // -------------------------------------------------------------------------
  // RULE 8: DO NOT OVER-CORRECT PRINCIPLE!
  // Handle valid elliptical orders ("Einen Kaffee.") or redundant "haben" ("Ich möchte einen Kaffee haben bitte.")
  // without blocking the learner or treating it as a failure!
  // -------------------------------------------------------------------------
  if (/\bich\s+möchte\b.*\bhaben\b/i.test(raw)) {
    const cleaner = raw
      .replace(/\s+haben\b/i, "")
      .replace(/\s+bitte[.!?]*$/i, ", bitte.");
    return {
      intent,
      detectedMistake: null,
      requiresCoachRetry: false,
      minorCoachingTip: `Your meaning and "${
        orderedItemsExtracted[0] || "order"
      }" are completely clear! Small tip: with "Ich möchte...", you don't need "haben" at the end — "${cleaner}" sounds even more natural.`,
      correctStructuresUsed,
      wordsDetected,
      orderedItemsExtracted,
      communicativeStrengths:
        communicativeStrengths.length > 0
          ? communicativeStrengths
          : ["Communicated your restaurant order clearly"],
      confidence: "high",
      engineSource: "deterministic_rules",
    };
  }

  if (
    /^(einen\s+kaffee|einen\s+salat|einen\s+kuchen|einen\s+tee|einen\s+saft|eine\s+suppe|ein\s+wasser|ein\s+schnitzel|das\s+schnitzel)[.!?]*$/i.test(
      raw
    )
  ) {
    return {
      intent,
      detectedMistake: null,
      requiresCoachRetry: false,
      minorCoachingTip: `Correct article ("${raw.replace(
        /[.!?]+$/,
        ""
      )}")! In a Viennese café or restaurant, adding ", bitte" makes a short order extra polite.`,
      correctStructuresUsed,
      wordsDetected,
      orderedItemsExtracted,
      communicativeStrengths:
        communicativeStrengths.length > 0
          ? communicativeStrengths
          : ["Used the correct Accusative article in a short order"],
      confidence: "high",
      engineSource: "deterministic_rules",
    };
  }

  return {
    intent,
    detectedMistake: null,
    requiresCoachRetry: false,
    correctStructuresUsed,
    wordsDetected,
    orderedItemsExtracted,
    communicativeStrengths:
      communicativeStrengths.length > 0
        ? communicativeStrengths
        : ["Communicated naturally in German"],
    confidence: intent === "unexpected_or_other" ? "low" : "high",
    engineSource: "deterministic_rules",
  };
}

/**
 * Extracts all items ordered so far from the conversation history + current turn.
 */
export function extractOrderedItemsFromHistory(
  history: { sender: "ai" | "user"; german: string }[],
  currentMessage: string
): string[] {
  const combinedUserText = [
    ...history.filter((m) => m.sender === "user").map((m) => m.german),
    currentMessage,
  ].join(" ");

  const items: string[] = [];
  VOCAB_CATALOG.forEach((v) => {
    if ((v.kind === "drink" || v.kind === "food") && v.match.test(combinedUserText)) {
      if (!items.includes(v.german)) {
        items.push(v.german);
      }
    }
  });
  return items;
}

/**
 * Stateful, context-aware Restaurant Waiter Dialogue Generator.
 * Handles order changes, questions ("Was empfehlen Sie?", "Was kostet das?"),
 * "Nein, danke", "Ja, bitte", "Ich verstehe nicht", multiple items, and early bill requests
 * without losing context or restarting the scenario.
 */
export function buildContextualWaiterResponse(params: {
  dayNumber: number;
  userMessage: string;
  turnCount: number;
  intent: RestaurantIntent;
  conversationHistory?: { sender: "ai" | "user"; german: string }[];
}): {
  aiReplyDe: string;
  aiReplyEn: string;
  missionComplete: boolean;
  orderedItemsSoFar: string[];
} {
  const {
    dayNumber,
    userMessage,
    turnCount,
    intent,
    conversationHistory = [],
  } = params;

  const orderedItemsSoFar = extractOrderedItemsFromHistory(
    conversationHistory,
    userMessage
  );
  const lastAiMsg =
    [...conversationHistory].reverse().find((m) => m.sender === "ai")?.german ||
    "";

  // Non-restaurant days (Days 1-4, 6, 7)
  if (dayNumber !== 5) {
    if (
      intent === "comprehension_difficulty" ||
      intent === "request_slower" ||
      intent === "request_repeat"
    ) {
      return {
        aiReplyDe:
          "Kein Problem, ich spreche langsamer! Wie kann ich Ihnen heute helfen?",
        aiReplyEn:
          "No problem, I will speak more slowly! How can I help you today?",
        missionComplete: false,
        orderedItemsSoFar,
      };
    }
    if (turnCount >= 2) {
      return {
        aiReplyDe:
          "Perfekt, vielen Dank! Das hat wunderbar geklappt. Einen schönen Tag noch in Wien!",
        aiReplyEn:
          "Perfect, thank you very much! That worked wonderfully. Have a great day in Vienna!",
        missionComplete: true,
        orderedItemsSoFar,
      };
    }
    return {
      aiReplyDe: "Sehr gut! Und haben Sie noch eine Frage oder einen Wunsch?",
      aiReplyEn: "Very good! And do you have another question or request?",
      missionComplete: false,
      orderedItemsSoFar,
    };
  }

  // DAY 5 RESTAURANT WAITER CONTEXTUAL STATE MACHINE
  switch (intent) {
    case "comprehension_difficulty":
      return {
        aiReplyDe:
          "Kein Problem! Ich helfe Ihnen gern: Möchten Sie etwas trinken — zum Beispiel einen Kaffee oder ein Wasser — oder etwas essen?",
        aiReplyEn:
          "No problem! I'm happy to help: Would you like something to drink — for example a coffee or a water — or something to eat?",
        missionComplete: false,
        orderedItemsSoFar,
      };

    case "request_slower":
      return {
        aiReplyDe:
          "Natürlich, gerne langsamer: Was ... möchten ... Sie ... bestellen? Einen Kaffee, ein Wasser oder etwas zu essen?",
        aiReplyEn:
          "Of course, gladly slower: What ... would ... you ... like ... to order? A coffee, a water, or something to eat?",
        missionComplete: false,
        orderedItemsSoFar,
      };

    case "request_repeat":
      return {
        aiReplyDe: lastAiMsg
          ? `Gerne noch einmal: „${lastAiMsg}“`
          : "Gerne noch einmal: Was möchten Sie heute trinken oder essen?",
        aiReplyEn:
          "Gladly once again: What would you like to drink or eat today?",
        missionComplete: false,
        orderedItemsSoFar,
      };

    case "ask_recommendation":
      return {
        aiReplyDe:
          "Heute empfehle ich unsere frische Tagessuppe, das Wiener Schnitzel oder einen Apfelstrudel zum Kaffee. Was klingt gut für Sie?",
        aiReplyEn:
          "Today I recommend our fresh soup of the day, the Wiener Schnitzel, or an apple strudel with coffee. What sounds good to you?",
        missionComplete: false,
        orderedItemsSoFar,
      };

    case "ask_price":
      return {
        aiReplyDe:
          "Ein Kaffee kostet 3,80 Euro, die Suppe 5,50 Euro, der Salat 6,20 Euro und das Wiener Schnitzel 14,50 Euro. Was darf ich Ihnen bringen?",
        aiReplyEn:
          "A coffee costs €3.80, the soup €5.50, the salad €6.20, and the Wiener Schnitzel €14.50. What may I bring you?",
        missionComplete: false,
        orderedItemsSoFar,
      };

    case "change_order":
      return {
        aiReplyDe:
          "Kein Problem, ich ändere Ihre Bestellung sofort! Möchten Sie sonst noch etwas dazu oder später die Rechnung?",
        aiReplyEn:
          "No problem, I'll change your order right away! Would you like anything else with that, or the bill later?",
        missionComplete: false,
        orderedItemsSoFar,
      };

    case "order_drink_and_food":
      return {
        aiReplyDe:
          "Ausgezeichnet! Ich bringe Ihr Getränk und das Essen sofort. Möchten Sie sonst noch etwas oder später die Rechnung?",
        aiReplyEn:
          "Excellent! I'll bring your drink and food right away. Would you like anything else, or the bill later?",
        missionComplete: false,
        orderedItemsSoFar,
      };

    case "order_drink": {
      const hasOrderedFoodAlready = orderedItemsSoFar.some((i) =>
        /suppe|salat|schnitzel|kuchen|apfelstrudel|brot|semmel/i.test(i)
      );
      if (hasOrderedFoodAlready) {
        return {
          aiReplyDe:
            "Sehr gerne, kommt sofort dazu! Wenn Sie fertig sind, sagen Sie einfach: „Die Rechnung, bitte.“",
          aiReplyEn:
            "Very gladly, coming right up! When you are ready, simply say: 'Die Rechnung, bitte.'",
          missionComplete: false,
          orderedItemsSoFar,
        };
      }
      return {
        aiReplyDe: "Gerne. Möchten Sie auch etwas essen?",
        aiReplyEn: "Gladly. Would you also like something to eat?",
        missionComplete: false,
        orderedItemsSoFar,
      };
    }

    case "order_food": {
      const hasOrderedDrinkAlready = orderedItemsSoFar.some((i) =>
        /kaffee|wasser|tee|saft/i.test(i)
      );
      if (hasOrderedDrinkAlready) {
        return {
          aiReplyDe:
            "Wunderbar, ich bringe alles zusammen! Möchten Sie danach noch etwas oder die Rechnung?",
          aiReplyEn:
            "Wonderful, I'll bring everything together! Would you like anything else afterwards or the bill?",
          missionComplete: false,
          orderedItemsSoFar,
        };
      }
      return {
        aiReplyDe:
          "Sehr gerne! Und was möchten Sie dazu trinken — vielleicht einen Kaffee oder ein Wasser?",
        aiReplyEn:
          "Very gladly! And what would you like to drink with that — perhaps a coffee or a water?",
        missionComplete: false,
        orderedItemsSoFar,
      };
    }

    case "decline_more": {
      if (orderedItemsSoFar.length > 0) {
        return {
          aiReplyDe:
            "Alles klar, vielen Dank! Ich bringe Ihre Bestellung sofort. Möchten Sie jetzt schon die Rechnung?",
          aiReplyEn:
            "All right, thank you! I'll bring your order right away. Would you like the bill now?",
          missionComplete: false,
          orderedItemsSoFar,
        };
      }
      return {
        aiReplyDe:
          "Kein Problem, nehmen Sie sich Zeit! Sagen Sie mir einfach Bescheid, wenn Sie bestellen möchten.",
        aiReplyEn:
          "No problem, take your time! Just let me know when you'd like to order.",
        missionComplete: false,
        orderedItemsSoFar,
      };
    }

    case "affirmative": {
      if (/rechnung|zahlen/i.test(lastAiMsg)) {
        return {
          aiReplyDe:
            "Natürlich, hier ist die Rechnung! Das macht zusammen 12,50 Euro. Vielen Dank für Ihren Besuch!",
          aiReplyEn:
            "Of course, here is the bill! That is €12.50 altogether. Thank you very much for your visit!",
          missionComplete: true,
          orderedItemsSoFar,
        };
      }
      return {
        aiReplyDe:
          "Sehr gerne! Was darf ich Ihnen bringen — zum Beispiel eine Suppe, einen Salat oder einen Kuchen?",
        aiReplyEn:
          "Very gladly! What may I bring you — for example a soup, a salad, or a cake?",
        missionComplete: false,
        orderedItemsSoFar,
      };
    }

    case "request_bill": {
      const priceText =
        orderedItemsSoFar.length >= 2
          ? "14,20 Euro"
          : orderedItemsSoFar.length === 1
          ? "3,80 Euro"
          : "12,50 Euro";
      return {
        aiReplyDe: `Natürlich, ich bringe sofort die Rechnung! Das macht zusammen ${priceText}. Vielen Dank für Ihren Besuch und einen schönen Abend!`,
        aiReplyEn: `Of course, I'll bring the bill right away! That comes to €${priceText.replace(
          " Euro",
          ""
        )} altogether. Thank you very much for your visit and have a nice evening!`,
        missionComplete: true,
        orderedItemsSoFar,
      };
    }

    case "greeting_or_table":
      return {
        aiReplyDe:
          "Guten Abend und herzlich willkommen! Hier ist die Speisekarte. Was möchten Sie trinken oder essen?",
        aiReplyEn:
          "Good evening and welcome! Here is the menu. What would you like to drink or eat?",
        missionComplete: false,
        orderedItemsSoFar,
      };

    default:
      if (turnCount >= 3 && orderedItemsSoFar.length > 0) {
        return {
          aiReplyDe:
            "Vielen Dank! Ich bringe Ihnen alles an den Tisch. Einen schönen Abend im Gasthaus!",
          aiReplyEn:
            "Thank you very much! I'll bring everything to your table. Have a wonderful evening at the restaurant!",
          missionComplete: true,
          orderedItemsSoFar,
        };
      }
      return {
        aiReplyDe:
          "Verstanden! Möchten Sie dazu einen Kaffee, ein Wasser oder etwas von der Speisekarte bestellen?",
        aiReplyEn:
          "Understood! Would you like to order a coffee, a water, or something from the menu with that?",
        missionComplete: false,
        orderedItemsSoFar,
      };
  }
}

/**
 * Evidence-Based Mastery & Recurrence Model:
 * - 1st mistake -> "Improving" (never treat 1 small slip as permanent weakness)
 * - 2+ recurring mistakes (without recovery) -> "Needs Practice"
 * - Subsequent correct usages of the same category -> recovers from "Needs Practice" -> "Improving" -> "Mastered"!
 */
export function computeMasteryStatusFromEvidence(
  occurrences: number,
  correctCountAfterMistake: number
): FocusStatus {
  if (correctCountAfterMistake >= 3) {
    return "Mastered";
  }
  if (occurrences >= 2 && correctCountAfterMistake === 0) {
    return "Needs Practice";
  }
  if (occurrences >= 2 && correctCountAfterMistake >= 1 && correctCountAfterMistake < 3) {
    return "Improving";
  }
  if (occurrences === 1 && correctCountAfterMistake >= 2) {
    return "Mastered";
  }
  return "Improving";
}

/**
 * Records a mistake into MistakeMemoryEntry[] with deduplication guard and recurrence/mastery rules.
 */
export function upsertMistakeInMemory(
  currentMemory: MistakeMemoryEntry[],
  mistake: DetectedMistake,
  dayNumber: number,
  nowIso = new Date().toISOString()
): MistakeMemoryEntry[] {
  // Ignore low-confidence or purely supportive notices
  if (
    mistake.confidence === "low" ||
    mistake.category === "comprehension_difficulty"
  ) {
    return currentMemory;
  }

  const existingIdx = currentMemory.findIndex(
    (m) =>
      m.category === mistake.category &&
      (m.word?.toLowerCase() === mistake.word.toLowerCase() ||
        m.category === mistake.category)
  );

  if (existingIdx !== -1) {
    const existing = currentMemory[existingIdx];

    // Deduplication guard: if identical learnerInput was recorded within the last 2 seconds, do not double-count
    if (
      existing.learnerInput.trim().toLowerCase() ===
        mistake.learnerSentence.trim().toLowerCase() &&
      existing.lastObservedAt &&
      Math.abs(new Date(nowIso).getTime() - new Date(existing.lastObservedAt).getTime()) < 2000
    ) {
      return currentMemory;
    }

    const newOccurrences = existing.occurrences + 1;
    // A new recurrence resets consecutive post-mistake recovery counter by 1 step so Needs Practice triggers accurately
    const adjustedCorrectAfter = Math.max(
      0,
      (existing.correctCountAfterMistake || 0) - 1
    );
    const newStatus = computeMasteryStatusFromEvidence(
      newOccurrences,
      adjustedCorrectAfter
    );

    const updatedEntry: MistakeMemoryEntry = {
      ...existing,
      categoryLabel: mistake.categoryLabel || existing.categoryLabel,
      word: mistake.word,
      learnerUsage: mistake.learnerUsage,
      correctUsage: mistake.correctUsage,
      status: newStatus,
      learnerInput: mistake.learnerSentence,
      correctGerman: mistake.correctSentence,
      whyExplanation: mistake.explanation,
      context: mistake.context || existing.context || `Day ${dayNumber}`,
      transformationSteps:
        mistake.transformationSteps.length > 0
          ? mistake.transformationSteps
          : existing.transformationSteps,
      occurrences: newOccurrences,
      correctCountAfterMistake: adjustedCorrectAfter,
      firstObservedDay: existing.firstObservedDay ?? existing.lastSeenDay,
      firstObservedAt: existing.firstObservedAt ?? nowIso,
      lastSeenDay: dayNumber,
      lastObservedAt: nowIso,
    };

    const others = currentMemory.filter((_, idx) => idx !== existingIdx);
    return [updatedEntry, ...others];
  }

  const newEntry: MistakeMemoryEntry = {
    id: `mm-${mistake.category}-${Date.now()}`,
    category: mistake.category,
    categoryLabel: mistake.categoryLabel,
    word: mistake.word,
    learnerUsage: mistake.learnerUsage,
    correctUsage: mistake.correctUsage,
    status: "Improving", // 1st time is Improving
    learnerInput: mistake.learnerSentence,
    correctGerman: mistake.correctSentence,
    whyExplanation: mistake.explanation,
    context: mistake.context || `Day ${dayNumber}`,
    transformationSteps: mistake.transformationSteps,
    occurrences: 1,
    correctCountAfterMistake: 0,
    firstObservedDay: dayNumber,
    firstObservedAt: nowIso,
    lastSeenDay: dayNumber,
    lastObservedAt: nowIso,
    followUpQuestion: {
      prompt: `Apply the correction for "${mistake.word}":`,
      options: Array.from(
        new Set([
          mistake.correctUsage,
          mistake.learnerUsage,
          mistake.word,
        ])
      ),
      correctAnswer: mistake.correctUsage,
      explanation: mistake.explanation,
    },
  };

  return [newEntry, ...currentMemory];
}

/**
 * Records correct usage of grammatical categories so learners can recover from
 * "Needs Practice" -> "Improving" -> "Mastered".
 */
export function recordCorrectStructuresInMemory(
  currentMemory: MistakeMemoryEntry[],
  categoriesUsedCorrectly: MistakeCategory[],
  nowIso = new Date().toISOString()
): MistakeMemoryEntry[] {
  if (categoriesUsedCorrectly.length === 0) return currentMemory;

  return currentMemory.map((entry) => {
    const matchesCategory =
      categoriesUsedCorrectly.includes(entry.category) ||
      (entry.category === "noun_gender" &&
        categoriesUsedCorrectly.includes("article_gender")) ||
      (entry.category === "article_gender" &&
        categoriesUsedCorrectly.includes("noun_gender"));

    if (!matchesCategory) return entry;

    const nextCorrectCount = (entry.correctCountAfterMistake || 0) + 1;
    const nextStatus = computeMasteryStatusFromEvidence(
      entry.occurrences,
      nextCorrectCount
    );

    return {
      ...entry,
      correctCountAfterMistake: nextCorrectCount,
      status: nextStatus,
      lastObservedAt: nowIso,
    };
  });
}

/**
 * Generates "PERSONAL REVIEW – 3 MINUTES" dynamically based on the learner's actual
 * unmastered weaknesses:
 * - Learner A (Accusative weakness) -> Accusative review (der Kaffee -> einen Kaffee)
 * - Learner B (Verb conjugation weakness) -> Verb conjugation review (ich möchte / ich nehme)
 * - Learner B2 (Verb position / word order weakness) -> V2 word order review
 * - Learner B3 (Dative weakness) -> Dative review (mit meiner Freundin)
 * - Learner B4 (Article / gender weakness) -> Article gender review (der / die / das)
 * - Learner C (No active unmastered weakness) -> Normal reinforcement (does NOT manufacture a fake weakness!)
 */
export function generatePersonalizedReviewBlock(
  mistakeMemory: MistakeMemoryEntry[]
): PersonalReviewBlock {
  // Filter to active weaknesses that are NOT yet Mastered/Strong
  const activeWeaknesses = mistakeMemory.filter(
    (m) => m.status === "Needs Practice" || m.status === "Improving"
  );

  // Prioritize "Needs Practice" over "Improving", then highest occurrences
  const sorted = [...activeWeaknesses].sort((a, b) => {
    if (a.status === "Needs Practice" && b.status !== "Needs Practice") return -1;
    if (b.status === "Needs Practice" && a.status !== "Needs Practice") return 1;
    return b.occurrences - a.occurrences;
  });

  const topMistake = sorted[0];

  // LEARNER C: No active recurring weakness! Do NOT manufacture one.
  if (!topMistake) {
    return {
      id: "personal-review-reinforcement",
      title: "DAILY REINFORCEMENT – 3 MINUTES",
      sourceCategory: "general_reinforcement",
      sourceCategoryLabel: "A1 Restaurant & Everyday Expressions (All Focus Areas Mastered)",
      triggerReason:
        "No recurring weaknesses detected! Your tracked focus areas are Strong/Mastered — here is a quick confidence reinforcement.",
      estimatedMinutes: 3,
      completed: false,
      isReinforcementOnly: true,
      items: [
        {
          id: "pr-reinf-1",
          baseWord: "Ich hätte gern...",
          targetForm: "Ich hätte gern einen Kaffee, bitte.",
          promptSentence: "Polite ordering in Vienna: „___ einen Kaffee, bitte.“",
          correctAnswer: "Ich hätte gern",
          options: ["Ich hätte gern", "Ich wollen", "Ich haben"],
          explanation: "'Ich hätte gern...' is a polite A1 chunk for ordering.",
        },
        {
          id: "pr-reinf-2",
          baseWord: "die Rechnung",
          targetForm: "Die Rechnung, bitte.",
          promptSentence: "Ready to pay: „___, bitte! Zusammen.“",
          correctAnswer: "Die Rechnung",
          options: ["Die Rechnung", "Der Rechnung", "Das Rechnung"],
          explanation: "Nouns ending in '-ung' are feminine: Die Rechnung, bitte.",
        },
      ],
    };
  }

  // LEARNER B: Verb Conjugation weakness
  if (topMistake.category === "verb_conjugation") {
    return {
      id: "personal-review-verb-conjugation",
      title: "PERSONAL REVIEW – 3 MINUTES",
      sourceCategory: "verb_conjugation",
      sourceCategoryLabel: "Verb Conjugation (ich möchte / ich nehme / Sie empfehlen)",
      triggerReason: `Generated from your recorded mistake: "${topMistake.learnerInput}" → "${topMistake.correctGerman}" (${topMistake.occurrences}x recorded)`,
      estimatedMinutes: 3,
      completed: false,
      isReinforcementOnly: false,
      items: [
        {
          id: "pr-verb-1",
          baseWord: "möchten (ich)",
          targetForm: "Ich möchte",
          promptSentence: "Im Restaurant: „___ (ich + möchten) einen Kaffee, bitte.“",
          correctAnswer: "Ich möchte",
          options: ["Ich möchte", "Ich wollen", "Ich möchten"],
          explanation:
            "With 'ich', use 'Ich möchte' (polite) or 'Ich will' — never 'Ich wollen' or 'Ich möchten'.",
        },
        {
          id: "pr-verb-2",
          baseWord: "nehmen (ich)",
          targetForm: "Ich nehme",
          promptSentence: "Hauptspeise: „___ (ich + nehmen) das Wiener Schnitzel.“",
          correctAnswer: "Ich nehme",
          options: ["Ich nehme", "Ich nehmen", "Ich nimmst"],
          explanation: "1st person singular ('ich') takes '-e': ich nehme.",
        },
        {
          id: "pr-verb-3",
          baseWord: "trinken (ich)",
          targetForm: "Ich trinke",
          promptSentence: "Getränk: „___ (ich + trinken) gern ein Glas Wasser.“",
          correctAnswer: "Ich trinke",
          options: ["Ich trinke", "Ich trinken", "Ich trinkt"],
          explanation: "With 'ich', drop '-en' and add '-e': ich trinke.",
        },
        {
          id: "pr-verb-4",
          baseWord: "empfehlen (Sie)",
          targetForm: "Was empfehlen Sie?",
          promptSentence: "Frage an den Kellner: „Was ___ (empfehlen) Sie heute?“",
          correctAnswer: "empfehlen",
          options: ["empfehlen", "empfiehlst", "empfehle"],
          explanation: "Formal 'Sie' takes the '-en' verb form: Was empfehlen Sie?",
        },
      ],
    };
  }

  // LEARNER B2: Verb Position / Word Order weakness
  if (
    topMistake.category === "verb_position" ||
    topMistake.category === "word_order" ||
    topMistake.category === "sentence_order"
  ) {
    return {
      id: "personal-review-verb-position",
      title: "PERSONAL REVIEW – 3 MINUTES",
      sourceCategory: topMistake.category,
      sourceCategoryLabel: "Verb Position in Statements (V2 Rule)",
      triggerReason: `Generated from your recorded word-order pattern: "${topMistake.learnerInput}" → "${topMistake.correctGerman}" (${topMistake.occurrences}x recorded)`,
      estimatedMinutes: 3,
      completed: false,
      isReinforcementOnly: false,
      items: [
        {
          id: "pr-v2-1",
          baseWord: "Ich + möchte + einen Kaffee",
          targetForm: "Ich möchte einen Kaffee.",
          promptSentence: "Put the verb in Position 2: (Ich / einen Kaffee / möchte)",
          correctAnswer: "Ich möchte einen Kaffee.",
          options: [
            "Ich möchte einen Kaffee.",
            "Ich einen Kaffee möchte.",
            "Möchte ich einen Kaffee.",
          ],
          explanation:
            "In German statements, the conjugated verb ('möchte') always stands in Position 2.",
        },
        {
          id: "pr-v2-2",
          baseWord: "Ich + nehme + die Suppe",
          targetForm: "Ich nehme die Suppe.",
          promptSentence: "Put the verb in Position 2: (Ich / die Suppe / nehme)",
          correctAnswer: "Ich nehme die Suppe.",
          options: [
            "Ich nehme die Suppe.",
            "Ich die Suppe nehme.",
            "Die Suppe ich nehme.",
          ],
          explanation: "Subject ('Ich') in Position 1 + Verb ('nehme') in Position 2.",
        },
      ],
    };
  }

  // LEARNER B3: Dative Case weakness
  if (topMistake.category === "dative_case") {
    return {
      id: "personal-review-dative",
      title: "PERSONAL REVIEW – 3 MINUTES",
      sourceCategory: "dative_case",
      sourceCategoryLabel: "Dative Case (mit + Dativ)",
      triggerReason: `Generated from your recorded pattern: "${topMistake.learnerInput}" → "${topMistake.correctGerman}" (${topMistake.occurrences}x recorded)`,
      estimatedMinutes: 3,
      completed: false,
      isReinforcementOnly: false,
      items: [
        {
          id: "pr-dat-1",
          baseWord: "die Freundin",
          targetForm: "mit meiner Freundin",
          promptSentence: "„Ich gehe ___ (mit + meine Freundin) ins Restaurant.“",
          correctAnswer: "mit meiner Freundin",
          options: [
            "mit meiner Freundin",
            "mit meine Freundin",
            "mit meinen Freundin",
          ],
          explanation:
            "'mit' always triggers the Dative case: die Freundin → mit meiner Freundin.",
        },
        {
          id: "pr-dat-2",
          baseWord: "der Freund",
          targetForm: "mit meinem Freund",
          promptSentence: "„Ich lerne heute ___ (mit + mein Freund).“",
          correctAnswer: "mit meinem Freund",
          options: ["mit meinem Freund", "mit mein Freund", "mit meiner Freund"],
          explanation:
            "Masculine 'der Freund' in Dative after 'mit' takes '-em': mit meinem Freund.",
        },
        {
          id: "pr-dat-3",
          baseWord: "die Karte",
          targetForm: "mit der Karte",
          promptSentence: "Im Restaurant: „Kann ich ___ (mit + die Karte) zahlen?“",
          correctAnswer: "mit der Karte",
          options: ["mit der Karte", "mit die Karte", "mit den Karte"],
          explanation: "Feminine 'die Karte' becomes 'mit der Karte' after 'mit'.",
        },
      ],
    };
  }

  // LEARNER B4: Article / Gender or Missing Word weakness
  if (
    topMistake.category === "article_gender" ||
    topMistake.category === "noun_gender" ||
    topMistake.category === "missing_word"
  ) {
    return {
      id: `personal-review-${topMistake.category}`,
      title: "PERSONAL REVIEW – 3 MINUTES",
      sourceCategory: topMistake.category,
      sourceCategoryLabel: "Noun Gender & Articles (der / die / das)",
      triggerReason: `Generated from your recorded pattern: "${topMistake.learnerInput}" → "${topMistake.correctGerman}" (${topMistake.occurrences}x recorded)`,
      estimatedMinutes: 3,
      completed: false,
      isReinforcementOnly: false,
      items: [
        {
          id: "pr-gen-1",
          baseWord: "die Suppe",
          targetForm: "eine Suppe",
          promptSentence: "Vorspeise: „Ich nehme ___ (die Suppe), bitte.“",
          correctAnswer: "eine Suppe",
          options: ["eine Suppe", "einen Suppe", "ein Suppe"],
          explanation: "'die Suppe' is feminine → 'eine Suppe'.",
        },
        {
          id: "pr-gen-2",
          baseWord: "das Wasser",
          targetForm: "ein Wasser",
          promptSentence: "Getränk: „Für mich ___ (das Wasser), bitte.“",
          correctAnswer: "ein Wasser",
          options: ["ein Wasser", "eine Wasser", "einen Wasser"],
          explanation: "'das Wasser' is neuter → 'ein Wasser'.",
        },
        {
          id: "pr-gen-3",
          baseWord: "die Rechnung",
          targetForm: "Die Rechnung",
          promptSentence: "Am Ende: „___ (Rechnung), bitte!“",
          correctAnswer: "Die Rechnung",
          options: ["Die Rechnung", "Der Rechnung", "Das Rechnung"],
          explanation: "All '-ung' nouns are feminine ('die') → 'Die Rechnung, bitte!'",
        },
      ],
    };
  }

  // LEARNER A: Accusative / Masculine Noun weakness (der Kaffee -> einen Kaffee)
  return {
    id: "personal-review-accusative",
    title: "PERSONAL REVIEW – 3 MINUTES",
    sourceCategory: "accusative_case",
    sourceCategoryLabel: "Accusative / Masculine Nouns (der → einen)",
    triggerReason: `Generated from your recorded mistake: "${topMistake.learnerInput}" → "${topMistake.correctGerman}" (${topMistake.occurrences}x recorded)`,
    estimatedMinutes: 3,
    completed: false,
    isReinforcementOnly: false,
    items: [
      {
        id: "pr-acc-1",
        baseWord: "der Kaffee",
        targetForm: "einen Kaffee",
        promptSentence: "Im Restaurant: „Ich möchte bitte ___ (der Kaffee).“",
        correctAnswer: "einen Kaffee",
        options: ["einen Kaffee", "eine Kaffee", "ein Kaffee"],
        explanation:
          "'der Kaffee' is masculine → direct object after 'Ich möchte' requires 'einen Kaffee'.",
      },
      {
        id: "pr-acc-2",
        baseWord: "der Kuchen",
        targetForm: "einen Kuchen",
        promptSentence: "Zum Nachtisch: „Ich nehme ___ (der Kuchen), bitte.“",
        correctAnswer: "einen Kuchen",
        options: ["einen Kuchen", "eine Kuchen", "ein Kuchen"],
        explanation:
          "'der Kuchen' (cake) is masculine → after 'Ich nehme', use 'einen Kuchen'.",
      },
      {
        id: "pr-acc-3",
        baseWord: "der Apfel",
        targetForm: "einen Apfel",
        promptSentence: "Zwischendurch: „Ich esse gern ___ (der Apfel).“",
        correctAnswer: "einen Apfel",
        options: ["einen Apfel", "eine Apfel", "ein Apfel"],
        explanation:
          "'der Apfel' (apple) is masculine → after 'Ich esse', use 'einen Apfel'.",
      },
      {
        id: "pr-acc-4",
        baseWord: "der Salat",
        targetForm: "einen Salat",
        promptSentence: "Als Vorspeise: „Ich bestelle ___ (der Salat), bitte.“",
        correctAnswer: "einen Salat",
        options: ["einen Salat", "eine Salat", "ein Salat"],
        explanation:
          "'der Salat' is masculine → after 'Ich bestelle', use 'einen Salat'.",
      },
    ],
  };
}

/**
 * Evidence-Based Real-World Readiness Evaluator.
 * Rules:
 * 1. "Not Started": 0 steps completed and mission not attempted.
 * 2. "Practice Needed": Relevant mistake category for that day has status === "Needs Practice" in mistakeMemory,
 *    OR the day's mission had unresolved mistakes (`unresolvedMistakesCount > 0`) that haven't been recovered yet,
 *    OR mission score < 80.
 * 3. "Ready": Requires meaningful evidence:
 *    - Core learning steps completed (at least 5/8 steps including Vocabulary, Grammar, and Real-Life Mission)
 *    - Mission completed with score >= 80
 *    - Zero active "Needs Practice" mistakes for that capability.
 * 4. "Learning": Any intermediate state where learning has begun (>0 steps) or mission was attempted without full step completion.
 */
export function evaluateRealWorldReadiness(
  days: LearningDay[],
  mistakeMemory: MistakeMemoryEntry[] = [],
  lastMissionFeedback: Record<number, MissionCompletionFeedback> = {}
): RealWorldReadinessItem[] {
  const capabilityMap: Record<
    number,
    { title: string; location: string; relevantCategories: MistakeCategory[] }
  > = {
    1: {
      title: "Introducing yourself to another student",
      location: "Student Dormitory, Vienna",
      relevantCategories: ["verb_conjugation", "verb_position"],
    },
    2: {
      title: "Ordering bread and coffee at a bakery",
      location: "Bäckerei Mann, Vienna",
      relevantCategories: ["accusative_case", "article_gender", "noun_gender"],
    },
    3: {
      title: "Buying a train ticket at the station",
      location: "Wien Hauptbahnhof (ÖBB)",
      relevantCategories: ["dative_case", "verb_position"],
    },
    4: {
      title: "Asking someone for street directions",
      location: "Karlsplatz / MuseumsQuartier, Vienna",
      relevantCategories: ["dative_case", "article_gender"],
    },
    5: {
      title: "Ordering at a restaurant",
      location: "Gasthaus Pöschl, Vienna",
      relevantCategories: [
        "accusative_case",
        "verb_conjugation",
        "verb_position",
        "article_gender",
        "noun_gender",
        "missing_word",
      ],
    },
    6: {
      title: "Introducing yourself at university",
      location: "University of Vienna Campus",
      relevantCategories: ["dative_case", "verb_conjugation"],
    },
    7: {
      title: "Navigating 'A Day in Vienna' independently",
      location: "5-Stop Vienna Real-Life Challenge",
      relevantCategories: [
        "accusative_case",
        "dative_case",
        "verb_conjugation",
        "verb_position",
      ],
    },
  };

  return days
    .filter((d) => d.dayNumber <= 7)
    .map((d) => {
      const meta = capabilityMap[d.dayNumber] || {
        title: d.goalTitle,
        location: d.theme,
        relevantCategories: ["accusative_case"],
      };

      const completedCount = d.activities.filter((a) => a.completed).length;
      const missionAct = d.activities.find((a) => a.type === "ai_conversation");
      const vocabAct = d.activities.find((a) => a.type === "vocabulary");
      const grammarAct = d.activities.find((a) => a.type === "grammar");
      const missionFeedback = lastMissionFeedback[d.dayNumber];
      const missionDone = Boolean(missionAct?.completed || missionFeedback);

      // Check if learner has an active "Needs Practice" mistake relevant to this day
      const activeDayWeaknesses = mistakeMemory.filter(
        (m) =>
          m.status === "Needs Practice" &&
          meta.relevantCategories.includes(m.category) &&
          m.lastSeenDay === d.dayNumber
      );

      const unresolvedMistakesCount = activeDayWeaknesses.length;

      let status: "Not Started" | "Learning" | "Practice Needed" | "Ready" =
        "Not Started";
      let evidenceSummary =
        "Not started yet. Begin Today's Mission and Vocabulary to unlock.";

      if (completedCount === 0 && !missionDone) {
        status = "Not Started";
      } else if (
        unresolvedMistakesCount > 0 ||
        (missionDone && (missionAct?.score ?? 90) < 80)
      ) {
        status = "Practice Needed";
        const weakDesc =
          activeDayWeaknesses.length > 0
            ? activeDayWeaknesses
                .map((w) => `${w.word || w.categoryLabel} (${w.learnerUsage} → ${w.correctUsage})`)
                .join(", ")
            : "recurring grammar/article slips";
        evidenceSummary = `Practice Needed: Recurring mistake pattern detected in ${weakDesc}. Complete the 3-Minute Personal Review or use the structure accurately in a retry to reach Ready.`;
      } else if (
        missionDone &&
        completedCount >= 5 &&
        Boolean(vocabAct?.completed) &&
        Boolean(grammarAct?.completed)
      ) {
        status = "Ready";
        evidenceSummary = `Verified Ready: ${completedCount}/8 daily steps (including Vocabulary, Grammar & Real-Life Mission) completed with no unresolved recurring mistakes.`;
      } else {
        status = "Learning";
        evidenceSummary = `${completedCount}/8 daily steps completed (${
          vocabAct?.completed ? "Vocabulary ✓" : "Vocabulary pending"
        }, ${grammarAct?.completed ? "Grammar ✓" : "Grammar pending"}, ${
          missionDone ? "Mission ✓" : "Mission pending"
        }). Complete core learning steps and the Real-Life Mission to prove readiness.`;
      }

      return {
        id: `readiness-d${d.dayNumber}`,
        dayNumber: d.dayNumber,
        capabilityTitle: meta.title,
        locationContext: meta.location,
        status,
        evidenceSummary,
        vocabMasteredCount: vocabAct?.completed
          ? d.vocabulary.length
          : Math.min(2, completedCount),
        vocabTotalCount: d.vocabulary.length,
        missionCompleted: missionDone,
        missionModeUsed: missionFeedback?.mode,
        unresolvedMistakesCount,
        lastUpdatedAt: new Date().toISOString(),
      };
    });
}
