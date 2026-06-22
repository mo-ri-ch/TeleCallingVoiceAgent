export type ToneOfVoice = "friendly" | "professional" | "formal";

export type PrimaryLanguage =
  | "malayalam"
  | "hindi"
  | "english"
  | "tamil"
  | "kannada";

export type CrawlStatus =
  | "not_started"
  | "queued"
  | "crawling"
  | "completed"
  | "failed";

export interface CrawledPage {
  url: string;
  title: string;
  metaDescription: string;
  textLength: number;
}

export interface CompanyProfile {
  id: string;
  name: string;
  websiteUrl: string;
  agentName: string;
  tone: ToneOfVoice;
  primaryLanguage: PrimaryLanguage;
  escalationNumbers: string[];
  inboundPhoneNumber: string;
  crawlStatus: CrawlStatus;
  pagesIndexed: number;
  crawledPages: CrawledPage[];
  createdAt: string;
  updatedAt: string;
}

export type NewCompanyInput = Pick<
  CompanyProfile,
  | "name"
  | "websiteUrl"
  | "agentName"
  | "tone"
  | "primaryLanguage"
  | "escalationNumbers"
>;

export type KnowledgeChunkSource = "crawled" | "manual";

export interface KnowledgeChunk {
  id: string;
  companyId: string;
  sourceUrl: string;
  sourceTitle: string;
  text: string;
  charCount: number;
  tags: string[];
  sourceType: KnowledgeChunkSource;
}

export interface KnowledgeSearchResult {
  chunk: KnowledgeChunk;
  score: number;
}

export interface NewKnowledgeChunkInput {
  text: string;
  sourceTitle: string;
  tags: string[];
}

export interface KnowledgeChunkUpdateInput {
  text?: string;
  sourceTitle?: string;
  tags?: string[];
}

export type PlaygroundRole = "user" | "assistant";

export interface PlaygroundMessage {
  role: PlaygroundRole;
  content: string;
}

export interface PlaygroundChatResponse {
  reply: PlaygroundMessage;
  usedChunks: KnowledgeSearchResult[];
}

export interface PlaygroundVoiceChatResponse {
  transcript: string;
  reply: PlaygroundMessage;
  audioBase64: string;
  usedChunks: KnowledgeSearchResult[];
}

export interface ObserverLog {
  id: string;
  companyId: string;
  url: string;
  contentHash: string;
  receivedAt: string;
  syncQueuedAt: string;
}

export interface SyncLogEntry {
  id: string;
  companyId: string;
  triggeredAt: string;
  pagesChecked: number;
  pagesChanged: number;
  chunksReindexed: number;
  chunksUntouched: number;
  summary: string;
}

export type CallStatus = "in_progress" | "completed";

export type AgentState = "listening" | "thinking" | "speaking";

export type CallState =
  | "greeting"
  | "interacting"
  | "holding"
  | "escalating"
  | "bridging"
  | "ended";

export type TurnRole = "agent" | "caller";

export interface TelephonyTurn {
  role: TurnRole;
  text: string;
  at: string;
}

export interface TelephonyCallSession {
  id: string;
  companyId: string;
  fromNumber: string;
  toNumber: string;
  status: CallStatus;
  agentState: AgentState;
  callState: CallState;
  startedAt: string;
  updatedAt: string;
  endedAt: string | null;
  turns: TelephonyTurn[];
}

export interface TelephonyConfig {
  companyId: string;
  inboundPhoneNumber: string;
  voiceWebhookUrl: string;
  publicBaseUrl: string;
}

export type CallSentiment = "positive" | "neutral" | "negative";

export type CallOutcome = "interested" | "callback" | "escalated" | "not_interested";

export type SheetSyncStatus = "pending" | "synced" | "skipped" | "failed";

export interface CallReport {
  id: string;
  companyId: string;
  fromNumber: string;
  toNumber: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  turns: TelephonyTurn[];
  recordingUrl: string;
  summary: string;
  sentiment: CallSentiment;
  outcome: CallOutcome;
  sheetSyncStatus: SheetSyncStatus;
  createdAt: string;
  // RL fields (Phases 22-26)
  rewardScore: number;
  rewardBreakdown: RewardBreakdown | null;
  mdpStates: MDPState[];
  engagementScores: EngagementScore[];
}

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export type LeadStatus = "not_contacted" | "busy" | "answered" | "failed";

