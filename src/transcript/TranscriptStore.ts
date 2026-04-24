import type {
  SttStatus,
  TranscriptItem,
  TranscriptSnapshot,
  TranscriptSource,
  TranscriptStore as TranscriptStoreContract,
  TranscriptWindowGap
} from "./types";

const DEFAULT_MAX_FINAL_ITEMS = 20;
const DEFAULT_MAX_FINAL_AGE_MS = 5 * 60 * 1000;
const DEDUPE_WINDOW_MS = 3000;

export type CommitFinalInput = {
  providerItemId?: string;
  text: string;
  startedAtMs?: number;
  endedAtMs?: number;
  confidence?: number | null;
  source?: TranscriptSource;
};

export type InterimInput = {
  providerItemId?: string;
  text?: string;
  delta?: string;
  startedAtMs?: number;
  endedAtMs?: number;
};

export type TranscriptStoreOptions = {
  sessionId?: string;
  maxFinalItems?: number;
  maxFinalAgeMs?: number;
  now?: () => number;
};

type Subscriber = (snapshot: TranscriptSnapshot) => void;

export function normalizeTranscriptText(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeForDedupe(text: string): string {
  return normalizeTranscriptText(text)
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[.!?,;:]+$/g, "")
    .trim();
}

function createSessionId(): string {
  return `session_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
}

function createItemId(seq: number, prefix = "utt"): string {
  return `${prefix}_${String(seq).padStart(6, "0")}`;
}

function cloneItem(item: TranscriptItem): TranscriptItem {
  return Object.freeze({ ...item });
}

function freezeSnapshot(snapshot: TranscriptSnapshot): TranscriptSnapshot {
  return Object.freeze({
    ...snapshot,
    activeInterim: snapshot.activeInterim ? cloneItem(snapshot.activeInterim) : null,
    finalWindow: Object.freeze(snapshot.finalWindow.map(cloneItem)) as TranscriptItem[],
    lastWindowGap: snapshot.lastWindowGap ? Object.freeze({ ...snapshot.lastWindowGap }) : null
  });
}

export class RollingTranscriptStore implements TranscriptStoreContract {
  private readonly sessionId: string;
  private readonly maxFinalItems: number;
  private readonly maxFinalAgeMs: number;
  private readonly now: () => number;
  private readonly subscribers = new Set<Subscriber>();

  private sttStatus: SttStatus = "idle";
  private activeInterim: TranscriptItem | null = null;
  private finalWindow: TranscriptItem[] = [];
  private highWaterSeq = 0;
  private lastFinalSeq = 0;
  private evictedFinalSeqFloor = 0;
  private lastWindowGap: TranscriptWindowGap | null = null;
  private errorMessage: string | null = null;

  constructor(options: TranscriptStoreOptions = {}) {
    this.sessionId = options.sessionId ?? createSessionId();
    this.maxFinalItems = options.maxFinalItems ?? DEFAULT_MAX_FINAL_ITEMS;
    this.maxFinalAgeMs = options.maxFinalAgeMs ?? DEFAULT_MAX_FINAL_AGE_MS;
    this.now = options.now ?? (() => Date.now());
  }

  getSnapshot(): TranscriptSnapshot {
    const finalText = this.finalWindow.map((item) => item.text).join("\n");
    const liveRollingText = [finalText, this.activeInterim?.text].filter(Boolean).join("\n");

    return freezeSnapshot({
      sessionId: this.sessionId,
      sttStatus: this.sttStatus,
      activeInterim: this.activeInterim,
      finalWindow: this.finalWindow,
      liveRollingText,
      actionableRollingText: finalText,
      highWaterSeq: this.highWaterSeq,
      lastFinalSeq: this.lastFinalSeq,
      evictedFinalSeqFloor: this.evictedFinalSeqFloor,
      lastWindowGap: this.lastWindowGap,
      errorMessage: this.errorMessage
    });
  }

  getActionableWindow(opts: { afterSeq?: number; maxItems?: number } = {}): TranscriptItem[] {
    const afterSeq = opts.afterSeq ?? 0;
    const maxItems = opts.maxItems ?? this.maxFinalItems;
    const oldestAvailableSeq = this.finalWindow[0]?.seq ?? null;

    if (afterSeq > 0 && oldestAvailableSeq !== null && afterSeq < oldestAvailableSeq) {
      this.lastWindowGap = {
        requestedAfterSeq: afterSeq,
        oldestAvailableSeq,
        detectedAt: new Date(this.now()).toISOString()
      };
      this.notify();
    }

    return this.finalWindow.filter((item) => item.seq > afterSeq).slice(-maxItems).map(cloneItem);
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    queueMicrotask(() => {
      try {
        fn(this.getSnapshot());
      } catch (error) {
        console.error("Transcript subscriber failed during initial notification.", error);
      }
    });

    return () => {
      this.subscribers.delete(fn);
    };
  }

  injectManualText(text: string): TranscriptItem {
    return this.commitFinal({
      text,
      source: "manual_injection",
      confidence: 1
    });
  }

  clear(): void {
    this.activeInterim = null;
    this.finalWindow = [];
    this.lastFinalSeq = 0;
    this.evictedFinalSeqFloor = this.highWaterSeq;
    this.lastWindowGap = null;
    this.errorMessage = null;
    this.notify();
  }

  setStatus(status: SttStatus, errorMessage: string | null = null): void {
    this.sttStatus = status;
    this.errorMessage = errorMessage;
    this.notify();
  }

  startInterim(input: InterimInput): TranscriptItem {
    const text = normalizeTranscriptText(input.text ?? "");
    const seq = this.nextSeq();
    const item: TranscriptItem = {
      seq,
      id: createItemId(seq, "interim"),
      providerItemId: input.providerItemId,
      sessionId: this.sessionId,
      speaker: "presenter",
      text,
      normalizedText: normalizeForDedupe(text),
      status: "interim",
      isActionable: false,
      startedAtMs: input.startedAtMs,
      endedAtMs: input.endedAtMs,
      createdAt: new Date(this.now()).toISOString(),
      source: "openai_realtime_transcription",
      confidence: null,
      revision: 0
    };

    this.activeInterim = item;
    this.notify();
    return cloneItem(item);
  }

  updateInterim(input: InterimInput): TranscriptItem | null {
    const delta = normalizeTranscriptText(input.delta ?? "");
    const fullText = normalizeTranscriptText(input.text ?? "");
    const providerItemId = input.providerItemId ?? this.activeInterim?.providerItemId;
    if (
      !this.activeInterim ||
      (providerItemId && this.activeInterim.providerItemId && this.activeInterim.providerItemId !== providerItemId)
    ) {
      return this.startInterim({
        providerItemId,
        text: fullText || delta,
        startedAtMs: input.startedAtMs,
        endedAtMs: input.endedAtMs
      });
    }

    const previous = this.activeInterim;
    const nextText = fullText || normalizeTranscriptText(`${previous.text}${delta ? ` ${delta}` : ""}`);

    if (!nextText || nextText === previous.text) {
      return previous ? cloneItem(previous) : null;
    }

    const seq = this.nextSeq();
    this.activeInterim = {
      ...previous,
      seq,
      text: nextText,
      normalizedText: normalizeForDedupe(nextText),
      endedAtMs: input.endedAtMs ?? previous.endedAtMs,
      revision: previous.revision + 1
    };

    this.notify();
    return cloneItem(this.activeInterim);
  }

  markSpeechStopped(providerItemId: string | undefined, endedAtMs?: number): void {
    if (!this.activeInterim) {
      return;
    }

    if (providerItemId && this.activeInterim.providerItemId && this.activeInterim.providerItemId !== providerItemId) {
      return;
    }

    this.activeInterim = {
      ...this.activeInterim,
      endedAtMs: endedAtMs ?? this.activeInterim.endedAtMs
    };
    this.notify();
  }

  markFailed(providerItemId: string | undefined, message: string): TranscriptItem {
    const seq = this.nextSeq();
    const active = this.activeInterim;
    const failedText = active && (!providerItemId || active.providerItemId === providerItemId) ? active.text : message;
    const item: TranscriptItem = {
      seq,
      id: createItemId(seq, "failed"),
      providerItemId,
      sessionId: this.sessionId,
      speaker: "presenter",
      text: failedText,
      normalizedText: normalizeForDedupe(failedText),
      status: "failed",
      isActionable: false,
      startedAtMs: active?.startedAtMs,
      endedAtMs: active?.endedAtMs,
      createdAt: new Date(this.now()).toISOString(),
      source: "openai_realtime_transcription",
      confidence: null,
      revision: 0
    };

    this.activeInterim = item;
    this.errorMessage = message;
    this.notify();
    return cloneItem(item);
  }

  commitFinal(input: CommitFinalInput): TranscriptItem {
    const text = normalizeTranscriptText(input.text);
    const normalizedText = normalizeForDedupe(text);

    if (!normalizedText) {
      throw new Error("Cannot commit an empty transcript item.");
    }

    const duplicate = this.findDuplicate(input.providerItemId, normalizedText, input.endedAtMs);
    if (duplicate) {
      this.activeInterim = this.activeInterim?.providerItemId === input.providerItemId ? null : this.activeInterim;
      this.notify();
      return cloneItem(duplicate);
    }

    const seq = this.nextSeq();
    const item: TranscriptItem = {
      seq,
      id: createItemId(seq),
      providerItemId: input.providerItemId,
      sessionId: this.sessionId,
      speaker: "presenter",
      text,
      normalizedText,
      status: "final",
      isActionable: true,
      startedAtMs: input.startedAtMs ?? this.activeInterim?.startedAtMs,
      endedAtMs: input.endedAtMs ?? this.activeInterim?.endedAtMs,
      createdAt: new Date(this.now()).toISOString(),
      source: input.source ?? "openai_realtime_transcription",
      confidence: input.confidence ?? null,
      revision: 0
    };

    this.finalWindow.push(item);
    this.lastFinalSeq = seq;

    if (!input.providerItemId || this.activeInterim?.providerItemId === input.providerItemId) {
      this.activeInterim = null;
    }

    this.pruneFinalWindow();
    this.notify();
    return cloneItem(item);
  }

  private nextSeq(): number {
    this.highWaterSeq += 1;
    return this.highWaterSeq;
  }

  private findDuplicate(
    providerItemId: string | undefined,
    normalizedText: string,
    endedAtMs: number | undefined
  ): TranscriptItem | null {
    if (providerItemId) {
      const providerDuplicate = this.finalWindow.find((item) => item.providerItemId === providerItemId);
      if (providerDuplicate) {
        return providerDuplicate;
      }
    }

    return (
      this.finalWindow.find((item) => {
        if (item.normalizedText !== normalizedText) {
          return false;
        }

        if (typeof endedAtMs !== "number" || typeof item.endedAtMs !== "number") {
          return true;
        }

        return Math.abs(item.endedAtMs - endedAtMs) <= DEDUPE_WINDOW_MS;
      }) ?? null
    );
  }

  private pruneFinalWindow(): void {
    const cutoff = this.now() - this.maxFinalAgeMs;
    const before = this.finalWindow;

    this.finalWindow = this.finalWindow
      .filter((item) => new Date(item.createdAt).getTime() >= cutoff)
      .slice(-this.maxFinalItems);

    const evicted = before.filter((item) => !this.finalWindow.some((kept) => kept.seq === item.seq));
    if (evicted.length > 0) {
      this.evictedFinalSeqFloor = Math.max(this.evictedFinalSeqFloor, evicted.at(-1)?.seq ?? 0);
    }
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const subscriber of this.subscribers) {
      queueMicrotask(() => {
        try {
          subscriber(snapshot);
        } catch (error) {
          console.error("Transcript subscriber failed.", error);
        }
      });
    }
  }
}

export const transcriptStore = new RollingTranscriptStore();
