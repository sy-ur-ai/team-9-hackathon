# Live Visual Sales Assistant Demo

## Concept

We are building a four-minute hackathon demo for a real-time visual sales assistant.

The demo use case is a premium park design-build firm pitching a neighborhood park concept to a luxury landowner. The assistant listens to the conversation, captures client context, and brings the vendor's spoken recommendations to life as a live visual proposal.

The important distinction:

- The client can ask questions, share preferences, and give feedback.
- The assistant listens to the client for context.
- The visual changes when the vendor proposes a solution, explains a tradeoff, or commits to a design direction.

This keeps the vendor in control while making their expertise visible in real time.

## One-Line Pitch

We turn vendor conversations into live, visual, proposal-ready plans.

## Demo Story

A luxury landowner wants to turn private land into a beautiful neighborhood park. They care about community impact, aesthetics, noise, budget, maintenance, and timeline, but they do not yet know what the final concept should be.

The vendor talks through recommendations. As they speak, the visual assistant updates the park concept:

- Adds or moves amenities
- Shows design rationale
- Tracks budget and timeline impact
- Captures client priorities
- Builds toward a proposal summary

The audience should feel like they are watching a sales conversation become a concrete plan.

## Core Demo Flow

1. Start with an empty parcel or simple site map.
2. Client describes goals and concerns.
3. Assistant captures client priorities in a side panel.
4. Vendor proposes a park layout.
5. Visual updates based on the vendor's words.
6. Client asks follow-up questions.
7. Vendor refines the plan.
8. Visual updates again.
9. End with a proposal-ready summary.

## Example Conversation Beat

Client:

> I love the idea of a family park, but I am worried about noise near the neighboring homes.

Assistant:

- Captures "noise sensitivity" as a client priority.
- Does not redesign the park yet.

Vendor:

> Absolutely. We will place the playground toward the west entrance, use the east side for a quiet garden walk, and add a dense native tree buffer along the homes.

Assistant:

- Moves or adds playground to the west side.
- Adds quiet garden walk to the east side.
- Adds tree buffer along homes.
- Updates cost and maintenance indicators.
- Adds a design rationale label.

## Visual Elements

The demo should be reliable and fast, so the first version should use deterministic HTML/CSS/SVG/Canvas rather than live image generation.

Possible visual components:

- Top-down site plan
- Amenity zones
- Walking paths
- Playground
- Pavilion
- Garden walk
- Native tree buffer
- Restrooms
- Parking or drop-off
- Budget meter
- Timeline phases
- Maintenance indicator
- Client priorities panel
- Vendor commitments panel
- Final proposal summary

## Suggested Wow Moments

- The vendor says the playground should move away from homes, and the playground visibly shifts while a tree buffer appears.
- The vendor says a feature should move to Phase 2 to protect budget, and the plan immediately shows phased construction.
- The vendor explains accessibility, and the walking loop highlights ADA-friendly routes.
- The vendor mentions community approval, and the assistant generates a clean neighborhood-facing proposal summary.

## Four-Minute Demo Structure

### 0:00-0:30: Setup

Explain the problem:

Sales calls for complex physical projects usually end with vague notes, delayed follow-up, and misalignment.

Explain the product:

Our assistant turns the vendor's spoken recommendations into a live visual proposal during the call.

### 0:30-2:45: Live Roleplay

Run the vendor/client conversation. Let the client raise concerns and let the vendor's responses drive the visual updates.

### 2:45-3:30: Review the Final Concept

Show the final park layout, client priorities, vendor commitments, design rationale, and tradeoffs.

### 3:30-4:00: Proposal Moment

Generate or reveal a proposal-ready summary:

- Concept name
- Key amenities
- Budget range
- Phase 1 and Phase 2 scope
- Client priorities addressed
- Recommended next steps

## Team Starting Points

For a four-person team, a simple split could be:

1. Visual experience: site plan, animations, layout changes, polish.
2. Conversation logic: transcript parsing, speaker detection, trigger mapping.
3. Demo script and pitch: vendor/client dialogue, timing, final story.
4. Proposal layer: side panels, tradeoff metrics, generated summary, presentation readiness.

## Build Priorities

Focus first on a controlled demo that works every time.

High priority:

- Clear vendor/client script
- Fast visual updates
- Strong before/after transformation
- Reliable trigger phrases
- Proposal summary at the end

Lower priority for the first demo:

- Photorealistic image generation
- Full design automation
- Real permitting data
- Real cost estimation
- Complex open-ended conversation support

## Product Vision

The hackathon demo shows the decision and visualization layer. In the future, this could connect to:

