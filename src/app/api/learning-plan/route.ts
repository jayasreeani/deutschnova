import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createPersonalizedLearningPlan } from "@/data/a1Curriculum";
import { LearningPlan } from "@/types/learning";

const DB_STORE_PATH = path.join(
  process.cwd(),
  "prisma",
  "deutschnova_store.json"
);

interface PersistedStore {
  users: Record<
    string,
    {
      email: string;
      name: string;
      updatedAt: string;
      plan: LearningPlan;
    }
  >;
}

function readStore(): PersistedStore {
  try {
    if (fs.existsSync(DB_STORE_PATH)) {
      const raw = fs.readFileSync(DB_STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as PersistedStore;
      if (parsed && parsed.users) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading server persistence store:", err);
  }
  return { users: {} };
}

function writeStore(store: PersistedStore) {
  try {
    const dir = path.dirname(DB_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing server persistence store:", err);
  }
}

export async function GET(req: NextRequest) {
  const email = (
    req.nextUrl.searchParams.get("email") || "aarav@deutschnova.ai"
  )
    .trim()
    .toLowerCase();

  const store = readStore();
  const existingUser = store.users[email];

  if (existingUser && existingUser.plan) {
    return NextResponse.json({
      status: "ok",
      source: "server_db",
      learningPlan: existingUser.plan,
    });
  }

  const defaultPlan = createPersonalizedLearningPlan({
    learnerName: "Aarav",
    learnerEmail: email,
    level: "A1",
    learningGoal: "daily_life",
    dailyTargetMinutes: 15,
    startAtDay: 5,
    todayCompletedActivitiesCount: 0,
  });

  store.users[email] = {
    email,
    name: defaultPlan.learnerName,
    updatedAt: new Date().toISOString(),
    plan: defaultPlan,
  };
  writeStore(store);

  return NextResponse.json({
    status: "ok",
    source: "initialized",
    learningPlan: defaultPlan,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, name, plan } = body as {
      action?: "save" | "login" | "reset";
      email?: string;
      name?: string;
      plan?: LearningPlan;
    };

    const normalizedEmail = (
      email ||
      plan?.learnerEmail ||
      "aarav@deutschnova.ai"
    )
      .trim()
      .toLowerCase();

    const store = readStore();

    if (action === "login") {
      const existing = store.users[normalizedEmail];
      if (existing && existing.plan) {
        return NextResponse.json({
          status: "ok",
          source: "restored_from_db",
          learningPlan: existing.plan,
        });
      }

      const freshPlan = createPersonalizedLearningPlan({
        learnerName: name || normalizedEmail.split("@")[0] || "Learner",
        learnerEmail: normalizedEmail,
        level: "A1",
        learningGoal: "daily_life",
        dailyTargetMinutes: 15,
        startAtDay: 5,
        todayCompletedActivitiesCount: 0,
      });

      store.users[normalizedEmail] = {
        email: normalizedEmail,
        name: freshPlan.learnerName,
        updatedAt: new Date().toISOString(),
        plan: freshPlan,
      };
      writeStore(store);

      return NextResponse.json({
        status: "ok",
        source: "created_new_user",
        learningPlan: freshPlan,
      });
    }

    if (plan) {
      const updatedPlan: LearningPlan = {
        ...plan,
        learnerEmail: normalizedEmail,
        updatedAt: new Date().toISOString(),
      };
      store.users[normalizedEmail] = {
        email: normalizedEmail,
        name: updatedPlan.learnerName,
        updatedAt: updatedPlan.updatedAt,
        plan: updatedPlan,
      };
      writeStore(store);

      return NextResponse.json({
        status: "ok",
        persistedAt: updatedPlan.updatedAt,
      });
    }

    return NextResponse.json(
      { status: "error", message: "Missing plan payload" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Failed to persist learning plan:", err);
    return NextResponse.json(
      { status: "error", message: "Failed to persist learning plan" },
      { status: 500 }
    );
  }
}