export interface CampaignLead {
  id: string;
  name: string;
  phoneNumber: string;
  languagePreference: string;
  interestTag: string;
  status: LeadStatus;
  callAttempts: number;
  lastCallAt: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  companyId: string;
  status: CampaignStatus;
  callingWindowStart: string;
  callingWindowEnd: string;
  timeZone: string;
  maxRetries: number;
  retryIntervalMinutes: number;
  leads: CampaignLead[];
  createdAt: string;
  updatedAt: string;
}

export interface NewCampaignInput {
  name: string;
  companyId: string;
  callingWindowStart: string;
  callingWindowEnd: string;
  timeZone: string;
  maxRetries: number;
  retryIntervalMinutes: number;
  leadsCsv: File;
}

export type RecordingOutcome = "enrolled" | "interested" | "not_interested";

export type CallDirection = "inbound" | "outbound";

export type RecordingStatus = "uploaded" | "processing" | "ready" | "failed";

export type TranscriptSpeaker = "AGENT" | "CUSTOMER";

export interface TranscriptSegment {
  speaker: TranscriptSpeaker;
  text: string;
  startTime: number;
  endTime: number;
}

export interface ToneProfile {
  speakingRate: number;
  pitchCategory: string;
  energyLevel: string;
  pauseFrequency: string;
  overallScore: number;
}

export interface RecordingUpload {
  id: string;
  label: string;
  outcome: RecordingOutcome;
  callDirection: CallDirection;
  rating: number;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  durationSeconds: number;
  status: RecordingStatus;
  uploadedAt: string;
  transcript: TranscriptSegment[];
  transcriptError: string;
  toneProfile: ToneProfile | null;
}

export type ObjectionCategory = "pricing" | "time" | "credentials" | "relevance" | "other";

export interface ObjectionEntry {
  id: string;
  objectionText: string;
  category: ObjectionCategory;
  bestResponse: string;
  winPercent: number;
  sampleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PhraseMineReport {
  powerPhrases: string[];
  dropPhrases: string[];
}

export interface CompiledPromptDiff {
  diff: string;
  powerPhraseCount: number;
  dropPhraseCount: number;
  objectionCount: number;
  isApplied: boolean;
}

// RL Engine types (Phases 22–28)
export type ConversationPhase = "opening" | "discovery" | "pitch" | "objections" | "closing";

export interface MDPState {
  turnIndex: number;
  phase: ConversationPhase;
  customerSentiment: string;
  objectionsRaised: number;
  durationSeconds: number;
}

export interface TurnReward {
  turnIndex: number;
  baseReward: number;
  tdCredit: number;
}

export interface RewardBreakdown {
  outcomeReward: number;
  microRewards: number;
  efficiencyPenalty: number;
  total: number;
  turnRewards: TurnReward[];
}

export interface EngagementScore {
  turnIndex: number;
  score: number;
  triggeredAdaptation: boolean;
}

export interface PolicyVersion {
  id: string;
  name: string;
  description: string;
  isBaseline: boolean;
  epsilon: number;
  openingStrategy: string;
  pitchAngle: string;
  ctaVariant: string;
  createdAt: string;
}

export interface ABTest {
  id: string;
  name: string;
  campaignId: string;
  policyAId: string;
  policyBId: string;
  splitRatio: number;
  isActive: boolean;
  callsA: number;
  callsB: number;
  conversionsA: number;
  conversionsB: number;
  createdAt: string;
}

export interface GuardrailEvent {
  id: string;
  callSid: string;
  originalText: string;
  blockedReason: string;
  replacementText: string;
  occurredAt: string;
}

export interface PerformanceMatrixRow {
  contextKey: string;
  language: string;
  timeOfDay: string;
  leadSource: string;
  bestOpening: string;
  bestPitch: string;
  bestCta: string;
  sampleCount: number;
  winRate: number;
}

export interface RLSettings {
  epsilon: number;
  epsilonMin: number;
  epsilonDecay: number;
  openingStrategies: string[];
  pitchAngles: string[];
  ctaVariants: string[];
  enableEngagementAdaptation: boolean;
  enableGuardrails: boolean;
}

export const TONE_OPTIONS: { value: ToneOfVoice; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "formal", label: "Formal" },
];

export const LANGUAGE_OPTIONS: { value: PrimaryLanguage; label: string }[] = [
  { value: "malayalam", label: "Malayalam" },
  { value: "hindi", label: "Hindi" },
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
  { value: "kannada", label: "Kannada" },
];
