export const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

export const openAIConfig = {
  apiKeyEnvVar: "OPENAI_API_KEY",
  defaultModel: import.meta.env.VITE_OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
  serverModelEnvVar: "OPENAI_MODEL",
} as const;
