import { RealtimeTranscriptEventAdapter } from "./realtimeEventAdapter";
import { transcriptStore, type RollingTranscriptStore } from "../transcript/TranscriptStore";

const REALTIME_TRANSCRIPTION_URL = "wss://api.openai.com/v1/realtime?intent=transcription";
const TARGET_SAMPLE_RATE = 24000;

type TranscriptionSessionResponse = {
  clientSecret: string;
  expiresAt: number | null;
};

type ControllerOptions = {
  store?: RollingTranscriptStore;
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function fetchTranscriptionSession(): Promise<TranscriptionSessionResponse> {
  const response = await fetch("/api/openai/transcription-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? "Could not create OpenAI transcription session.");
  }

  if (!payload?.clientSecret) {
    throw new Error("The token endpoint did not return a client secret.");
  }

  return payload;
}

export class OpenAIRealtimeTranscriber {
  private readonly store: RollingTranscriptStore;
  private readonly eventAdapter: RealtimeTranscriptEventAdapter;
  private websocket: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private silenceNode: GainNode | null = null;
  private closedByUser = false;

  constructor(options: ControllerOptions = {}) {
    this.store = options.store ?? transcriptStore;
    this.eventAdapter = new RealtimeTranscriptEventAdapter(this.store);
  }

  async start(): Promise<void> {
    if (this.websocket?.readyState === WebSocket.OPEN || this.websocket?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.closedByUser = false;
    this.store.setStatus("connecting");

    try {
      const [{ clientSecret }, mediaStream] = await Promise.all([
        fetchTranscriptionSession(),
        navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
      ]);

      this.mediaStream = mediaStream;
      await this.startAudioWorklet(mediaStream);
      await this.openWebSocket(clientSecret);
    } catch (error) {
      await this.stopAudioOnly();
      this.store.setStatus("error", error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  stop(): void {
    this.closedByUser = true;
    this.websocket?.close(1000, "User stopped transcription.");
    this.websocket = null;
    void this.stopAudioOnly();
    this.store.setStatus("paused");
  }

  pause(): void {
    this.stop();
  }

  async resume(): Promise<void> {
    await this.start();
  }

  getStatus() {
    return this.store.getSnapshot().sttStatus;
  }

  private async openWebSocket(clientSecret: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const websocket = new WebSocket(REALTIME_TRANSCRIPTION_URL, [
        "realtime",
        `openai-insecure-api-key.${clientSecret}`
      ]);

      this.websocket = websocket;

      websocket.onopen = () => {
        this.store.setStatus("listening");
        resolve();
      };

      websocket.onerror = () => {
        reject(new Error("OpenAI realtime WebSocket failed to connect."));
      };

      websocket.onclose = (event) => {
        if (this.closedByUser) {
          return;
        }

        this.store.setStatus(
          "error",
          `OpenAI realtime WebSocket closed unexpectedly (${event.code}${event.reason ? `: ${event.reason}` : ""}).`
        );
        void this.stopAudioOnly();
      };

      websocket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.eventAdapter.handle(payload);
        } catch (error) {
          console.error("Could not process OpenAI realtime event.", error, event.data);
        }
      };
    });
  }

  private async startAudioWorklet(mediaStream: MediaStream): Promise<void> {
    const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
    await audioContext.audioWorklet.addModule("/worklets/pcm-capture-worklet.js");

    const sourceNode = audioContext.createMediaStreamSource(mediaStream);
    const workletNode = new AudioWorkletNode(audioContext, "pcm-capture-processor", {
      processorOptions: {
        targetSampleRate: TARGET_SAMPLE_RATE,
        chunkMs: 100
      }
    });
    const silenceNode = audioContext.createGain();
    silenceNode.gain.value = 0;

    workletNode.port.onmessage = (event: MessageEvent<{ type: string; pcm: ArrayBuffer }>) => {
      if (event.data.type !== "pcm16-chunk") {
        return;
      }

      if (this.websocket?.readyState !== WebSocket.OPEN) {
        return;
      }

      this.websocket.send(
        JSON.stringify({
          type: "input_audio_buffer.append",
          audio: arrayBufferToBase64(event.data.pcm)
        })
      );
    };

    sourceNode.connect(workletNode);
    workletNode.connect(silenceNode);
    silenceNode.connect(audioContext.destination);

    this.audioContext = audioContext;
    this.sourceNode = sourceNode;
    this.workletNode = workletNode;
    this.silenceNode = silenceNode;
  }

  private async stopAudioOnly(): Promise<void> {
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.silenceNode?.disconnect();

    this.mediaStream?.getTracks().forEach((track) => {
      track.stop();
    });

    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close().catch(() => undefined);
    }

    this.workletNode = null;
    this.sourceNode = null;
    this.silenceNode = null;
    this.mediaStream = null;
    this.audioContext = null;
  }
}

export const openAIRealtimeTranscriber = new OpenAIRealtimeTranscriber();
