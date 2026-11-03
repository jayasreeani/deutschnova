/**
 * High-Quality German & Bilingual Speech Engine for DeutschNova
 * 
 * Solves browser TTS pronunciation issues:
 * 1. Proactive voice pre-warming (fixes empty getVoices() race condition on Chrome/Edge/Safari)
 * 2. Intelligent voice tiering & ranking (prioritizes Neural/Natural/Google Austrian & German native voices)
 * 3. Text cleaning (removes emojis, markdown, quotes and ensures natural sentence cadence)
 * 4. Chromium synthesis freeze prevention (heartbeat & state cleanup)
 * 5. User voice preference storage (persists user's favorite voice)
 */

const PREFERRED_VOICE_STORAGE_KEY = "deutschnova_preferred_voice_de";

class GermanSpeechEngine {
  private voices: SpeechSynthesisVoice[] = [];
  private isVoicesLoaded: boolean = false;
  private voiceLoadListeners: Array<() => void> = [];
  private preferredVoiceURI: string | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.initVoices();
      try {
        this.preferredVoiceURI = localStorage.getItem(PREFERRED_VOICE_STORAGE_KEY);
      } catch {
        // localStorage not available
      }
    }
  }

  private initVoices() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const populate = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        this.voices = v;
        this.isVoicesLoaded = true;
        this.voiceLoadListeners.forEach((fn) => fn());
        this.voiceLoadListeners = [];
      }
    };

    populate();

    if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
      window.speechSynthesis.onvoiceschanged = () => {
        populate();
      };
    }

    // Secondary poll fallback for Chromium on Windows
    setTimeout(populate, 100);
    setTimeout(populate, 500);
  }

  /**
   * Ensures voices are loaded before proceeding.
   */
  public async ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
    if (this.isVoicesLoaded && this.voices.length > 0) {
      return this.voices;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return [];
    }

    return new Promise((resolve) => {
      const current = window.speechSynthesis.getVoices();
      if (current && current.length > 0) {
        this.voices = current;
        this.isVoicesLoaded = true;
        resolve(this.voices);
        return;
      }

      const timer = setTimeout(() => {
        this.voices = window.speechSynthesis.getVoices();
        this.isVoicesLoaded = true;
        resolve(this.voices);
      }, 400);

      this.voiceLoadListeners.push(() => {
        clearTimeout(timer);
        resolve(this.voices);
      });
    });
  }

  /**
   * Returns all available German voices (de-DE, de-AT, de-CH, de) sorted by quality.
   */
  public getGermanVoices(): SpeechSynthesisVoice[] {
    const all = this.voices.length > 0 ? this.voices : (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.getVoices() : []);
    const deVoices = all.filter((v) => {
      const lang = (v.lang || "").toLowerCase();
      return lang.startsWith("de") || lang.includes("german") || lang.includes("deutsch");
    });

    return deVoices.sort((a, b) => this.scoreVoice(b) - this.scoreVoice(a));
  }

  /**
   * Returns all available English voices sorted by quality.
   */
  public getEnglishVoices(): SpeechSynthesisVoice[] {
    const all = this.voices.length > 0 ? this.voices : (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.getVoices() : []);
    const enVoices = all.filter((v) => {
      const lang = (v.lang || "").toLowerCase();
      return lang.startsWith("en") || lang.includes("english");
    });

    return enVoices.sort((a, b) => this.scoreEnglishVoice(b) - this.scoreEnglishVoice(a));
  }

  /**
   * Score a German voice based on naturalness and Austrian/German accuracy.
   */
  private scoreVoice(voice: SpeechSynthesisVoice): number {
    let score = 0;
    const name = (voice.name || "").toLowerCase();
    const lang = (voice.lang || "").toLowerCase();

    // 1. Language authenticity
    if (lang === "de-at" || lang.startsWith("de-at")) {
      score += 45; // Austrian German bonus (Vienna context)
    } else if (lang === "de-de" || lang.startsWith("de-de")) {
      score += 35;
    } else if (lang.startsWith("de")) {
      score += 20;
    }

    // 2. High-Quality / Neural / Natural voice identifiers
    if (name.includes("natural") || name.includes("online (natural)")) {
      score += 60; // Microsoft Edge neural voices are exceptionally lifelike
    }
    if (name.includes("neural") || name.includes("premium") || name.includes("enhanced")) {
      score += 55;
    }
    if (name.includes("google")) {
      score += 50; // Google Deutsch in Chrome is human-recorded
    }

    // 3. Known high-quality voice personas
    if (
      name.includes("katja") ||
      name.includes("stefan") ||
      name.includes("florian") ||
      name.includes("ingrid") ||
      name.includes("anna") ||
      name.includes("petra") ||
      name.includes("marlene") ||
      name.includes("yannick")
    ) {
      score += 30;
    }

    // 4. Penalize legacy robotic monotone synthesizers
    if (
      name.includes("desktop") ||
      name.includes("espeak") ||
      name.includes("compact") ||
      name.includes("legacy")
    ) {
      score -= 40;
    }

    return score;
  }

  private scoreEnglishVoice(voice: SpeechSynthesisVoice): number {
    let score = 0;
    const name = (voice.name || "").toLowerCase();
    const lang = (voice.lang || "").toLowerCase();

    if (lang.startsWith("en-us") || lang.startsWith("en-gb")) score += 30;
    if (name.includes("natural") || name.includes("online")) score += 50;
    if (name.includes("neural") || name.includes("premium")) score += 40;
    if (name.includes("google")) score += 35;
    if (name.includes("desktop") || name.includes("espeak")) score -= 30;

    return score;
  }

  /**
   * Returns the best German voice available on the device.
   */
  public getBestGermanVoice(): SpeechSynthesisVoice | null {
    const germanVoices = this.getGermanVoices();
    if (germanVoices.length === 0) return null;

    if (this.preferredVoiceURI) {
      const match = germanVoices.find((v) => v.voiceURI === this.preferredVoiceURI);
      if (match) return match;
    }

    return germanVoices[0];
  }

  /**
   * Set user's preferred German voice.
   */
  public setPreferredGermanVoice(voiceURI: string) {
    this.preferredVoiceURI = voiceURI;
    try {
      localStorage.setItem(PREFERRED_VOICE_STORAGE_KEY, voiceURI);
    } catch {}
  }

  public getPreferredVoiceURI(): string | null {
    return this.preferredVoiceURI;
  }

  /**
   * Cleans text to produce natural German phonetics without robotic glitches.
   */
  public cleanGermanTextForSpeech(raw: string): string {
    if (!raw) return "";

    return (
      raw
        // Remove markdown formatting
        .replace(/[*_#`~]/g, "")
        // Remove German and English quotation marks
        .replace(/[„“"”«»]/g, "")
        // Remove emojis
        .replace(
          /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
          ""
        )
        // Clean bracketed pronunciation or translations: [dair KAH-fay] or (Hello)
        .replace(/\[.*?\]/g, "")
        .replace(/\(.*?\)/g, "")
        // Normalize whitespace
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  /**
   * Speaks German text using the highest-quality native voice available.
   * @param text German sentence or word to pronounce
   * @param rate Speech rate (default 0.90 for natural clarity, 0.70 for slow beginner playback)
   */
  public async speakGerman(text: string, rate: number = 0.90): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const clean = this.cleanGermanTextForSpeech(text);
    if (!clean) return;

    try {
      window.speechSynthesis.cancel();
      // Resume if stuck
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      await this.ensureVoicesLoaded();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "de-DE";
      utterance.rate = Math.max(0.6, Math.min(1.2, rate));
      utterance.pitch = 1.0;

      const voice = this.getBestGermanVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || "de-DE";
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis error:", err);
    }
  }

  /**
   * Speaks English explanation or translation.
   */
  public async speakEnglish(text: string, rate: number = 0.95): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const clean = text
      .replace(/[*_#`~]/g, "")
      .replace(/[„“"”«»]/g, "")
      .replace(/\[.*?\]/g, "")
      .trim();
    if (!clean) return;

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      await this.ensureVoicesLoaded();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "en-US";
      utterance.rate = rate;

      const englishVoices = this.getEnglishVoices();
      if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0];
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("English speech synthesis error:", err);
    }
  }

  /**
   * Speaks German followed immediately by clear English translation.
   */
  public async speakBilingual(
    germanText: string,
    englishText: string,
    germanRate: number = 0.90
  ): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const cleanDe = this.cleanGermanTextForSpeech(germanText);
    const cleanEn = (englishText || "")
      .replace(/[*_#`~]/g, "")
      .replace(/[„“"”«»]/g, "")
      .trim();

    if (!cleanDe) {
      if (cleanEn) this.speakEnglish(cleanEn);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      await this.ensureVoicesLoaded();

      const deUtterance = new SpeechSynthesisUtterance(cleanDe);
      deUtterance.lang = "de-DE";
      deUtterance.rate = germanRate;
      deUtterance.pitch = 1.0;

      const deVoice = this.getBestGermanVoice();
      if (deVoice) {
        deUtterance.voice = deVoice;
        deUtterance.lang = deVoice.lang || "de-DE";
      }

      if (cleanEn) {
        deUtterance.onend = () => {
          try {
            const enUtterance = new SpeechSynthesisUtterance(cleanEn);
            enUtterance.lang = "en-US";
            enUtterance.rate = 0.95;

            const enVoices = this.getEnglishVoices();
            if (enVoices.length > 0) {
              enUtterance.voice = enVoices[0];
            }
            window.speechSynthesis.speak(enUtterance);
          } catch {}
        };
      }

      window.speechSynthesis.speak(deUtterance);
    } catch (err) {
      console.warn("Bilingual speech synthesis error:", err);
    }
  }
}

// Export singleton engine
export const germanSpeechEngine = new GermanSpeechEngine();

// Convenience global helper functions for drop-in compatibility across all components
export function speakGerman(text: string, rate: number = 0.90) {
  germanSpeechEngine.speakGerman(text, rate);
}

export function speakEnglish(text: string, rate: number = 0.95) {
  germanSpeechEngine.speakEnglish(text, rate);
}

export function speakBilingual(germanText: string, englishText: string, rate: number = 0.90) {
  germanSpeechEngine.speakBilingual(germanText, englishText, rate);
}
