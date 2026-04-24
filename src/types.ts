export type Speaker = "client" | "vendor" | "assistant";

export type PlanFeature =
  | "playground"
  | "gardenWalk"
  | "treeBuffer"
  | "pavilion"
  | "parking"
  | "adaLoop"
  | "restrooms";

export interface ConversationEvent {
  id: string;
  speaker: Speaker;
  text: string;
}

export interface SiteFeature {
  id: PlanFeature;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  phase: 1 | 2;
  visible: boolean;
  rationale: string;
}

export interface ProposalState {
  conceptName: string;
  priorities: string[];
  commitments: string[];
  rationales: string[];
  budgetLevel: number;
  timelineWeeks: number;
  maintenanceLevel: number;
  summary: string;
  features: Record<PlanFeature, SiteFeature>;
}
