# Team 9 Hackathon

Module 1 is a browser-first rolling speech-to-text stream for the park canvas demo.

## Run Locally

1. Copy `.env.example` to `.env`.
2. Set `OPENAI_API_KEY` in `.env`.
3. Install dependencies:

```sh
npm install
```

4. Start the app:

```sh
npm run dev
```

Open `http://localhost:3000`.

## What Module 1 Provides

- Local `POST /api/openai/transcription-session` endpoint for ephemeral OpenAI Realtime auth.
- Browser microphone capture through an `AudioWorklet`.
- PCM16 mono 24kHz audio chunks streamed to OpenAI Realtime transcription mode.
- Rolling transcript store with live interim text and final actionable text.
- Importable `transcriptStore` singleton for module 2.
- Manual transcript injection fallback for demo recovery.

The transcript store is also exposed in the browser console as `window.parkTranscriptStore`.
