import "dotenv/config";

import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 3000);

const PARK_TRANSCRIPTION_PROMPT =
  "Park planning vocabulary: lakes, ponds, walking paths, trees, benches, playgrounds, swings, slides, gardens, fields, picnic areas, entrances, north, south, east, west, center.";

const sessionConfig = {
  session: {
    type: "transcription",
    audio: {
      input: {
        format: {
          type: "audio/pcm",
          rate: 24000
        },
        noise_reduction: {
          type: "near_field"
        },
        transcription: {
          model: "gpt-4o-mini-transcribe",
          prompt: PARK_TRANSCRIPTION_PROMPT,
          language: "en"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700
        }
      }
    },
    include: ["item.input_audio_transcription.logprobs"]
  },
  expires_after: {
    anchor: "created_at",
    seconds: 600
  }
};

const app = express();
app.use(express.json());

app.post("/api/openai/transcription-session", async (_req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      error: "OPENAI_API_KEY is not set. Copy .env.example to .env and add a server-side key."
    });
    return;
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(sessionConfig)
    });

    const payload = await upstream.json().catch(async () => ({
      error: await upstream.text()
    }));

    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: "OpenAI client secret request failed.",
        details: payload
      });
      return;
    }

    const clientSecret =
      payload.value ??
      payload.client_secret?.value ??
      payload.clientSecret ??
      payload.session?.client_secret?.value;

    if (!clientSecret) {
      res.status(502).json({
        error: "OpenAI response did not include a usable client secret.",
        details: payload
      });
      return;
    }

    res.json({
      clientSecret,
      expiresAt:
        payload.expires_at ??
        payload.client_secret?.expires_at ??
        payload.session?.client_secret?.expires_at ??
        null,
      session: payload.session ?? null
    });
  } catch (error) {
    res.status(502).json({
      error: "Could not create OpenAI transcription session.",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

if (isProduction) {
  const distPath = path.join(projectRoot, "dist");
  app.use(express.static(distPath));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  const vite = await createViteServer({
    root: projectRoot,
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
}

createServer(app).listen(port, () => {
  console.log(`Park STT app listening on http://localhost:${port}`);
});
