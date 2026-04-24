import { describe, expect, it, vi } from "vitest";
import { RollingTranscriptStore, normalizeForDedupe, normalizeTranscriptText } from "./TranscriptStore";

describe("RollingTranscriptStore", () => {
  it("normalizes transcript text and dedupe comparison text", () => {
    expect(normalizeTranscriptText("  Let\u2019s   add a lake.  ")).toBe("Let's add a lake.");
    expect(normalizeForDedupe("Let's add a lake.")).toBe("lets add a lake");
  });

  it("dedupes repeated final transcripts by provider item id and text window", () => {
    const store = new RollingTranscriptStore({ sessionId: "test" });

    const first = store.commitFinal({
      providerItemId: "item_1",
      text: "Let's add a lake near the north entrance.",
      endedAtMs: 1000
    });
    const providerDuplicate = store.commitFinal({
      providerItemId: "item_1",
      text: "Let's add a lake near the north entrance.",
      endedAtMs: 1100
    });
    const textDuplicate = store.commitFinal({
      providerItemId: "item_2",
      text: "lets add a lake near the north entrance",
      endedAtMs: 2500
    });

    expect(providerDuplicate.seq).toBe(first.seq);
    expect(textDuplicate.seq).toBe(first.seq);
    expect(store.getSnapshot().finalWindow).toHaveLength(1);
  });

  it("keeps only the configured rolling final window", () => {
    const store = new RollingTranscriptStore({ sessionId: "test", maxFinalItems: 2 });

    store.commitFinal({ text: "Add a lake.", endedAtMs: 1000 });
    store.commitFinal({ text: "Add trees.", endedAtMs: 2000 });
    store.commitFinal({ text: "Add benches.", endedAtMs: 3000 });

    const snapshot = store.getSnapshot();
    expect(snapshot.finalWindow.map((item) => item.text)).toEqual(["Add trees.", "Add benches."]);
    expect(snapshot.evictedFinalSeqFloor).toBeGreaterThan(0);
  });

  it("reports a read gap when module 2 asks for evicted sequence history", () => {
    const store = new RollingTranscriptStore({ sessionId: "test", maxFinalItems: 2 });

    store.commitFinal({ text: "Add a lake.", endedAtMs: 1000 });
    store.commitFinal({ text: "Add trees.", endedAtMs: 2000 });
    store.commitFinal({ text: "Add benches.", endedAtMs: 3000 });

    const window = store.getActionableWindow({ afterSeq: 1 });

    expect(window.map((item) => item.text)).toEqual(["Add trees.", "Add benches."]);
    expect(store.getSnapshot().lastWindowGap?.requestedAfterSeq).toBe(1);
  });

  it("isolates subscriber failures from other subscribers", async () => {
    const store = new RollingTranscriptStore({ sessionId: "test" });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const goodSubscriber = vi.fn();

    store.subscribe(() => {
      throw new Error("subscriber broke");
    });
    store.subscribe(goodSubscriber);
    store.setStatus("listening");

    await Promise.resolve();
    await Promise.resolve();

    expect(goodSubscriber).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("injects manual text through the actionable final path", () => {
    const store = new RollingTranscriptStore({ sessionId: "test" });

    const item = store.injectManualText("Add a winding path from the south entrance.");

    expect(item.isActionable).toBe(true);
    expect(item.source).toBe("manual_injection");
    expect(store.getSnapshot().actionableRollingText).toContain("winding path");
  });
});
