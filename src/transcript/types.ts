export type SttStatus = "idle" | "connecting" | "listening" | "reconnecting" | "paused" | "error";

export type TranscriptSource = "openai_realtime_transcription" | "manual_injection";

export type TranscriptItem = {
  seq: number;
  id: string;
  providerItemId?: string;
  sessionId: string;
  speaker: "presenter";
  text: string;
  normalizedText: string;
  status: "interim" | "final" | "failed";
  isActionable: boolean;
  startedAtMs?: number;
  endedAtMs?: number;
  createdAt: string;
  source: TranscriptSource;
  confidence: number | null;
  revision: number;
};

export type TranscriptWindowGap = {
  requestedAfterSeq: number;
  oldestAvailableSeq: number | null;
  detectedAt: string;
};

export type TranscriptSnapshot = {
  sessionId: string;
  sttStatus: SttStatus;
  activeInterim: TranscriptItem | null;
  finalWindow: TranscriptItem[];
  liveRollingText: string;
  actionableRollingText: string;
  highWaterSeq: number;
  lastFinalSeq: number;
  evictedFinalSeqFloor: number;
  lastWindowGap: TranscriptWindowGap | null;
  errorMessage: string | null;
};

export type TranscriptStore = {
  getSnapshot(): TranscriptSnapshot;
  getActionableWindow(opts?: { afterSeq?: number; maxItems?: number }): TranscriptItem[];
  subscribe(fn: (snapshot: TranscriptSnapshot) => void): () => void;
  injectManualText(text: string): TranscriptItem;
  clear(): void;
};
