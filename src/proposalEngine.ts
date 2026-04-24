import type { ConversationEvent, PlanFeature, ProposalState, SiteFeature } from "./types";

const feature = (
  id: PlanFeature,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  rationale: string,
  phase: 1 | 2 = 1,
  visible = false,
): SiteFeature => ({
  id,
  label,
  x,
  y,
  width,
  height,
  phase,
  visible,
  rationale,
});

export const initialProposalState: ProposalState = {
  conceptName: "Westgate Commons Park",
  priorities: [],
  commitments: [],
  rationales: [],
  budgetLevel: 22,
  timelineWeeks: 6,
  maintenanceLevel: 18,
  summary: "Start with a simple parcel and let the vendor's recommendations shape the proposal.",
  features: {
    playground: feature("playground", "Playground", 12, 30, 24, 20, "Placed near the west entrance to keep active play away from homes."),
    gardenWalk: feature("gardenWalk", "Quiet Garden Walk", 66, 22, 20, 42, "Creates a calmer east-side experience for neighbors and older visitors."),
    treeBuffer: feature("treeBuffer", "Native Tree Buffer", 82, 8, 10, 74, "Screens nearby homes and dampens noise from active uses."),
    pavilion: feature("pavilion", "Pavilion", 48, 54, 18, 16, "Held for phase two to protect first-phase budget.", 2),
    parking: feature("parking", "Drop-off", 8, 74, 30, 12, "Gives visitors a clear arrival point without dominating the park edge."),
    adaLoop: feature("adaLoop", "ADA Loop", 24, 18, 50, 46, "Connects key amenities with an accessible walking route."),
    restrooms: feature("restrooms", "Restrooms", 64, 70, 14, 10, "Bundled with pavilion work in phase two.", 2),
  },
};

export const reduceConversation = (events: ConversationEvent[]): ProposalState =>
  events.reduce(applyConversationEvent, initialProposalState);

export const applyConversationEvent = (
  state: ProposalState,
  event: ConversationEvent,
): ProposalState => {
  const text = event.text.toLowerCase();

  if (event.speaker === "client") {
    let next = state;

    if (text.includes("noise") || text.includes("homes")) {
      next = addPriority(next, "Noise sensitivity near neighboring homes");
    }

    if (text.includes("budget") || text.includes("overcommit")) {
      next = addPriority(next, "Protect first-phase budget");
    }

    if (text.includes("accessibility") || text.includes("approval")) {
      next = addPriority(next, "Accessibility and neighborhood approval");
    }

    return next;
  }

  if (event.speaker !== "vendor") {
    return state;
  }

  let next = state;

  if (text.includes("playground") || text.includes("west entrance")) {
    next = showFeatures(next, ["playground"]);
    next = addCommitment(next, "Place active play near the west entrance");
  }

  if (text.includes("garden walk")) {
    next = showFeatures(next, ["gardenWalk"]);
    next = addCommitment(next, "Use the east side for a quiet garden walk");
  }

  if (text.includes("tree buffer") || text.includes("native tree")) {
    next = showFeatures(next, ["treeBuffer"]);
    next = addCommitment(next, "Add a native tree buffer along neighboring homes");
    next = tuneMetrics(next, 14, 3, 9);
  }

  if (text.includes("phase two") || text.includes("phase 2")) {
    next = showFeatures(next, ["pavilion", "restrooms"]);
    next = addCommitment(next, "Move pavilion and restrooms to phase two");
    next = tuneMetrics(next, -6, 5, 5);
  }

  if (text.includes("walking loop") || text.includes("ada")) {
    next = showFeatures(next, ["adaLoop"]);
    next = addCommitment(next, "Highlight an ADA-friendly walking loop");
    next = tuneMetrics(next, 8, 2, 3);
  }

  if (text.includes("parking") || text.includes("drop-off")) {
    next = showFeatures(next, ["parking"]);
    next = addCommitment(next, "Add a compact parking and drop-off area");
    next = tuneMetrics(next, 7, 1, 2);
  }

  if (text.includes("proposal summary") || text.includes("approval")) {
    next = {
      ...next,
      summary:
        "A family-forward neighborhood park with active play to the west, quiet uses to the east, a native buffer for nearby homes, accessible circulation, and a phased scope that protects budget.",
    };
  }

  return next;
};

const addPriority = (state: ProposalState, priority: string): ProposalState => {
  if (state.priorities.includes(priority)) {
    return state;
  }

  return {
    ...state,
    priorities: [...state.priorities, priority],
  };
};

const addCommitment = (state: ProposalState, commitment: string): ProposalState => {
  if (state.commitments.includes(commitment)) {
    return state;
  }

  return {
    ...state,
    commitments: [...state.commitments, commitment],
  };
};

const showFeatures = (state: ProposalState, ids: PlanFeature[]): ProposalState => {
  const features = { ...state.features };
  const rationales = [...state.rationales];

  ids.forEach((id) => {
    features[id] = {
      ...features[id],
      visible: true,
    };

    if (!rationales.includes(features[id].rationale)) {
      rationales.push(features[id].rationale);
    }
  });

  return {
    ...state,
    features,
    rationales,
  };
};

const tuneMetrics = (
  state: ProposalState,
  budgetDelta: number,
  timelineDelta: number,
  maintenanceDelta: number,
): ProposalState => ({
  ...state,
  budgetLevel: clamp(state.budgetLevel + budgetDelta, 0, 100),
  timelineWeeks: clamp(state.timelineWeeks + timelineDelta, 1, 24),
  maintenanceLevel: clamp(state.maintenanceLevel + maintenanceDelta, 0, 100),
});

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
