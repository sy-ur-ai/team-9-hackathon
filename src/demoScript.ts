import type { ConversationEvent } from "./types";

export const demoScript: ConversationEvent[] = [
  {
    id: "beat-1",
    speaker: "client",
    text: "We want this to feel like a family park, but I am worried about noise near the neighboring homes.",
  },
  {
    id: "beat-2",
    speaker: "vendor",
    text: "Absolutely. We will place the playground toward the west entrance, use the east side for a quiet garden walk, and add a dense native tree buffer along the homes.",
  },
  {
    id: "beat-3",
    speaker: "client",
    text: "Budget matters too. I would rather open a strong first phase than overcommit.",
  },
  {
    id: "beat-4",
    speaker: "vendor",
    text: "Then we will keep the pavilion and restrooms in phase two, protect the phase one budget, and lead with the playground and tree buffer.",
  },
  {
    id: "beat-5",
    speaker: "client",
    text: "Accessibility and neighborhood approval are going to be important for us.",
  },
  {
    id: "beat-6",
    speaker: "vendor",
    text: "We will highlight an ADA-friendly walking loop, add a small parking and drop-off area, and prepare a neighborhood-facing proposal summary for approval.",
  },
];
