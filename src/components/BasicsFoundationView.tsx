"use client";

import React, { useState } from "react";
import {
  Volume2,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Play,
  RotateCcw,
  Award,
  ArrowRight,
  HelpCircle,
  Clock,
  MapPin,
} from "lucide-react";
import { speakGerman } from "@/lib/germanSpeechEngine";
import { useLearning } from "@/context/LearningContext";

interface BasicsFoundationViewProps {
  onStartDay1?: () => void;
  initialTab?: "alphabet" | "numbers" | "calendar" | "survival";
}

export default function BasicsFoundationView({ onStartDay1, initialTab = "alphabet" }: BasicsFoundationViewProps) {
  const { plan } = useLearning();
  const [activeTab, setActiveTab] = useState<"alphabet" | "numbers" | "calendar" | "survival">(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Spelling Simulator State
  const [nameToSpell, setNameToSpell] = useState(plan.learnerName || "Alex");
  const [spellingIndex, setSpellingIndex] = useState<number | null>(null);
  const [isSpelling, setIsSpelling] = useState(false);

  // Alphabet Data
  const specialLetters = [
    { char: "Ä", lower: "ä", phonetic: "Like 'ai' in air", example: "Äpfel", exampleEn: "Apples", note: "A-Umlaut" },
    { char: "Ö", lower: "ö", phonetic: "Round lips + say 'eh'", example: "Österreich", exampleEn: "Austria", note: "O-Umlaut" },
    { char: "Ü", lower: "ü", phonetic: "Round lips + say 'ee'", example: "über", exampleEn: "over/above", note: "U-Umlaut" },
    { char: "ß", lower: "ß", phonetic: "Sharp 'S' (Eszett)", example: "Straße", exampleEn: "Street", note: "Sharp S" },
  ];

  const alphabet = [
    { letter: "A", phonetic: "ah", word: "Apfel", wordEn: "Apple" },
    { letter: "B", phonetic: "bay", word: "Brot", wordEn: "Bread" },
    { letter: "C", phonetic: "tsay", word: "Café", wordEn: "Coffee house" },
    { letter: "D", phonetic: "day", word: "Danke", wordEn: "Thanks" },
    { letter: "E", phonetic: "ay", word: "Essen", wordEn: "Food / Eat" },
    { letter: "F", phonetic: "eff", word: "Freund", wordEn: "Friend" },
    { letter: "G", phonetic: "gay", word: "Guten", wordEn: "Good" },
    { letter: "H", phonetic: "hah", word: "Hallo", wordEn: "Hello" },
    { letter: "I", phonetic: "ee", word: "Ich", wordEn: "I" },
    { letter: "J", phonetic: "yot", word: "Ja", wordEn: "Yes" },
    { letter: "K", phonetic: "kah", word: "Kaffee", wordEn: "Coffee" },
    { letter: "L", phonetic: "ell", word: "Lernen", wordEn: "Learn" },
    { letter: "M", phonetic: "emm", word: "Melange", wordEn: "Viennese Coffee" },
    { letter: "N", phonetic: "enn", word: "Nein", wordEn: "No" },
    { letter: "O", phonetic: "oh", word: "Oma", wordEn: "Grandmother" },
    { letter: "P", phonetic: "pay", word: "Preis", wordEn: "Price" },
    { letter: "Q", phonetic: "koo", word: "Quelle", wordEn: "Source" },
    { letter: "R", phonetic: "err", word: "Rechnung", wordEn: "Bill / Receipt" },
    { letter: "S", phonetic: "ess", word: "Servus", wordEn: "Hello/Bye" },
    { letter: "T", phonetic: "tay", word: "Tee", wordEn: "Tea" },
    { letter: "U", phonetic: "oo", word: "U-Bahn", wordEn: "Metro/Subway" },
    { letter: "V", phonetic: "fow", word: "Vater", wordEn: "Father" },
    { letter: "W", phonetic: "vay", word: "Wien", wordEn: "Vienna" },
    { letter: "X", phonetic: "iks", word: "Taxi", wordEn: "Taxi" },
    { letter: "Y", phonetic: "üpsilon", word: "Yoga", wordEn: "Yoga" },
    { letter: "Z", phonetic: "tsett", word: "Zug", wordEn: "Train" },
  ];

  // Numbers Data
  const numbersZeroToTwelve = [
    { num: 0, word: "null", hint: "nool" },
    { num: 1, word: "eins", hint: "eyens" },
    { num: 2, word: "zwei", hint: "tsvye" },
    { num: 3, word: "drei", hint: "drye" },
    { num: 4, word: "vier", hint: "feer" },
    { num: 5, word: "fünf", hint: "fewnf" },
    { num: 6, word: "sechs", hint: "zekhs" },
    { num: 7, word: "sieben", hint: "ZEE-ben" },
    { num: 8, word: "acht", hint: "ahkht" },
    { num: 9, word: "neun", hint: "noyn" },
    { num: 10, word: "zehn", hint: "tsayn" },
    { num: 11, word: "elf", hint: "elf" },
    { num: 12, word: "zwölf", hint: "tsvurlf" },
  ];

  const numbersTeens = [
    { num: 13, word: "dreizehn", formula: "3 + 10" },
    { num: 14, word: "vierzehn", formula: "4 + 10" },
    { num: 15, word: "fünfzehn", formula: "5 + 10" },
    { num: 16, word: "sechzehn", formula: "6 + 10 (drop s)" },
    { num: 17, word: "siebzehn", formula: "7 + 10 (drop en)" },
    { num: 18, word: "achtzehn", formula: "8 + 10" },
    { num: 19, word: "neunzehn", formula: "9 + 10" },
  ];

  const numbersTens = [
    { num: 20, word: "zwanzig", hint: "tsvan-tsikh" },
    { num: 30, word: "dreißig", hint: "drye-sikh" },
    { num: 40, word: "vierzig", hint: "feer-tsikh" },
    { num: 50, word: "fünfzig", hint: "fewnf-tsikh" },
    { num: 60, word: "sechzig", hint: "zekh-tsikh" },
    { num: 70, word: "siebzig", hint: "zeeb-tsikh" },
    { num: 80, word: "achtzig", hint: "ahkht-tsikh" },
    { num: 90, word: "neunzig", hint: "noyn-tsikh" },
    { num: 100, word: "hundert", hint: "hoon-dairt" },
  ];

  // Days & Months Data
  const daysOfWeek = [
    { day: "Montag", en: "Monday", abbrev: "Mo", weekend: false },
    { day: "Dienstag", en: "Tuesday", abbrev: "Di", weekend: false },
    { day: "Mittwoch", en: "Wednesday", abbrev: "Mi", weekend: false },
    { day: "Donnerstag", en: "Thursday", abbrev: "Do", weekend: false },
    { day: "Freitag", en: "Friday", abbrev: "Fr", weekend: false },
    { day: "Samstag", en: "Saturday", abbrev: "Sa", weekend: true },
    { day: "Sonntag", en: "Sunday", abbrev: "So", weekend: true },
  ];

  const months = [
    { de: "Januar", en: "January", num: 1 },
    { de: "Februar", en: "February", num: 2 },
    { de: "März", en: "March", num: 3 },
    { de: "April", en: "April", num: 4 },
    { de: "Mai", en: "May", num: 5 },
    { de: "Juni", en: "June", num: 6 },
    { de: "Juli", en: "July", num: 7 },
    { de: "August", en: "August", num: 8 },
    { de: "September", en: "September", num: 9 },
    { de: "Oktober", en: "October", num: 10 },
    { de: "November", en: "November", num: 11 },
    { de: "Dezember", en: "December", num: 12 },
  ];

  // 15 Golden Survival Words
  const survivalWords = [
    { de: "Ja", en: "Yes", hint: "yah", tag: "Basic" },
    { de: "Nein", en: "No", hint: "nine", tag: "Basic" },
    { de: "Bitte", en: "Please / You're welcome", hint: "BIT-tuh", tag: "Polite" },
    { de: "Danke schön!", en: "Thank you very much!", hint: "DAHN-kuh shurn", tag: "Polite" },
    { de: "Hallo!", en: "Hello (informal)", hint: "HAH-loh", tag: "Greeting" },
    { de: "Servus!", en: "Hello / Bye (Austria)", hint: "SAIR-voos", tag: "Austrian" },
    { de: "Guten Tag", en: "Good day (polite greeting)", hint: "GOO-ten tahk", tag: "Formal" },
    { de: "Grüß Gott!", en: "Greetings! (Austria & South Germany)", hint: "groos got", tag: "Austrian" },
    { de: "Tschüss!", en: "Bye! (informal)", hint: "chyoos", tag: "Goodbye" },
    { de: "Auf Wiedersehen!", en: "Goodbye (formal)", hint: "owf VEE-dair-zay-en", tag: "Formal" },
    { de: "Entschuldigung", en: "Excuse me / Sorry", hint: "ent-SHOOL-dee-goong", tag: "Essential" },
    { de: "Wie bitte?", en: "Pardon? / Could you repeat?", hint: "vee BIT-tuh", tag: "Clarification" },
    { de: "Ich weiß nicht", en: "I don't know", hint: "ikh vice nikht", tag: "Useful" },
    { de: "Alles klar!", en: "All clear! / Got it!", hint: "AHL-les klahr", tag: "Casual" },
    { de: "Prost!", en: "Cheers!", hint: "prohst", tag: "Social" },
  ];

  const handleSpellName = () => {
    const trimmed = nameToSpell.trim();
    if (!trimmed || isSpelling) return;

    setIsSpelling(true);
    const chars = trimmed.toUpperCase().split("");
    let current = 0;

    const interval = setInterval(() => {
      if (current < chars.length) {
        setSpellingIndex(current);
        const char = chars[current];
        if (char && char.match(/[A-ZÄÖÜß]/i)) {
          speakGerman(char, 0.85);
        }
        current++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setSpellingIndex(null);
          setIsSpelling(false);
          // Speak full name at end
          speakGerman(trimmed, 0.90);
        }, 600);
      }
    }, 750);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* WELCOME HERO FOR ZERO-KNOWLEDGE LEARNERS */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white border border-emerald-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
            🌱 Level A0 • German Foundations
          </span>
          <span className="text-xs font-bold text-slate-500">
            Official Goethe / ÖSD A1 Prerequisites
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Master the Basics Before Framing Sentences
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
            Every successful German learner starts right here. Master the alphabet, letters, numbers, and dates to speak with genuine confidence.
          </p>
        </div>

        {/* 4 Interactive Section Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <button
            onClick={() => setActiveTab("alphabet")}
            className={`p-3 rounded-2xl font-extrabold text-xs transition flex flex-col items-center gap-1 ${
              activeTab === "alphabet"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border border-slate-200 hover:border-slate-300 text-slate-700"
            }`}
          >
            <span className="text-xl">🔤</span>
            <span>1. The Alphabet</span>
            <span className={`text-[10px] ${activeTab === "alphabet" ? "text-indigo-200" : "text-slate-400"}`}>
              26 Letters + Ä, Ö, Ü, ß
            </span>
          </button>

          <button
            onClick={() => setActiveTab("numbers")}
            className={`p-3 rounded-2xl font-extrabold text-xs transition flex flex-col items-center gap-1 ${
              activeTab === "numbers"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border border-slate-200 hover:border-slate-300 text-slate-700"
            }`}
          >
            <span className="text-xl">🔢</span>
            <span>2. Numbers 0–100</span>
            <span className={`text-[10px] ${activeTab === "numbers" ? "text-indigo-200" : "text-slate-400"}`}>
              Prices, Phone &amp; Time
            </span>
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`p-3 rounded-2xl font-extrabold text-xs transition flex flex-col items-center gap-1 ${
              activeTab === "calendar"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border border-slate-200 hover:border-slate-300 text-slate-700"
            }`}
          >
            <span className="text-xl">📅</span>
            <span>3. Days &amp; Months</span>
            <span className={`text-[10px] ${activeTab === "calendar" ? "text-indigo-200" : "text-slate-400"}`}>
              Montag to Sonntag
            </span>
          </button>

          <button
            onClick={() => setActiveTab("survival")}
            className={`p-3 rounded-2xl font-extrabold text-xs transition flex flex-col items-center gap-1 ${
              activeTab === "survival"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border border-slate-200 hover:border-slate-300 text-slate-700"
            }`}
          >
            <span className="text-xl">💬</span>
            <span>4. First 15 Words</span>
            <span className={`text-[10px] ${activeTab === "survival" ? "text-indigo-200" : "text-slate-400"}`}>
              Bitte, Danke, Hallo...
            </span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: THE ALPHABET & A1 EXAM NAME SPELLER */}
      {/* ==================================================================== */}
      {activeTab === "alphabet" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>🔤</span> Das Deutsche Alphabet
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tap any letter to hear its native German name.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                A1 Speaking Part 1 Mandatory
              </span>
            </div>

            {/* 4 Special German Sounds Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> The 4 Unique German Letters (Umlaute &amp; Eszett)
                </span>
                <span className="text-[11px] text-indigo-700 font-bold">Tap to hear pronunciation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {specialLetters.map((s) => (
                  <button
                    key={s.char}
                    type="button"
                    onClick={() => speakGerman(s.char, 0.85)}
                    className="p-3.5 rounded-xl bg-white border border-indigo-200 hover:border-indigo-400 text-left transition group shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-indigo-700 group-hover:scale-105 transition">
                        {s.char} {s.lower}
                      </span>
                      <Volume2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-1">{s.phonetic}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      e.g. <strong className="text-slate-700">{s.example}</strong> ({s.exampleEn})
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Standard 26 Letters Grid */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                All 26 Standard Letters (Tap to Listen)
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-2.5">
                {alphabet.map((item) => (
                  <button
                    key={item.letter}
                    type="button"
                    onClick={() => speakGerman(item.letter, 0.88)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-center transition group flex flex-col justify-between h-24"
                  >
                    <div className="text-xl font-black text-slate-900 group-hover:text-indigo-700">
                      {item.letter}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-indigo-600 font-mono">
                        &ldquo;{item.phonetic}&rdquo;
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        wie <em>{item.word}</em>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* A1 EXAM SIMULATOR: "BUCHSTABIEREN" (SPELL YOUR NAME) */}
            <div className="p-5 rounded-2xl bg-amber-50/80 border-2 border-amber-300 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" /> Goethe &amp; ÖSD A1 Exam Simulator: „Buchstabieren Sie Ihren Namen!”
                </span>
                <span className="text-[11px] text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Speaking Part 1 Test
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                In every Goethe or ÖSD A1 exam, the examiner asks: <em>„Können Sie Ihren Namen buchstabieren?”</em> Type your name below to practice hearing how each letter is pronounced in German:
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={nameToSpell}
                  onChange={(e) => setNameToSpell(e.target.value)}
                  placeholder="Type your name (e.g. Alex, Maria, Aarav)..."
                  className="flex-1 bg-white border border-amber-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleSpellName}
                  disabled={isSpelling}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isSpelling ? "Spelling Out Loud..." : "Spell in German 🔊"}</span>
                </button>
              </div>

              {/* Animated Interactive Letters Breakdown */}
              {nameToSpell && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {nameToSpell.toUpperCase().split("").map((ch, idx) => {
                    const isCurrent = spellingIndex === idx;
                    return (
                      <span
                        key={idx}
                        className={`w-9 h-10 rounded-xl font-black text-sm flex items-center justify-center border transition-all ${
                          isCurrent
                            ? "bg-amber-500 text-white border-amber-600 scale-110 shadow-md ring-2 ring-amber-300"
                            : "bg-white border-amber-200 text-amber-950"
                        }`}
                      >
                        {ch}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: NUMBERS 0 - 100 */}
      {/* ==================================================================== */}
      {activeTab === "numbers" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>🔢</span> Die Zahlen (Numbers 0 to 100)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Crucial for paying in restaurants, buying tickets, phone numbers, and time.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Core Building Blocks
              </span>
            </div>

            {/* Numbers 0 to 12 */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Fundamental Numbers (0 to 12)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2">
                {numbersZeroToTwelve.map((n) => (
                  <button
                    key={n.num}
                    type="button"
                    onClick={() => speakGerman(n.word, 0.88)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-left transition group"
                  >
                    <div className="text-xs font-bold text-slate-400 group-hover:text-indigo-600">
                      {n.num}
                    </div>
                    <div className="text-base font-black text-slate-900 group-hover:text-indigo-700">
                      {n.word}
                    </div>
                    <div className="text-[11px] text-slate-500 italic mt-0.5">
                      [{n.hint}]
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Teen Numbers (13 - 19) */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                2. The Teens (13 to 19: Root + &ldquo;zehn&rdquo;)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {numbersTeens.map((n) => (
                  <button
                    key={n.num}
                    type="button"
                    onClick={() => speakGerman(n.word, 0.88)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-left transition group"
                  >
                    <div className="text-xs font-bold text-slate-400">{n.num}</div>
                    <div className="text-sm font-black text-slate-900 group-hover:text-indigo-700">
                      {n.word}
                    </div>
                    <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                      {n.formula}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tens up to 100 */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                3. The Tens &amp; 100 (for Prices &amp; Bills)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {numbersTens.map((n) => (
                  <button
                    key={n.num}
                    type="button"
                    onClick={() => speakGerman(n.word, 0.88)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-left transition group"
                  >
                    <div className="text-xs font-bold text-slate-400">{n.num}</div>
                    <div className="text-base font-black text-slate-900 group-hover:text-indigo-700">
                      {n.word}
                    </div>
                    <div className="text-[11px] text-slate-500 italic mt-0.5">
                      [{n.hint}]
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* The German "Backwards" Number Rule */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
              <div className="font-extrabold flex items-center gap-1.5 text-sm">
                💡 The German &ldquo;Backwards&rdquo; Number Secret (from 21 to 99)
              </div>
              <p className="text-slate-700 leading-relaxed">
                In German, two-digit numbers are spoken <strong>units first, then tens</strong> with &ldquo;und&rdquo; (and):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-bold">
                <button
                  type="button"
                  onClick={() => speakGerman("einundzwanzig", 0.85)}
                  className="p-2.5 rounded-xl bg-white border border-amber-200 text-left hover:border-amber-400 transition"
                >
                  <span className="text-amber-700">21 = einundzwanzig</span>
                  <span className="block text-[11px] text-slate-500">one-and-twenty 🔊</span>
                </button>
                <button
                  type="button"
                  onClick={() => speakGerman("fünfunddreißig", 0.85)}
                  className="p-2.5 rounded-xl bg-white border border-amber-200 text-left hover:border-amber-400 transition"
                >
                  <span className="text-amber-700">35 = fünfunddreißig</span>
                  <span className="block text-[11px] text-slate-500">five-and-thirty 🔊</span>
                </button>
                <button
                  type="button"
                  onClick={() => speakGerman("neunundneunzig", 0.85)}
                  className="p-2.5 rounded-xl bg-white border border-amber-200 text-left hover:border-amber-400 transition"
                >
                  <span className="text-amber-700">99 = neunundneunzig</span>
                  <span className="block text-[11px] text-slate-500">nine-and-ninety 🔊</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: DAYS OF THE WEEK & MONTHS */}
      {/* ==================================================================== */}
      {activeTab === "calendar" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                <span>📅</span> Wochentage &amp; Monate (Days &amp; Months)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Note: In German, all days of the week and all months take masculine article <strong>der</strong>!
              </p>
            </div>

            {/* 7 Days of the Week */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                The 7 Days of the Week (Die 7 Wochentage)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {daysOfWeek.map((d) => (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => speakGerman(`der ${d.day}`, 0.88)}
                    className={`p-3.5 rounded-2xl border text-left transition group ${
                      d.weekend
                        ? "bg-amber-50/70 border-amber-200 hover:border-amber-300"
                        : "bg-slate-50 hover:bg-indigo-50 border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-bold ${d.weekend ? "text-amber-700" : "text-indigo-600"}`}>
                        {d.abbrev}
                      </span>
                      {d.weekend && (
                        <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                          Weekend
                        </span>
                      )}
                    </div>
                    <div className="text-base font-black text-slate-900 mt-1">
                      {d.day}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{d.en}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 12 Months */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                The 12 Months (Die 12 Monate)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {months.map((m) => (
                  <button
                    key={m.de}
                    type="button"
                    onClick={() => speakGerman(`der ${m.de}`, 0.88)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-left transition group"
                  >
                    <div className="text-[11px] font-bold text-slate-400">Month {m.num}</div>
                    <div className="text-sm font-black text-slate-900 group-hover:text-indigo-700">
                      {m.de}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{m.en}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Common German Calendar Questions */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2 text-xs">
              <span className="font-extrabold text-indigo-900 text-sm">
                💬 Essential A1 Exam Phrases:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => speakGerman("Welcher Tag ist heute? Heute ist Montag.", 0.88)}
                  className="p-2.5 rounded-xl bg-white border border-indigo-200 text-left hover:border-indigo-400 transition"
                >
                  <div className="font-bold text-slate-900">„Welcher Tag ist heute?“</div>
                  <div className="text-slate-500 text-[11px]">What day is today? → Heute ist... 🔊</div>
                </button>
                <button
                  type="button"
                  onClick={() => speakGerman("Am Wochenende fahre ich nach Wien.", 0.88)}
                  className="p-2.5 rounded-xl bg-white border border-indigo-200 text-left hover:border-indigo-400 transition"
                >
                  <div className="font-bold text-slate-900">„Am Wochenende...“</div>
                  <div className="text-slate-500 text-[11px]">On the weekend... (Notice: &ldquo;am&rdquo;) 🔊</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: FIRST 15 SURVIVAL WORDS */}
      {/* ==================================================================== */}
      {activeTab === "survival" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                <span>💬</span> The 15 Golden Survival Words
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Before learning grammar rules, memorizing these 15 friendly reflexes guarantees you can survive in Vienna or Berlin.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {survivalWords.map((item) => (
                <button
                  key={item.de}
                  type="button"
                  onClick={() => speakGerman(item.de, 0.90)}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-left transition group flex items-start justify-between gap-2 shadow-2xs hover:shadow-xs"
                >
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {item.tag}
                    </span>
                    <div className="text-lg font-black text-slate-900 mt-1.5 group-hover:text-indigo-700">
                      {item.de}
                    </div>
                    <div className="text-xs font-semibold text-indigo-700 italic mt-0.5">
                      [{item.hint}]
                    </div>
                    <div className="text-xs text-slate-600 font-medium mt-1">
                      {item.en}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-white group-hover:bg-indigo-100 text-slate-400 group-hover:text-indigo-600 border border-slate-200 transition">
                    <Volume2 className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM ACTION: READY FOR DAY 1? */}
      {onStartDay1 && (
        <div className="p-6 rounded-3xl bg-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-indigo-600/20">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              Ready to use your new knowledge?
            </div>
            <div className="text-lg sm:text-xl font-black mt-0.5">
              Start Day 1: Introduce Yourself in Vienna
            </div>
            <div className="text-xs text-indigo-100 mt-1">
              Now that you know the alphabet, numbers, and basic greetings, you can say your name!
            </div>
          </div>
          <button
            onClick={onStartDay1}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-indigo-700 font-extrabold text-sm flex items-center justify-center gap-2 transition shrink-0 shadow-sm"
          >
            <span>Jump into Day 1</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