- CAD tools
- 3D rendering
- Image generation
- Contractor estimates
- Permitting workflows
- Community feedback portals
- CRM and proposal systems

## Working Product Statement

This is a real-time visual sales assistant for design-build firms. It listens to client needs, then turns the vendor's spoken recommendations into live visual plans, tradeoffs, and proposal-ready scope.

## Current Build

This repo now contains the minimum PMO-owned demo scaffold:

- Vite + React + TypeScript app shell
- Scripted luxury park sales conversation
- Manual transcript intake for testing trigger phrases
- Speaker-aware event model for `client`, `vendor`, and `assistant`
- Deterministic proposal engine that maps conversation beats into plan state
- Top-down park concept view using HTML/CSS-rendered elements
- Client priorities, vendor commitments, design rationale, metrics, and proposal summary panels

The first version is intentionally deterministic. It does not depend on live image generation, live microphone capture, or external services.

## Local Setup

Install dependencies:

```bash
npm install
```

Run the local demo:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```text
src/
  App.tsx             Main demo experience and UI composition
  demoScript.ts       Luxury park pitch conversation beats
  proposalEngine.ts   Deterministic trigger mapping and proposal state reducer
  types.ts            Shared speaker, transcript, feature, and proposal types
  styles.css          App layout, site plan, panels, and responsive styling
```

## PMO-Owned Modules

The PMO-owned layer is responsible for keeping the demo reliable and demo-ready:

- `src/demoScript.ts`: the approved roleplay script and ordered demo beats
- `src/types.ts`: shared event and proposal contracts
- `src/proposalEngine.ts`: trigger phrases, proposal state updates, and deterministic business logic
- `src/App.tsx`: demo shell, transcript controls, side panels, site-plan presentation, and summary view

Keep this layer stable during the hackathon. If a teammate needs to integrate a module, connect through the existing conversation and proposal concepts instead of replacing the demo shell.

## Voice-to-Text Integration Expectations

Voice-to-text is teammate-owned and is not implemented in this scaffold.

When that module is ready, it should provide transcript events that match this shape:

```ts
type Speaker = "client" | "vendor" | "assistant";

interface ConversationEvent {
  id: string;
  speaker: Speaker;
  text: string;
}
```

Integration target:

- The voice module should emit finalized transcript turns, not partial word streams.
- Speaker detection should map into `client`, `vendor`, or `assistant`.
- The app should append emitted events to the same event list currently used by the scripted runner and manual input.
- Client turns should primarily update context and priorities.
- Vendor turns should drive visual and proposal changes.

Until the voice module lands, use the `Next beat` button and manual transcript input to rehearse the demo.

## Visual Canvas Integration Expectations

Visual assistant canvas generation is teammate-owned and is not implemented in this scaffold.

The current site plan is a deterministic HTML/CSS view backed by `ProposalState.features`. When the canvas module is ready, it should consume proposal state rather than parse raw transcript text directly.

Recommended integration contract:

```ts
interface VisualCanvasProps {
  features: SiteFeature[];
  priorities: string[];
  commitments: string[];
  rationales: string[];
}
```

Integration expectations:

- Keep the proposal engine as the source of truth for what changed and why.
- Render visible `SiteFeature` items from proposal state.
- Preserve phase indicators for Phase 1 and Phase 2.
- Keep rendering fast and deterministic for the live demo.
- Avoid adding live image generation to the critical path unless it can fail gracefully without blocking the roleplay.

## Demo Script Flow

Use the built-in script in `src/demoScript.ts` for the first pitch:

1. Client raises family-park goals and noise concerns.
2. Vendor places playground west, adds quiet garden walk east, and adds native tree buffer.
3. Client raises budget concerns.
4. Vendor moves pavilion and restrooms to Phase 2.
5. Client raises accessibility and neighborhood approval.
6. Vendor highlights ADA loop, compact drop-off, and proposal summary.

The key demo principle: client speech captures context; vendor speech commits design moves.

## Working Agreement

- Do not replace the PMO-owned demo shell during integration.
- Add teammate modules behind clear boundaries and keep the scripted demo path working.
- Preserve `npm run build` as the basic health check before demos.
- Prefer deterministic fallbacks over impressive features that can fail live.
- Keep README instructions current whenever setup, commands, or integration contracts change.

# Demo script - initial draft

# 1. 🔥 Opening (0:00–0:30) — *Hook + Reframe*

**Goal:** Make audience instantly feel the pain + inevitability

### Suggested opening (your style: sharp, forward-looking)

