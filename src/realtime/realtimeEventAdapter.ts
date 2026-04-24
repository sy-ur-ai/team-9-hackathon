import type { RollingTranscriptStore } from "../transcript/TranscriptStore";

type RealtimeServerEvent = {
  type?: string;
  item_id?: string;
  previous_item_id?: string | null;
  audio_start_ms?: number;
  audio_end_ms?: number;
  delta?: string;
  transcript?: string;
  logprobs?: { logprob?: number }[];
  error?: { message?: string };
};

type ItemTiming = {
  startedAtMs?: number;
  endedAtMs?: number;
  previousItemId?: string | null;
};

type PendingFinal = {
  providerItemId: string;
  text: string;
  confidence: number | null;
};

export class RealtimeTranscriptEventAdapter {
  private readonly itemOrder: string[] = [];
  private readonly itemTiming = new Map<string, ItemTiming>();
  private readonly pendingFinals = new Map<string, PendingFinal>();
  private flushIndex = 0;

  constructor(private readonly store: RollingTranscriptStore) {}

  handle(event: RealtimeServerEvent): void {
    switch (event.type) {
      case "input_audio_buffer.speech_started":
        this.handleSpeechStarted(event);
        break;
      case "input_audio_buffer.speech_stopped":
        this.handleSpeechStopped(event);
        break;
      case "input_audio_buffer.committed":
        this.registerItemOrder(event.item_id, event.previous_item_id);
        this.flushFinals();
        break;
      case "conversation.item.input_audio_transcription.delta":
        this.handleDelta(event);
        break;
      case "conversation.item.input_audio_transcription.completed":
        this.handleCompleted(event);
        break;
      case "conversation.item.input_audio_transcription.failed":
        this.store.markFailed(event.item_id, event.error?.message ?? "OpenAI transcription failed.");
        break;
      case "error":
        this.store.setStatus("error", event.error?.message ?? "OpenAI realtime stream returned an error.");
        break;
      default:
        break;
    }
  }

  private handleSpeechStarted(event: RealtimeServerEvent): void {
    this.updateTiming(event.item_id, {
      startedAtMs: event.audio_start_ms,
      previousItemId: event.previous_item_id
    });
    this.store.startInterim({
      providerItemId: event.item_id,
      startedAtMs: event.audio_start_ms
    });
  }

  private handleSpeechStopped(event: RealtimeServerEvent): void {
    this.updateTiming(event.item_id, {
      endedAtMs: event.audio_end_ms
    });
    this.store.markSpeechStopped(event.item_id, event.audio_end_ms);
  }

  private handleDelta(event: RealtimeServerEvent): void {
    if (!event.delta) {
      return;
    }

    this.store.updateInterim({
      providerItemId: event.item_id,
      delta: event.delta
    });
  }

  private handleCompleted(event: RealtimeServerEvent): void {
    if (!event.item_id || !event.transcript) {
      return;
    }

    this.pendingFinals.set(event.item_id, {
      providerItemId: event.item_id,
      text: event.transcript,
      confidence: calculateConfidence(event.logprobs)
    });
    this.flushFinals();
  }

  private registerItemOrder(itemId: string | undefined, previousItemId: string | null | undefined): void {
    if (!itemId || this.itemOrder.includes(itemId)) {
      return;
    }

    if (previousItemId) {
      const previousIndex = this.itemOrder.indexOf(previousItemId);
      if (previousIndex >= 0) {
        this.itemOrder.splice(previousIndex + 1, 0, itemId);
        this.updateTiming(itemId, { previousItemId });
        return;
      }
    }

    this.itemOrder.push(itemId);
    this.updateTiming(itemId, { previousItemId });
  }

  private updateTiming(itemId: string | undefined, patch: ItemTiming): void {
    if (!itemId) {
      return;
    }

    this.itemTiming.set(itemId, {
      ...this.itemTiming.get(itemId),
      ...patch
    });
  }

  private flushFinals(): void {
    while (this.flushIndex < this.itemOrder.length) {
      const itemId = this.itemOrder[this.flushIndex];
      const pending = this.pendingFinals.get(itemId);

      if (!pending) {
        return;
      }

      const timing = this.itemTiming.get(itemId);
      this.store.commitFinal({
        providerItemId: pending.providerItemId,
        text: pending.text,
        startedAtMs: timing?.startedAtMs,
        endedAtMs: timing?.endedAtMs,
        confidence: pending.confidence
      });
      this.pendingFinals.delete(itemId);
      this.flushIndex += 1;
    }
  }
}

export function calculateConfidence(logprobs: { logprob?: number }[] | undefined): number | null {
  if (!logprobs || logprobs.length === 0) {
    return null;
  }

  const usable = logprobs.map((entry) => entry.logprob).filter((value): value is number => typeof value === "number");
  if (usable.length === 0) {
    return null;
  }

  const averageLogprob = usable.reduce((sum, value) => sum + value, 0) / usable.length;
  return Math.max(0, Math.min(1, Math.exp(averageLogprob)));
}
