import { describe, expect, it } from "vitest";
import { RollingTranscriptStore } from "../transcript/TranscriptStore";
import { RealtimeTranscriptEventAdapter, calculateConfidence } from "./realtimeEventAdapter";

describe("RealtimeTranscriptEventAdapter", () => {
  it("maps speech, delta, and completed events into interim and final transcript items", () => {
    const store = new RollingTranscriptStore({ sessionId: "test" });
    const adapter = new RealtimeTranscriptEventAdapter(store);

    adapter.handle({
      type: "input_audio_buffer.speech_started",
      item_id: "item_1",
      audio_start_ms: 100
    });
    adapter.handle({
      type: "conversation.item.input_audio_transcription.delta",
      item_id: "item_1",
      delta: "Add a lake"
    });

    expect(store.getSnapshot().activeInterim?.text).toBe("Add a lake");

    adapter.handle({
      type: "input_audio_buffer.speech_stopped",
      item_id: "item_1",
      audio_end_ms: 1400
    });
    adapter.handle({
      type: "input_audio_buffer.committed",
      item_id: "item_1",
      previous_item_id: null
    });
    adapter.handle({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "item_1",
      transcript: "Add a lake in the center.",
      logprobs: [{ logprob: -0.1 }, { logprob: -0.2 }]
    });

    const snapshot = store.getSnapshot();
    expect(snapshot.activeInterim).toBeNull();
    expect(snapshot.finalWindow).toHaveLength(1);
    expect(snapshot.finalWindow[0].text).toBe("Add a lake in the center.");
    expect(snapshot.finalWindow[0].startedAtMs).toBe(100);
    expect(snapshot.finalWindow[0].endedAtMs).toBe(1400);
    expect(snapshot.finalWindow[0].confidence).toBeCloseTo(Math.exp(-0.15));
  });

  it("flushes completed transcriptions in committed item order", () => {
    const store = new RollingTranscriptStore({ sessionId: "test" });
    const adapter = new RealtimeTranscriptEventAdapter(store);

    adapter.handle({ type: "input_audio_buffer.committed", item_id: "item_1", previous_item_id: null });
    adapter.handle({ type: "input_audio_buffer.committed", item_id: "item_2", previous_item_id: "item_1" });
    adapter.handle({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "item_2",
      transcript: "Add trees around it."
    });

    expect(store.getSnapshot().finalWindow).toHaveLength(0);

    adapter.handle({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "item_1",
      transcript: "Add a lake."
    });

    expect(store.getSnapshot().finalWindow.map((item) => item.text)).toEqual(["Add a lake.", "Add trees around it."]);
  });

  it("waits for committed ordering before flushing completed transcription", () => {
    const store = new RollingTranscriptStore({ sessionId: "test" });
    const adapter = new RealtimeTranscriptEventAdapter(store);

    adapter.handle({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "item_1",
      transcript: "Add a playground near the south entrance."
    });

    expect(store.getSnapshot().finalWindow).toHaveLength(0);

    adapter.handle({ type: "input_audio_buffer.committed", item_id: "item_1", previous_item_id: null });

    expect(store.getSnapshot().finalWindow.map((item) => item.text)).toEqual([
      "Add a playground near the south entrance."
    ]);
  });

  it("records failed transcription events without making them actionable", () => {
    const store = new RollingTranscriptStore({ sessionId: "test" });
    const adapter = new RealtimeTranscriptEventAdapter(store);

    adapter.handle({
      type: "conversation.item.input_audio_transcription.failed",
      item_id: "item_1",
      error: { message: "Audio was not understandable." }
    });

    const snapshot = store.getSnapshot();
    expect(snapshot.activeInterim?.status).toBe("failed");
    expect(snapshot.activeInterim?.isActionable).toBe(false);
    expect(snapshot.errorMessage).toBe("Audio was not understandable.");
  });

  it("calculates confidence from logprobs", () => {
    expect(calculateConfidence([{ logprob: 0 }, { logprob: -0.2 }])).toBeCloseTo(Math.exp(-0.1));
    expect(calculateConfidence([])).toBeNull();
  });
});
