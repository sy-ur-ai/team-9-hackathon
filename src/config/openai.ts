export const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
export const DEFAULT_OPENAI_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

export const openAIConfig = {
  apiKeyEnvVar: "OPENAI_API_KEY",
  defaultModel: import.meta.env.VITE_OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
  serverModelEnvVar: "OPENAI_MODEL",
  defaultTranscribeModel:
    import.meta.env.VITE_OPENAI_TRANSCRIBE_MODEL || DEFAULT_OPENAI_TRANSCRIBE_MODEL,
  serverTranscribeModelEnvVar: "OPENAI_TRANSCRIBE_MODEL",
} as const;
