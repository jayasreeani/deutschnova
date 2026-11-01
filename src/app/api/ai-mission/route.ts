import { NextRequest, NextResponse } from "next/server";
import {
  analyzeGermanUtterance,
  buildContextualWaiterResponse,
} from "@/lib/germanTutorEngine";

interface MissionRequestPayload {
  dayNumber?: number;
  mode?: "coach" | "real_life";
  learnerMessage?: string;
  userMessage?: string;
  turnIndex?: number;
  turnCount?: number;
  conversationHistory?: { sender: "ai" | "user"; german: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MissionRequestPayload;
    const dayNumber = body.dayNumber ?? 5;
    const mode = body.mode ?? "coach";
    // Accept both learnerMessage and userMessage so all callers and tests work identically
    const rawMessage = (body.learnerMessage ?? body.userMessage ?? "").trim();
    const turnCount =
      typeof body.turnIndex === "number"
        ? body.turnIndex + 1
        : body.turnCount ?? 1;
    const conversationHistory = body.conversationHistory ?? [];

    const analysis = analyzeGermanUtterance(rawMessage, dayNumber);

    // In COACH MODE, only material pedagogical mistakes trigger an immediate retry intervention.
    // Minor stylistic redundancies (e.g. "Ich möchte einen Kaffee haben bitte.") or elliptical orders ("Einen Kaffee.")
    // do NOT block conversation flow ("Do Not Over-Correct" principle).
    if (mode === "coach" && analysis.requiresCoachRetry && analysis.detectedMistake) {
      return NextResponse.json({
        status: "coach_intervention",
        mode,
        intent: analysis.intent,
        requiresRetry: true,
        coachHeadline: analysis.detectedMistake.coachHeadline || "Fast richtig!",
        detectedMistake: analysis.detectedMistake,
        correctStructuresUsed: analysis.correctStructuresUsed,
        wordsDetected: analysis.wordsDetected,
        usedVocabulary: analysis.wordsDetected.map((w) => w.german),
        communicativeStrengths: analysis.communicativeStrengths,
        positiveNote: analysis.communicativeStrengths[0] || undefined,
        confidence: analysis.confidence,
        engineSource: analysis.engineSource,
        missionComplete: false,
        missionCompleted: false,
      });
    }

    // Generate contextual waiter / roleplay partner response
    const waiterReply = buildContextualWaiterResponse({
      dayNumber,
      userMessage: rawMessage,
      turnCount,
      intent: analysis.intent,
      conversationHistory,
    });

    const positiveNote =
      analysis.minorCoachingTip ||
      analysis.communicativeStrengths[0] ||
      "Clear and natural German communication!";

    return NextResponse.json({
      status: "ok",
      mode,
      intent: analysis.intent,
      requiresRetry: false,
      coachHeadline: analysis.detectedMistake?.coachHeadline,
      detectedMistake: analysis.detectedMistake, // Silent recording in Real-Life Mode
      minorCoachingTip: analysis.minorCoachingTip,
      recoverySupport: analysis.recoverySupport,
      correctStructuresUsed: analysis.correctStructuresUsed,
      wordsDetected: analysis.wordsDetected,
      usedVocabulary: analysis.wordsDetected.map((w) => w.german),
      orderedItemsSoFar: waiterReply.orderedItemsSoFar,
      communicativeStrengths: analysis.communicativeStrengths,
      positiveNote,
      aiReplyDe: waiterReply.aiReplyDe,
      aiReplyEn: waiterReply.aiReplyEn,
      nextTurnIndex: turnCount,
      missionComplete: waiterReply.missionComplete,
      missionCompleted: waiterReply.missionComplete,
      confidence: analysis.confidence,
      engineSource: analysis.engineSource,
    });
  } catch (error) {
    console.error("AI Mission API error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to process conversation turn" },
      { status: 500 }
    );
  }
}
