/** Shared plain types for the AI layer. No runtime code. */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ImagePart {
  type: 'image_url';
  image_url: { url: string };
}

export type ChatContentPart = TextPart | ImagePart;

export interface ChatMessage {
  role: ChatRole;
  content: string | ChatContentPart[];
}

/** A raw image (no `data:` prefix) the app already resized/compressed. */
export interface ImageInput {
  base64: string;
  mimeType: string;
}

export interface ChatUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  /** USD, when OpenRouter reports it. */
  cost?: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  contextLength: number;
  inputModalities: string[];
  supportsImages: boolean;
  supportsStructuredOutputs: boolean;
  supportsTools: boolean;
  /** USD per million prompt tokens, null when unknown. */
  promptPricePerM: number | null;
  /** USD per million completion tokens, null when unknown. */
  completionPricePerM: number | null;
  /** USD per 1000 input images, null/undefined when unknown. */
  imagePricePerK?: number | null;
  isFree: boolean;
  /** Unix seconds, when the catalogue provides it. */
  created?: number;
}

export interface KeyInfo {
  label: string | null;
  /** Credit limit in USD, null = unlimited. */
  limit: number | null;
  limitRemaining: number | null;
  limitReset: string | null;
  usage: number;
  usageDaily: number;
  usageMonthly: number;
  isFreeTier: boolean;
  isManagementKey: boolean;
  expiresAt: string | null;
  freeModelDailyRequests: { limit: number | null; remaining: number | null; used: number | null } | null;
  /**
   * Account-wide credit totals (GET /credits), when the key may read them. Absent for a regular inference
   * key (OpenRouter answers 403): then `usage`/`limit` above are THIS KEY's numbers only, not the balance.
   */
  account?: AccountCredits | null;
}

/** `GET /credits` (management key): total credits ever purchased and ever used across the account, USD. */
export interface AccountCredits {
  totalCredits: number;
  totalUsage: number;
}
