import { useMemo, useState } from "react";
import {
  CircleDollarSign,
  Clock3,
  Maximize2,
  Mic,
  Minimize2,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Trees,
} from "lucide-react";
import { demoScript } from "./demoScript";
import { reduceConversation } from "./proposalEngine";
import { openAIConfig } from "./config/openai";
import type { ConversationEvent, SiteFeature } from "./types";

const speakerLabels: Record<ConversationEvent["speaker"], string> = {
  client: "Client",
  vendor: "Vendor",
  assistant: "Assistant",
};

function App() {
  const [activeEvents, setActiveEvents] = useState<ConversationEvent[]>([]);
  const [speaker, setSpeaker] = useState<ConversationEvent["speaker"]>("client");
  const [draft, setDraft] = useState("");
  const [isPresenting, setIsPresenting] = useState(false);

  const proposal = useMemo(() => reduceConversation(activeEvents), [activeEvents]);
  const nextBeat = demoScript[activeEvents.length];
  const visibleFeatures = Object.values(proposal.features).filter((feature) => feature.visible);

  const addEvent = (event: ConversationEvent) => {
    setActiveEvents((current) => [...current, event]);
  };

  const playNextBeat = () => {
    if (nextBeat) {
      addEvent(nextBeat);
    }
  };

  const submitDraft = () => {
    const text = draft.trim();

    if (!text) {
      return;
    }

    addEvent({
      id: `manual-${Date.now()}`,
      speaker,
      text,
    });
    setDraft("");
  };

  return (
    <main className={`app-shell ${isPresenting ? "presentation-mode" : ""}`}>
      <header className="topbar" aria-hidden={isPresenting}>
        <div>
          <p className="eyebrow">Team 9 Hackathon Demo</p>
          <h1>Live Visual Sales Assistant</h1>
          <p className="hero-copy">A premium park design-build conversation, converted into a live proposal.</p>
          <div className="model-row" aria-label="Default OpenAI models">
            <span className="model-pill">Reasoning: {openAIConfig.defaultModel}</span>
            <span className="model-pill">Speech-to-text: {openAIConfig.defaultTranscribeModel}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="secondary-button" type="button" onClick={() => setActiveEvents([])}>
            <RotateCcw size={17} aria-hidden="true" />
            Reset
          </button>
          <button className="secondary-button" type="button" onClick={() => setIsPresenting(true)}>
            <Maximize2 size={17} aria-hidden="true" />
            Present
          </button>
          <button className="primary-button" type="button" onClick={playNextBeat} disabled={!nextBeat}>
            <Play size={17} aria-hidden="true" />
            {nextBeat ? "Next beat" : "Demo complete"}
          </button>
        </div>
      </header>

      <section className="demo-grid">
        <div className="stage-panel">
          {isPresenting ? (
            <div className="presentation-controls">
              <button className="secondary-button" type="button" onClick={() => setIsPresenting(false)}>
                <Minimize2 size={17} aria-hidden="true" />
                Exit presentation
              </button>
            </div>
          ) : null}
          <div className="section-heading">
            <div>
              <p className="eyebrow">Deterministic site plan</p>
              <h2>{proposal.conceptName}</h2>
            </div>
            <div className="phase-key" aria-label="Phase legend">
              <span><i className="phase-one" />Phase 1</span>
              <span><i className="phase-two" />Phase 2</span>
            </div>
          </div>

          <SitePlan features={visibleFeatures} />

          <div className="metrics-row visual-support">
            <Metric icon={<CircleDollarSign size={18} />} label="Budget impact" value={proposal.budgetLevel} suffix="%" />
            <Metric icon={<Clock3 size={18} />} label="Timeline" value={proposal.timelineWeeks} suffix=" wks" max={24} />
            <Metric icon={<Trees size={18} />} label="Maintenance" value={proposal.maintenanceLevel} suffix="%" />
          </div>
        </div>

        <aside className="side-panel">
          <PanelList title="Client priorities" items={proposal.priorities} empty="Client context appears here before the plan changes." />
          <PanelList title="Vendor commitments" items={proposal.commitments} empty="Vendor recommendations become scoped commitments." />
          <PanelList title="Design rationale" items={proposal.rationales} empty="Rationale labels appear as features are added." />
        </aside>

        <section className="transcript-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Script runner + transcript intake</p>
              <h2>Conversation</h2>
            </div>
            <Mic size={20} aria-hidden="true" />
          </div>

          <div className="transcript-list" aria-live="polite">
            {activeEvents.length === 0 ? (
              <p className="empty-state">Run the first beat to capture client concerns. The site plan stays unchanged until the vendor proposes a design move.</p>
            ) : (
              activeEvents.map((event) => (
                <article className={`transcript-message ${event.speaker}`} key={event.id}>
                  <span>{speakerLabels[event.speaker]}</span>
                  <p>{event.text}</p>
                </article>
              ))
            )}
          </div>

          <div className="manual-entry">
            <select value={speaker} onChange={(event) => setSpeaker(event.target.value as ConversationEvent["speaker"])}>
              <option value="client">Client</option>
              <option value="vendor">Vendor</option>
              <option value="assistant">Assistant</option>
            </select>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  submitDraft();
                }
              }}
              placeholder="Type a line to test trigger phrases"
            />
            <button className="icon-button" type="button" onClick={submitDraft} aria-label="Add transcript line">
              <Send size={18} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="summary-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Proposal moment</p>
              <h2>Summary</h2>
            </div>
            <Sparkles size={20} aria-hidden="true" />
          </div>
          <p>{proposal.summary}</p>
          <div className="summary-tags">
            <span>Family-forward</span>
            <span>Noise-aware</span>
            <span>Phased scope</span>
            <span>Approval-ready</span>
          </div>
        </section>
      </section>
    </main>
  );
}

const SitePlan = ({ features }: { features: SiteFeature[] }) => (
  <div className="site-plan" aria-label="Top-down neighborhood park concept">
    <div className="parcel-label">Neighboring homes</div>
    <div className="parcel-boundary">
      <div className="entry-label west">West entrance</div>
      <div className="entry-label east">Quiet east edge</div>
      {features.map((feature) => (
        <div
          className={`site-feature ${feature.id} phase-${feature.phase}`}
          key={feature.id}
          style={{
            left: `${feature.x}%`,
            top: `${feature.y}%`,
            width: `${feature.width}%`,
            height: `${feature.height}%`,
          }}
        >
          <span>{feature.label}</span>
        </div>
      ))}
    </div>
  </div>
);

const Metric = ({
  icon,
  label,
  value,
  suffix,
  max = 100,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix: string;
  max?: number;
}) => (
  <div className="metric">
    <div className="metric-label">
      {icon}
      <span>{label}</span>
    </div>
    <strong>{value}{suffix}</strong>
    <div className="meter" aria-hidden="true">
      <span style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  </div>
);

const PanelList = ({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) => (
  <section className="info-block">
    <h2>{title}</h2>
    {items.length > 0 ? (
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : (
      <p>{empty}</p>
    )}
  </section>
);

export default App;