> “Most high-value sales conversations today… still end as vague notes, static slides, and follow-ups days later.
>
> But the real value actually happens *in the conversation itself.*
>
> What if that conversation could instantly become a proposal?”

**Pause → then reveal**

> “What you’re about to see is a real-time visual sales assistant.
> It listens, understands intent, and turns spoken recommendations into a live, evolving plan.” 

---

# 2. 🎭 Roleplay Setup (0:30–0:45)

**Make it tangible + human**

> “Let’s simulate a real scenario.
>
> I’m a design-build firm pitching a private park to a luxury landowner.”

**Introduce roles quickly:**

* “This is our client”
* “I’ll be the vendor”
* “The assistant is running live”

👉 *Important:* Tell audience what to watch for

> “Notice:
> The assistant listens to the client… but only updates visuals when the vendor makes decisions.”

---

# 3. 💡 Engagement Mechanism (CRITICAL)

Don’t just perform → *pull audience in mentally*

Add this line:

> “As we go, think about this:
> *At what moment would you personally say ‘this is better than a slide deck’?*”

This makes them *actively judge value*.

---

# 4. 🎬 Core Demo Flow (0:45–2:45)

## Phase 1 — Context Capture (Client speaks)

**Client:**

> “I want something family-friendly… but I’m worried about noise near nearby homes.”

**Assistant:**

* Captures: “family-friendly”, “noise sensitivity”

👉 You say:

> “Notice — no visual change yet.
> We’re just capturing intent.”

---

## Phase 2 — First Magic Moment (Vendor speaks → visual reacts)

**Vendor:**

> “We’ll move the playground to the west side, create a quiet garden walk on the east, and add a tree buffer near the homes.”

💥 **Visual shifts**

### You narrate lightly (don’t overtalk):

> “Now the system is translating design intent into a plan.”

👉 This is your **first WOW moment** (movement on screen)

---

## Phase 3 — Tradeoff Intelligence

**Client:**

> “Will that increase maintenance?”

**Vendor:**

> “Slightly, but we can use native plants to reduce long-term cost.”

💥 Assistant:

* Maintenance meter adjusts
* Adds “native plants” rationale

👉 You say:

> “We’re not just drawing — we’re tracking tradeoffs in real time.”

---

## Phase 4 — Budget Constraint (Second WOW moment)

**Client:**

> “I’d like to keep this under budget.”

**Vendor:**

> “We’ll move the pavilion to Phase 2.”

💥 Visual:

* Pavilion fades / moves to Phase 2
* Timeline updates

👉 You hit:

> “This is where decisions become *structured commitments.*”

---

## Phase 5 — Credibility Layer

**Vendor:**

> “We’ll also ensure ADA-friendly walking paths.”

💥 Visual:

* Path highlights

👉 You say:

> “The assistant turns expertise into visible proof.”

---

# 5. 🧠 Subtle Framing (Throughout)

Sprinkle 2–3 of these lines:

* “This removes ambiguity from sales.”
* “This makes expertise visible.”
* “This compresses days of follow-up into minutes.”
* “This is where alignment happens.”

---

# 6. 📊 Final Review (2:45–3:30)

Switch tone → slow down

> “Now let’s look at what we’ve built… *in just a few minutes.*”

Walk through:

* Layout
* Client priorities
* Vendor commitments
* Tradeoffs

👉 Key line:

> “This is no longer a conversation — it’s a decision-ready plan.”

---

# 7. 🎯 Closing (3:30–4:00)

This is where you win or lose.

## Strong close (aligned to your style)

> “Every complex sale today has the same problem:
>
> The best thinking happens in the conversation…
> but the outcome gets lost in translation.
>
> We fix that.”

**Pause**

> “We turn conversations into decisions.
> And decisions into proposals — instantly.”

---

## Optional punch (more visionary)

> “In the future, no high-value sale will end with ‘we’ll follow up.’
>
> It will end with *this.*”

---

# 8. 💥 Extra “Alpha” Layer (If you want to stand out)

Add ONE bold line:

> “This isn’t just a sales tool —
> it’s the interface between human expertise and real-world execution.”

---

# 9. 🧩 Demo Psychology (What’s actually happening)

This demo works because:

* It **keeps human in control** (vendor drives)
* It **visualizes thinking**, not just output
* It **creates trust instantly**
* It **collapses time-to-decision**

👉 That’s the real story — not the park.

---

# 10. If I were you (specific advice)

Push these 3 moments HARD:

1. Playground moves → instant visual reaction
2. Pavilion shifts to Phase 2 → budget intelligence
3. Final proposal → emotional closure

Everything else = support.
