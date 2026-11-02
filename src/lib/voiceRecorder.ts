/**
 * Universal Voice Recorder for DeutschNova
 * 
 * Works reliably across all browsers & platforms:
 * - Chrome, Edge, Safari (macOS & iOS), Firefox, Android WebViews
 * - Combines MediaRecorder (audio capture) with real-time AudioContext volume analysis (live waveform)
 * - Concurrently runs SpeechRecognition (de-DE) when supported by the browser
 * - NEVER releases microphone hardware before recognition starts (prevents Chromium teardown race conditions)
 */

export interface VoiceRecordingResult {
  audioBlob: Blob;
  audioUrl: string;
  transcript: string;
  durationSeconds: number;
}

export interface VoiceRecordingCallbacks {
  onVolumeChange?: (volumePercent: number) => void;
  onTranscriptUpdate?: (liveTranscript: string, isFinal: boolean) => void;
  onDurationChange?: (elapsedSeconds: number) => void;
  onError?: (errorMessage: string) => void;
}

export class UniversalVoiceSession {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private timerIntervalId: number | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private speechRecognition: any = null;

  private recordedChunks: Blob[] = [];
  private liveTranscript: string = "";
  private startTime: number = 0;
  private isRunning: boolean = false;

  public async start(callbacks: VoiceRecordingCallbacks): Promise<boolean> {
    if (this.isRunning) {
      this.cancel();
    }

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      callbacks.onError?.(
        "Microphone is not supported in this browser environment. Please use Google Chrome, Edge, or Safari."
      );
      return false;
    }

    try {
      // 1. Request microphone stream (KEEP IT OPEN during the entire recording)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.mediaStream = stream;
      this.recordedChunks = [];
      this.liveTranscript = "";
      this.startTime = Date.now();
      this.isRunning = true;

      // 2. Setup real-time AudioContext analyser for live volume / waveform feedback
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          this.audioContext = ctx;
          if (ctx.state === "suspended") {
            await ctx.resume().catch(() => {});
          }
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 128;
          analyser.smoothingTimeConstant = 0.4;
          source.connect(analyser);
          this.analyser = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const pollVolume = () => {
            if (!this.isRunning || !this.analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            // Scale volume non-linearly to make normal speech visibly active (0-100%)
            const percent = Math.min(100, Math.round((avg / 128) * 100));
            callbacks.onVolumeChange?.(percent);
            this.animFrameId = requestAnimationFrame(pollVolume);
          };
          this.animFrameId = requestAnimationFrame(pollVolume);
        }
      } catch {
        // AudioContext visualizer is optional; if blocked or unsupported, recording proceeds
      }

      // 3. Setup MediaRecorder for universal audio capture
      try {
        let mimeType = "";
        if (typeof MediaRecorder !== "undefined") {
          const candidates = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4",
            "audio/aac",
            "audio/ogg",
          ];
          for (const cand of candidates) {
            if (MediaRecorder.isTypeSupported(cand)) {
              mimeType = cand;
              break;
            }
          }
          const recorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
          this.mediaRecorder = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              this.recordedChunks.push(e.data);
            }
          };
          recorder.start(150); // collect data in 150ms slices
        }
      } catch (recErr) {
        console.warn("MediaRecorder init notice:", recErr);
      }

      // 4. Setup SpeechRecognition (de-DE) if available in browser
      const SpeechRecognitionClass =
        (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

      if (SpeechRecognitionClass && typeof SpeechRecognitionClass === "function") {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const recog: any = new (SpeechRecognitionClass as any)();
          this.speechRecognition = recog;
          recog.lang = "de-DE";
          recog.interimResults = true;
          recog.maxAlternatives = 1;
          recog.continuous = true;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recog.onresult = (evt: any) => {
            let finalStr = "";
            let interimStr = "";
            for (let i = 0; i < evt.results.length; i++) {
              const res = evt.results[i];
              if (res.isFinal) {
                finalStr += res[0]?.transcript || "";
              } else {
                interimStr += res[0]?.transcript || "";
              }
            }
            const clean = (finalStr || interimStr).trim();
            if (clean) {
              this.liveTranscript = clean;
              callbacks.onTranscriptUpdate?.(clean, !!finalStr);
            }
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recog.onerror = (err: any) => {
            const errType = err?.error || "unknown";
            // Ignore benign errors (speech recognition aborting during manual stop, or interim no-speech)
            if (errType !== "aborted" && errType !== "no-speech") {
              console.warn("SpeechRecognition notice:", errType);
            }
          };

          recog.start();
        } catch (sttErr) {
          console.warn("SpeechRecognition start notice:", sttErr);
        }
      }

      // 5. Setup live elapsed seconds counter
      this.timerIntervalId = window.setInterval(() => {
        if (!this.isRunning) return;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        callbacks.onDurationChange?.(elapsed);
        // Automatic safeguard stop at 45 seconds to prevent runaway recording
        if (elapsed >= 45) {
          callbacks.onError?.("Maximum recording length reached (45s).");
        }
      }, 1000);

      return true;
    } catch (err: unknown) {
      this.cancel();
      const errName = (err as { name?: string })?.name;
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        callbacks.onError?.(
          "Microphone access blocked: Please click the lock or camera icon in your browser address bar to allow microphone access, then try again."
        );
      } else {
        callbacks.onError?.(
          "Could not access microphone: " +
            ((err as { message?: string })?.message || "Please check your microphone settings.")
        );
      }
      return false;
    }
  }

  public async stop(): Promise<VoiceRecordingResult | null> {
    if (!this.isRunning) return null;
    this.isRunning = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }

    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - this.startTime) / 1000)
    );

    // Stop speech recognition
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch {
        // ignore
      }
      this.speechRecognition = null;
    }

    // Stop audio context
    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
      this.analyser = null;
    }

    // Stop MediaRecorder and await final blob
    let blob: Blob | null = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        blob = await new Promise<Blob>((resolve) => {
          const rec = this.mediaRecorder!;
          rec.onstop = () => {
            const mime = rec.mimeType || "audio/webm";
            resolve(new Blob(this.recordedChunks, { type: mime }));
          };
          rec.stop();
        });
      } catch {
        // fallback to existing chunks
        if (this.recordedChunks.length > 0) {
          blob = new Blob(this.recordedChunks, { type: "audio/webm" });
        }
      }
    } else if (this.recordedChunks.length > 0) {
      blob = new Blob(this.recordedChunks, { type: "audio/webm" });
    }

    // Safely release microphone tracks AFTER recording has cleanly stopped
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      this.mediaStream = null;
    }

    const audioBlob = blob || new Blob([], { type: "audio/webm" });
    const audioUrl = audioBlob.size > 0 ? URL.createObjectURL(audioBlob) : "";

    return {
      audioBlob,
      audioUrl,
      transcript: this.liveTranscript.trim(),
      durationSeconds,
    };
  }

  public cancel(): void {
    this.isRunning = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }

    if (this.speechRecognition) {
      try {
        this.speechRecognition.abort();
      } catch {
        // ignore
      }
      this.speechRecognition = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
      this.mediaRecorder = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
      this.analyser = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      this.mediaStream = null;
    }

    this.recordedChunks = [];
    this.liveTranscript = "";
  }
}
