import "./styles.css";
import { openAIRealtimeTranscriber } from "./realtime/OpenAIRealtimeTranscriber";
import { transcriptStore } from "./transcript/TranscriptStore";
import type { TranscriptSnapshot } from "./transcript/types";

declare global {
  interface Window {
    parkTranscriptStore: typeof transcriptStore;
  }
}

window.parkTranscriptStore = transcriptStore;

let latestSnapshot = transcriptStore.getSnapshot();
let lastPulledSeq = 0;
let moduleWindowText = "No module pull yet.";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found.");
}

const appRoot = app;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function statusClass(status: TranscriptSnapshot["sttStatus"]): string {
  if (status === "listening") {
    return "statusListening";
  }

  if (status === "error") {
    return "statusError";
  }

  if (status === "connecting" || status === "reconnecting") {
    return "statusConnecting";
  }

  return "statusIdle";
}

function render(snapshot: TranscriptSnapshot): void {
  latestSnapshot = snapshot;
  const finalLines = snapshot.finalWindow
    .slice()
    .reverse()
    .map(
      (item) => `
        <li class="transcriptItem">
          <div class="transcriptMeta">#${item.seq} ${item.source === "manual_injection" ? "manual" : "openai"} ${item.confidence === null ? "" : `confidence ${Math.round(item.confidence * 100)}%`}</div>
          <div>${escapeHtml(item.text)}</div>
        </li>
      `
    )
    .join("");

  appRoot.innerHTML = `
    <main class="shell">
      <section class="topBar">
        <div>
          <p class="eyebrow">Module 1</p>
          <h1>Rolling OpenAI STT Stream</h1>
        </div>
        <div class="statusPill ${statusClass(snapshot.sttStatus)}">${snapshot.sttStatus}</div>
      </section>

      <section class="controls">
        <button id="startButton" ${snapshot.sttStatus === "connecting" || snapshot.sttStatus === "listening" ? "disabled" : ""}>Start mic</button>
        <button id="stopButton" ${snapshot.sttStatus !== "listening" && snapshot.sttStatus !== "connecting" ? "disabled" : ""}>Stop</button>
        <button id="clearButton">Clear transcript</button>
      </section>

      ${
        snapshot.errorMessage
          ? `<section class="notice errorNotice">${escapeHtml(snapshot.errorMessage)}</section>`
          : ""
      }

      <section class="grid">
        <article class="panel livePanel">
          <div class="panelHeader">
            <h2>Live lane</h2>
            <span>high water #${snapshot.highWaterSeq}</span>
          </div>
          <div class="interimBox ${snapshot.activeInterim ? "hasInterim" : ""}">
            ${snapshot.activeInterim ? escapeHtml(snapshot.activeInterim.text || "Listening...") : "No active speech"}
          </div>
          <label for="liveRollingText">Rolling live text</label>
          <textarea id="liveRollingText" readonly>${escapeHtml(snapshot.liveRollingText)}</textarea>
        </article>

        <article class="panel">
          <div class="panelHeader">
            <h2>Actionable lane</h2>
            <span>last final #${snapshot.lastFinalSeq}</span>
          </div>
          <label for="actionableRollingText">Final text for module 2</label>
          <textarea id="actionableRollingText" readonly>${escapeHtml(snapshot.actionableRollingText)}</textarea>
          ${
            snapshot.lastWindowGap
              ? `<div class="notice">Module read gap: requested after #${snapshot.lastWindowGap.requestedAfterSeq}, oldest available #${snapshot.lastWindowGap.oldestAvailableSeq ?? "none"}.</div>`
              : ""
          }
        </article>

        <article class="panel">
          <div class="panelHeader">
            <h2>Final transcript</h2>
            <span>${snapshot.finalWindow.length}/20 retained</span>
          </div>
          <ul class="transcriptList">${finalLines || '<li class="emptyState">Final utterances will appear here.</li>'}</ul>
        </article>

        <article class="panel">
          <div class="panelHeader">
            <h2>Module 2 access</h2>
            <span>non-blocking pull</span>
          </div>
          <button id="pullModuleWindow">Pull actionable window</button>
          <pre class="moduleWindow">${escapeHtml(moduleWindowText)}</pre>

          <form id="manualForm" class="manualForm">
            <label for="manualText">Manual fallback</label>
            <textarea id="manualText" placeholder="Type a spoken park command..."></textarea>
            <button type="submit">Inject as final text</button>
          </form>
        </article>
      </section>
    </main>
  `;

  bindEvents();
}

function bindEvents(): void {
  document.querySelector<HTMLButtonElement>("#startButton")?.addEventListener("click", () => {
    void openAIRealtimeTranscriber.start().catch((error) => {
      console.error(error);
    });
  });

  document.querySelector<HTMLButtonElement>("#stopButton")?.addEventListener("click", () => {
    openAIRealtimeTranscriber.stop();
  });

  document.querySelector<HTMLButtonElement>("#clearButton")?.addEventListener("click", () => {
    transcriptStore.clear();
    lastPulledSeq = 0;
    moduleWindowText = "No module pull yet.";
    render(transcriptStore.getSnapshot());
  });

  document.querySelector<HTMLButtonElement>("#pullModuleWindow")?.addEventListener("click", () => {
    const windowItems = transcriptStore.getActionableWindow({ afterSeq: lastPulledSeq });
    if (windowItems.length > 0) {
      lastPulledSeq = windowItems.at(-1)?.seq ?? lastPulledSeq;
    }
    moduleWindowText = JSON.stringify(
      {
        afterSeq: lastPulledSeq,
        items: windowItems.map((item) => ({
          seq: item.seq,
          id: item.id,
          text: item.text,
          isActionable: item.isActionable
        }))
      },
      null,
      2
    );
    render(transcriptStore.getSnapshot());
  });

  document.querySelector<HTMLFormElement>("#manualForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector<HTMLTextAreaElement>("#manualText");
    const text = input?.value.trim() ?? "";

    if (!text) {
      return;
    }

    transcriptStore.injectManualText(text);
    if (input) {
      input.value = "";
    }
  });
}

transcriptStore.subscribe(render);
render(latestSnapshot);
