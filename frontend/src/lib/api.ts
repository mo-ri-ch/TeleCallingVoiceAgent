import type {
  ABTest,
  CallDirection,
  Campaign,
  CallOutcome,
  CallReport,
  CallSentiment,
  CampaignLead,
  CampaignStatus,
  CompiledPromptDiff,
  CompanyProfile,
  ConversationPhase,
  CrawlStatus,
  CrawledPage,
  EngagementScore,
  GuardrailEvent,
  KnowledgeChunk,
  KnowledgeChunkSource,
  KnowledgeChunkUpdateInput,
  KnowledgeSearchResult,
  LeadStatus,
  MDPState,
  NewCampaignInput,
  NewCompanyInput,
  NewKnowledgeChunkInput,
  ObjectionCategory,
  ObjectionEntry,
  ObserverLog,
  PerformanceMatrixRow,
  PhraseMineReport,
  PlaygroundChatResponse,
  PlaygroundMessage,
  PlaygroundVoiceChatResponse,
  PolicyVersion,
  PrimaryLanguage,
  RLSettings,
  RecordingOutcome,
  RecordingStatus,
  RecordingUpload,
  RewardBreakdown,
  SheetSyncStatus,
  SyncLogEntry,
  TelephonyCallSession,
  TelephonyConfig,
  TelephonyTurn,
  ToneOfVoice,
  ToneProfile,
  TranscriptSegment,
  TranscriptSpeaker,
  TurnReward,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

// The recordings static mount lives at the API origin, not under /api/v1.
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

interface ApiCrawledPage {
  url: string;
  title: string;
  meta_description: string;
  text_length: number;
}

interface ApiCompanyProfile {
  id: string;
  name: string;
  website_url: string;
  agent_name: string;
  tone: ToneOfVoice;
  primary_language: PrimaryLanguage;
  escalation_numbers: string[];
  inbound_phone_number: string;
  crawl_status: CrawlStatus;
  pages_indexed: number;
  crawled_pages: ApiCrawledPage[];
  created_at: string;
  updated_at: string;
}

function mapCrawledPage(page: ApiCrawledPage): CrawledPage {
  return {
    url: page.url,
    title: page.title,
    metaDescription: page.meta_description,
    textLength: page.text_length,
  };
}

interface ApiKnowledgeChunk {
  id: string;
  company_id: string;
  source_url: string;
  source_title: string;
  text: string;
  char_count: number;
  tags: string[];
  source_type: KnowledgeChunkSource;
}

interface ApiKnowledgeSearchResult {
  chunk: ApiKnowledgeChunk;
  score: number;
}

interface ApiPlaygroundChatResponse {
  reply: PlaygroundMessage;
  used_chunks: ApiKnowledgeSearchResult[];
}

interface ApiPlaygroundVoiceChatResponse {
  transcript: string;
  reply: PlaygroundMessage;
  audio_base64: string;
  used_chunks: ApiKnowledgeSearchResult[];
}

interface ApiObserverLog {
  id: string;
  company_id: string;
  url: string;
  content_hash: string;
  received_at: string;
  sync_queued_at: string;
}

function mapObserverLog(api: ApiObserverLog): ObserverLog {
  return {
    id: api.id,
    companyId: api.company_id,
    url: api.url,
    contentHash: api.content_hash,
    receivedAt: api.received_at,
    syncQueuedAt: api.sync_queued_at,
  };
}

interface ApiSyncLogEntry {
  id: string;
  company_id: string;
  triggered_at: string;
  pages_checked: number;
  pages_changed: number;
  chunks_reindexed: number;
  chunks_untouched: number;
  summary: string;
}

function mapSyncLogEntry(api: ApiSyncLogEntry): SyncLogEntry {
  return {
    id: api.id,
    companyId: api.company_id,
    triggeredAt: api.triggered_at,
    pagesChecked: api.pages_checked,
    pagesChanged: api.pages_changed,
    chunksReindexed: api.chunks_reindexed,
    chunksUntouched: api.chunks_untouched,
    summary: api.summary,
  };
}

function mapKnowledgeChunk(api: ApiKnowledgeChunk): KnowledgeChunk {
  return {
    id: api.id,
    companyId: api.company_id,
    sourceUrl: api.source_url,
    sourceTitle: api.source_title,
    text: api.text,
    charCount: api.char_count,
    tags: api.tags,
    sourceType: api.source_type,
  };
}

function mapKnowledgeSearchResult(
  api: ApiKnowledgeSearchResult
): KnowledgeSearchResult {
  return {
    chunk: mapKnowledgeChunk(api.chunk),
    score: api.score,
  };
}

function mapCompany(api: ApiCompanyProfile): CompanyProfile {
  return {
    id: api.id,
    name: api.name,
    websiteUrl: api.website_url,
    agentName: api.agent_name,
    tone: api.tone,
    primaryLanguage: api.primary_language,
    escalationNumbers: api.escalation_numbers,
    inboundPhoneNumber: api.inbound_phone_number,
    crawlStatus: api.crawl_status,
    pagesIndexed: api.pages_indexed,
    crawledPages: api.crawled_pages.map(mapCrawledPage),
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

interface ApiTelephonyTurn {
  role: TelephonyTurn["role"];
  text: string;
  at: string;
}

interface ApiTelephonyCallSession {
  id: string;
  company_id: string;
  from_number: string;
  to_number: string;
  status: TelephonyCallSession["status"];
  agent_state: TelephonyCallSession["agentState"];
  call_state: TelephonyCallSession["callState"];
  started_at: string;
  updated_at: string;
  ended_at: string | null;
  turns: ApiTelephonyTurn[];
}

interface ApiTelephonyConfig {
  company_id: string;
  inbound_phone_number: string;
  voice_webhook_url: string;
  public_base_url: string;
}

function mapTelephonyCallSession(api: ApiTelephonyCallSession): TelephonyCallSession {
  return {
    id: api.id,
    companyId: api.company_id,
    fromNumber: api.from_number,
    toNumber: api.to_number,
    status: api.status,
    agentState: api.agent_state,
    callState: api.call_state,
    startedAt: api.started_at,
    updatedAt: api.updated_at,
    endedAt: api.ended_at,
    turns: api.turns.map((turn) => ({ role: turn.role, text: turn.text, at: turn.at })),
  };
}

function mapTelephonyConfig(api: ApiTelephonyConfig): TelephonyConfig {
  return {
    companyId: api.company_id,
    inboundPhoneNumber: api.inbound_phone_number,
    voiceWebhookUrl: api.voice_webhook_url,
    publicBaseUrl: api.public_base_url,
  };
}

interface ApiTurnReward {
  turn_index: number;
  base_reward: number;
  td_credit: number;
}

interface ApiRewardBreakdown {
  outcome_reward: number;
  micro_rewards: number;
  efficiency_penalty: number;
  total: number;
  turn_rewards: ApiTurnReward[];
}

interface ApiMDPState {
  turn_index: number;
  phase: ConversationPhase;
  customer_sentiment: string;
  objections_raised: number;
  duration_seconds: number;
}

interface ApiEngagementScore {
  turn_index: number;
  score: number;
  triggered_adaptation: boolean;
}

interface ApiCallReport {
  id: string;
  company_id: string;
  from_number: string;
  to_number: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  turns: ApiTelephonyTurn[];
  recording_url: string;
  summary: string;
  sentiment: CallSentiment;
  outcome: CallOutcome;
  sheet_sync_status: SheetSyncStatus;
  created_at: string;
  reward_score: number;
  reward_breakdown: ApiRewardBreakdown | null;
  mdp_states: ApiMDPState[];
  engagement_scores: ApiEngagementScore[];
}

function mapTurnReward(api: ApiTurnReward): TurnReward {
  return { turnIndex: api.turn_index, baseReward: api.base_reward, tdCredit: api.td_credit };
}

function mapRewardBreakdown(api: ApiRewardBreakdown): RewardBreakdown {
  return {
    outcomeReward: api.outcome_reward,
    microRewards: api.micro_rewards,
    efficiencyPenalty: api.efficiency_penalty,
    total: api.total,
    turnRewards: api.turn_rewards.map(mapTurnReward),
  };
}

function mapMDPState(api: ApiMDPState): MDPState {
  return {
    turnIndex: api.turn_index,
    phase: api.phase,
    customerSentiment: api.customer_sentiment,
    objectionsRaised: api.objections_raised,
    durationSeconds: api.duration_seconds,
  };
}

function mapEngagementScore(api: ApiEngagementScore): EngagementScore {
  return {
    turnIndex: api.turn_index,
    score: api.score,
    triggeredAdaptation: api.triggered_adaptation,
  };
}

function mapCallReport(api: ApiCallReport): CallReport {
  return {
    id: api.id,
    companyId: api.company_id,
    fromNumber: api.from_number,
    toNumber: api.to_number,
    startedAt: api.started_at,
    endedAt: api.ended_at,
    durationSeconds: api.duration_seconds,
    turns: api.turns.map((turn) => ({ role: turn.role, text: turn.text, at: turn.at })),
    recordingUrl: api.recording_url.startsWith("http")
      ? api.recording_url
      : api.recording_url
        ? `${API_ORIGIN}${api.recording_url}`
        : "",
    summary: api.summary,
    sentiment: api.sentiment,
    outcome: api.outcome,
    sheetSyncStatus: api.sheet_sync_status,
    createdAt: api.created_at,
    rewardScore: api.reward_score ?? 0,
    rewardBreakdown: api.reward_breakdown ? mapRewardBreakdown(api.reward_breakdown) : null,
    mdpStates: (api.mdp_states ?? []).map(mapMDPState),
    engagementScores: (api.engagement_scores ?? []).map(mapEngagementScore),
  };
}

interface ApiLead {
  id: string;
  name: string;
  phone_number: string;
  language_preference: string;
  interest_tag: string;
  status: LeadStatus;
  call_attempts: number;
  last_call_at: string | null;
}

interface ApiCampaign {
  id: string;
  name: string;
  company_id: string;
  status: CampaignStatus;
  calling_window_start: string;
  calling_window_end: string;
  time_zone: string;
  max_retries: number;
  retry_interval_minutes: number;
  leads: ApiLead[];
  created_at: string;
  updated_at: string;
}

function mapLead(api: ApiLead): CampaignLead {
  return {
    id: api.id,
    name: api.name,
    phoneNumber: api.phone_number,
    languagePreference: api.language_preference,
    interestTag: api.interest_tag,
    status: api.status,
    callAttempts: api.call_attempts,
    lastCallAt: api.last_call_at,
  };
}

function mapCampaign(api: ApiCampaign): Campaign {
  return {
    id: api.id,
    name: api.name,
    companyId: api.company_id,
    status: api.status,
    callingWindowStart: api.calling_window_start,
    callingWindowEnd: api.calling_window_end,
    timeZone: api.time_zone,
    maxRetries: api.max_retries,
    retryIntervalMinutes: api.retry_interval_minutes,
    leads: api.leads.map(mapLead),
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchCompanies(): Promise<CompanyProfile[]> {
  const data = await request<ApiCompanyProfile[]>("/companies");
  return data.map(mapCompany);
}

export async function fetchCompany(id: string): Promise<CompanyProfile> {
  const data = await request<ApiCompanyProfile>(`/companies/${id}`);
  return mapCompany(data);
}

export async function createCompany(
  input: NewCompanyInput
): Promise<CompanyProfile> {
  const data = await request<ApiCompanyProfile>("/companies", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      website_url: input.websiteUrl,
      agent_name: input.agentName,
      tone: input.tone,
      primary_language: input.primaryLanguage,
      escalation_numbers: input.escalationNumbers,
    }),
  });

  return mapCompany(data);
}

export async function triggerCrawl(id: string): Promise<CompanyProfile> {
  const data = await request<ApiCompanyProfile>(`/companies/${id}/crawl`, {
    method: "POST",
  });
  return mapCompany(data);
}

export async function fetchKnowledgeChunks(
  companyId: string
): Promise<KnowledgeChunk[]> {
  const data = await request<ApiKnowledgeChunk[]>(
    `/companies/${companyId}/knowledge`
  );
  return data.map(mapKnowledgeChunk);
}

export async function searchKnowledge(
  companyId: string,
  query: string,
  topK = 5
): Promise<KnowledgeSearchResult[]> {
  const data = await request<ApiKnowledgeSearchResult[]>(
    `/companies/${companyId}/knowledge/search`,
    {
      method: "POST",
      body: JSON.stringify({ query, top_k: topK }),
    }
  );
  return data.map(mapKnowledgeSearchResult);
}

export async function createKnowledgeChunk(
  companyId: string,
  input: NewKnowledgeChunkInput
): Promise<KnowledgeChunk> {
  const data = await request<ApiKnowledgeChunk>(
    `/companies/${companyId}/knowledge`,
    {
      method: "POST",
      body: JSON.stringify({
        text: input.text,
        source_title: input.sourceTitle,
        tags: input.tags,
      }),
    }
  );
  return mapKnowledgeChunk(data);
}

export async function updateKnowledgeChunk(
  companyId: string,
  chunkId: string,
  input: KnowledgeChunkUpdateInput
): Promise<KnowledgeChunk> {
  const body: Record<string, unknown> = {};
  if (input.text !== undefined) body.text = input.text;
  if (input.sourceTitle !== undefined) body.source_title = input.sourceTitle;
  if (input.tags !== undefined) body.tags = input.tags;

  const data = await request<ApiKnowledgeChunk>(
    `/companies/${companyId}/knowledge/${chunkId}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
  return mapKnowledgeChunk(data);
}

export async function deleteKnowledgeChunk(
  companyId: string,
  chunkId: string
): Promise<void> {
  await request<void>(`/companies/${companyId}/knowledge/${chunkId}`, {
    method: "DELETE",
  });
}

export async function sendPlaygroundMessage(
  companyId: string,
  messages: PlaygroundMessage[]
): Promise<PlaygroundChatResponse> {
  const data = await request<ApiPlaygroundChatResponse>(
    `/companies/${companyId}/playground/chat`,
    {
      method: "POST",
      body: JSON.stringify({ messages }),
    }
  );
  return {
    reply: data.reply,
    usedChunks: data.used_chunks.map(mapKnowledgeSearchResult),
  };
}

export async function sendPlaygroundVoiceMessage(
  companyId: string,
  audio: Blob,
  history: PlaygroundMessage[]
): Promise<PlaygroundVoiceChatResponse> {
  const formData = new FormData();
  formData.append("audio", audio, "recording.wav");
  formData.append("history", JSON.stringify(history));

  const response = await fetch(
    `${API_BASE_URL}/companies/${companyId}/playground/voice`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(
      (detail && typeof detail === "object" && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : null) ?? `API request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as ApiPlaygroundVoiceChatResponse;
  return {
    transcript: data.transcript,
    reply: data.reply,
    audioBase64: data.audio_base64,
    usedChunks: data.used_chunks.map(mapKnowledgeSearchResult),
  };
}

export async function fetchObserverLogs(
  companyId: string
): Promise<ObserverLog[]> {
  const data = await request<ApiObserverLog[]>(
    `/companies/${companyId}/sync/observer-logs`
  );
  return data.map(mapObserverLog);
}

export async function fetchSyncLogs(companyId: string): Promise<SyncLogEntry[]> {
  const data = await request<ApiSyncLogEntry[]>(
    `/companies/${companyId}/sync/logs`
  );
  return data.map(mapSyncLogEntry);
}

export async function fetchTelephonyConfig(
  companyId: string
): Promise<TelephonyConfig> {
  const data = await request<ApiTelephonyConfig>(
    `/telephony/companies/${companyId}/config`
  );
  return mapTelephonyConfig(data);
}

export async function updateTelephonyConfig(
  companyId: string,
  inboundPhoneNumber: string
): Promise<TelephonyConfig> {
  const data = await request<ApiTelephonyConfig>(
    `/telephony/companies/${companyId}/config`,
    {
      method: "PATCH",
      body: JSON.stringify({ inbound_phone_number: inboundPhoneNumber }),
    }
  );
  return mapTelephonyConfig(data);
}

export async function fetchTelephonyCalls(
  companyId: string
): Promise<TelephonyCallSession[]> {
  const data = await request<ApiTelephonyCallSession[]>(
    `/telephony/companies/${companyId}/calls`
  );
  return data.map(mapTelephonyCallSession);
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const data = await request<ApiCampaign[]>("/campaigns");
  return data.map(mapCampaign);
}

export async function createCampaign(input: NewCampaignInput): Promise<Campaign> {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("company_id", input.companyId);
  formData.append("calling_window_start", input.callingWindowStart);
  formData.append("calling_window_end", input.callingWindowEnd);
  formData.append("time_zone", input.timeZone);
  formData.append("max_retries", String(input.maxRetries));
  formData.append("retry_interval_minutes", String(input.retryIntervalMinutes));
  formData.append("leads_csv", input.leadsCsv);

  const response = await fetch(`${API_BASE_URL}/campaigns`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(
      (detail && typeof detail === "object" && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : null) ?? `API request failed: ${response.status} ${response.statusText}`
    );
  }

  return mapCampaign((await response.json()) as ApiCampaign);
}

export async function updateCampaignStatus(
  campaignId: string,
  status: CampaignStatus
): Promise<Campaign> {
  const data = await request<ApiCampaign>(`/campaigns/${campaignId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return mapCampaign(data);
}

export async function fetchCallReports(companyId?: string): Promise<CallReport[]> {
  const query = companyId ? `?company_id=${encodeURIComponent(companyId)}` : "";
  const data = await request<ApiCallReport[]>(`/call-logs${query}`);
  return data.map(mapCallReport);
}

interface ApiTranscriptSegment {
  speaker: TranscriptSpeaker;
  text: string;
  start_time: number;
  end_time: number;
}

interface ApiToneProfile {
  speaking_rate: number;
  pitch_category: string;
  energy_level: string;
  pause_frequency: string;
  overall_score: number;
}

interface ApiRecordingUpload {
  id: string;
  label: string;
  outcome: RecordingOutcome;
  call_direction: CallDirection;
  rating: number;
  file_name: string;
  file_size: number;
  file_url: string;
  duration_seconds: number;
  status: RecordingStatus;
  uploaded_at: string;
  transcript: ApiTranscriptSegment[];
  transcript_error: string;
  tone_profile: ApiToneProfile | null;
}

function mapTranscriptSegment(api: ApiTranscriptSegment): TranscriptSegment {
  return { speaker: api.speaker, text: api.text, startTime: api.start_time, endTime: api.end_time };
}

function mapToneProfile(api: ApiToneProfile): ToneProfile {
  return {
    speakingRate: api.speaking_rate,
    pitchCategory: api.pitch_category,
    energyLevel: api.energy_level,
    pauseFrequency: api.pause_frequency,
    overallScore: api.overall_score,
  };
}

function mapRecordingUpload(api: ApiRecordingUpload): RecordingUpload {
  return {
    id: api.id,
    label: api.label,
    outcome: api.outcome,
    callDirection: api.call_direction,
    rating: api.rating,
    fileName: api.file_name,
    fileSize: api.file_size,
    fileUrl: api.file_url.startsWith("http")
      ? api.file_url
      : api.file_url
        ? `${API_ORIGIN}${api.file_url}`
        : "",
    durationSeconds: api.duration_seconds,
    status: api.status,
    uploadedAt: api.uploaded_at,
    transcript: (api.transcript ?? []).map(mapTranscriptSegment),
    transcriptError: api.transcript_error ?? "",
    toneProfile: api.tone_profile ? mapToneProfile(api.tone_profile) : null,
  };
}

export async function fetchRecordings(): Promise<RecordingUpload[]> {
  const data = await request<ApiRecordingUpload[]>("/learning/recordings");
  return data.map(mapRecordingUpload);
}

export async function triggerTranscription(recordId: string): Promise<RecordingUpload> {
  const data = await request<ApiRecordingUpload>(`/learning/recordings/${recordId}/transcribe`, { method: "POST" });
  return mapRecordingUpload(data);
}

export async function fetchPhraseMine(): Promise<PhraseMineReport> {
  const data = await request<{ power_phrases: string[]; drop_phrases: string[] }>("/learning/phrase-mine");
  return { powerPhrases: data.power_phrases, dropPhrases: data.drop_phrases };
}

interface ApiObjectionEntry {
  id: string;
  objection_text: string;
  category: ObjectionCategory;
  best_response: string;
  win_percent: number;
  sample_count: number;
  created_at: string;
  updated_at: string;
}

function mapObjectionEntry(api: ApiObjectionEntry): ObjectionEntry {
  return {
    id: api.id,
    objectionText: api.objection_text,
    category: api.category,
    bestResponse: api.best_response,
    winPercent: api.win_percent,
    sampleCount: api.sample_count,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export async function fetchObjections(): Promise<ObjectionEntry[]> {
  const data = await request<ApiObjectionEntry[]>("/learning/objections");
  return data.map(mapObjectionEntry);
}

export async function createObjection(objectionText: string): Promise<ObjectionEntry> {
  const data = await request<ApiObjectionEntry>("/learning/objections", {
    method: "POST",
    body: JSON.stringify({ objection_text: objectionText }),
  });
  return mapObjectionEntry(data);
}

export async function updateObjection(id: string, bestResponse: string, winPercent?: number): Promise<ObjectionEntry> {
  const body: Record<string, unknown> = { best_response: bestResponse };
  if (winPercent !== undefined) body.win_percent = winPercent;
  const data = await request<ApiObjectionEntry>(`/learning/objections/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return mapObjectionEntry(data);
}

export async function deleteObjection(id: string): Promise<void> {
  await request<void>(`/learning/objections/${id}`, { method: "DELETE" });
}

export async function fetchCompiledPrompt(): Promise<CompiledPromptDiff> {
  const data = await request<{
    diff: string; power_phrase_count: number; drop_phrase_count: number;
    objection_count: number; is_applied: boolean;
  }>("/learning/compiled-prompt");
  return {
    diff: data.diff,
    powerPhraseCount: data.power_phrase_count,
    dropPhraseCount: data.drop_phrase_count,
    objectionCount: data.objection_count,
    isApplied: data.is_applied,
  };
}

export async function applyPromptUpdate(diff: string): Promise<void> {
  await request<void>("/learning/apply-update", { method: "POST", body: JSON.stringify({ diff }) });
}

// RL Engine API (Phases 24-28)

export async function fetchRLSettings(): Promise<RLSettings> {
  const data = await request<Record<string, unknown>>("/rl/settings");
  return {
    epsilon: data.epsilon as number,
    epsilonMin: data.epsilon_min as number,
    epsilonDecay: data.epsilon_decay as number,
    openingStrategies: data.opening_strategies as string[],
    pitchAngles: data.pitch_angles as string[],
    ctaVariants: data.cta_variants as string[],
    enableEngagementAdaptation: data.enable_engagement_adaptation as boolean,
    enableGuardrails: data.enable_guardrails as boolean,
  };
}

export async function updateRLSettings(updates: Partial<{
  epsilon: number; enableEngagementAdaptation: boolean; enableGuardrails: boolean;
}>): Promise<RLSettings> {
  const body: Record<string, unknown> = {};
  if (updates.epsilon !== undefined) body.epsilon = updates.epsilon;
  if (updates.enableEngagementAdaptation !== undefined) body.enable_engagement_adaptation = updates.enableEngagementAdaptation;
  if (updates.enableGuardrails !== undefined) body.enable_guardrails = updates.enableGuardrails;
  const data = await request<Record<string, unknown>>("/rl/settings", { method: "PATCH", body: JSON.stringify(body) });
  return {
    epsilon: data.epsilon as number,
    epsilonMin: data.epsilon_min as number,
    epsilonDecay: data.epsilon_decay as number,
    openingStrategies: data.opening_strategies as string[],
    pitchAngles: data.pitch_angles as string[],
    ctaVariants: data.cta_variants as string[],
    enableEngagementAdaptation: data.enable_engagement_adaptation as boolean,
    enableGuardrails: data.enable_guardrails as boolean,
  };
}

export async function fetchPerformanceMatrix(): Promise<PerformanceMatrixRow[]> {
  const data = await request<Record<string, unknown>[]>("/rl/performance-matrix");
  return data.map((row) => ({
    contextKey: row.context_key as string,
    language: row.language as string,
    timeOfDay: row.time_of_day as string,
    leadSource: row.lead_source as string,
    bestOpening: row.best_opening as string,
    bestPitch: row.best_pitch as string,
    bestCta: row.best_cta as string,
    sampleCount: row.sample_count as number,
    winRate: row.win_rate as number,
  }));
}

interface ApiPolicyVersion {
  id: string; name: string; description: string; is_baseline: boolean;
  epsilon: number; opening_strategy: string; pitch_angle: string;
  cta_variant: string; created_at: string;
}

function mapPolicyVersion(api: ApiPolicyVersion): PolicyVersion {
  return {
    id: api.id, name: api.name, description: api.description, isBaseline: api.is_baseline,
    epsilon: api.epsilon, openingStrategy: api.opening_strategy, pitchAngle: api.pitch_angle,
    ctaVariant: api.cta_variant, createdAt: api.created_at,
  };
}

export async function fetchPolicyVersions(): Promise<PolicyVersion[]> {
  const data = await request<ApiPolicyVersion[]>("/rl/policy-versions");
  return data.map(mapPolicyVersion);
}

export async function createPolicyVersion(input: Partial<PolicyVersion>): Promise<PolicyVersion> {
  const body = {
    name: input.name, description: input.description ?? "",
    is_baseline: input.isBaseline ?? false, epsilon: input.epsilon ?? 0.3,
    opening_strategy: input.openingStrategy ?? "warm_question",
    pitch_angle: input.pitchAngle ?? "placement", cta_variant: input.ctaVariant ?? "book_counseling",
  };
  const data = await request<ApiPolicyVersion>("/rl/policy-versions", { method: "POST", body: JSON.stringify(body) });
  return mapPolicyVersion(data);
}

interface ApiABTest {
  id: string; name: string; campaign_id: string; policy_a_id: string; policy_b_id: string;
  split_ratio: number; is_active: boolean; calls_a: number; calls_b: number;
  conversions_a: number; conversions_b: number; created_at: string;
}

function mapABTest(api: ApiABTest): ABTest {
  return {
    id: api.id, name: api.name, campaignId: api.campaign_id,
    policyAId: api.policy_a_id, policyBId: api.policy_b_id,
    splitRatio: api.split_ratio, isActive: api.is_active,
    callsA: api.calls_a, callsB: api.calls_b,
    conversionsA: api.conversions_a, conversionsB: api.conversions_b,
    createdAt: api.created_at,
  };
}

export async function fetchABTests(): Promise<ABTest[]> {
  const data = await request<ApiABTest[]>("/rl/ab-tests");
  return data.map(mapABTest);
}

export async function createABTest(input: { name: string; policyAId: string; policyBId: string; splitRatio: number }): Promise<ABTest> {
  const data = await request<ApiABTest>("/rl/ab-tests", {
    method: "POST",
    body: JSON.stringify({ name: input.name, policy_a_id: input.policyAId, policy_b_id: input.policyBId, split_ratio: input.splitRatio }),
  });
  return mapABTest(data);
}

export async function simulateABCall(testId: string): Promise<ABTest> {
  const data = await request<ApiABTest>(`/rl/ab-tests/${testId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ simulate_call: true }),
  });
  return mapABTest(data);
}

interface ApiGuardrailEvent {
  id: string; call_sid: string; original_text: string;
  blocked_reason: string; replacement_text: string; occurred_at: string;
}

function mapGuardrailEvent(api: ApiGuardrailEvent): GuardrailEvent {
  return {
    id: api.id, callSid: api.call_sid, originalText: api.original_text,
    blockedReason: api.blocked_reason, replacementText: api.replacement_text,
    occurredAt: api.occurred_at,
  };
}

export async function fetchGuardrailEvents(): Promise<GuardrailEvent[]> {
  const data = await request<ApiGuardrailEvent[]>("/rl/guardrail-events");
  return data.map(mapGuardrailEvent);
}

export function uploadRecording(
  formData: FormData,
  onProgress: (pct: number) => void,
): Promise<RecordingUpload> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(mapRecordingUpload(JSON.parse(xhr.responseText) as ApiRecordingUpload));
      } else {
        try {
          const body = JSON.parse(xhr.responseText) as { detail?: unknown };
          reject(
            new Error(body.detail ? String(body.detail) : `Upload failed: ${xhr.status}`)
          );
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.open("POST", `${API_BASE_URL}/learning/recordings`);
    xhr.send(formData);
  });
}
