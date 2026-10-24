export type Space = {
  id: string;
  name: string;
  type: "business" | "personal";
  currency: "PEN";
  timeZone: string;
};
export type CaptureSource = "voice" | "image" | "text";
export type Movement = {
  id: string;
  spaceId: string;
  kind: "income" | "expense" | "transfer";
  amountMinor: number;
  description: string;
  occurredAt: string;
  category?: string;
  source?: CaptureSource;
  receivableId?: string;
};
export type User = { id: string; fullName: string };
// Venta al crédito ("fiado"): no es dinero en caja hasta que se cobra.
export type Receivable = {
  id: string;
  spaceId: string;
  customer: string;
  description: string;
  amountMinor: number;
  paidMinor: number;
  createdAt: string;
  paidAt?: string;
};
export type DemoState = {
  demoSeedDate?: string;
  spaces: Space[];
  movements: Movement[];
  receivables: Receivable[];
  user: User;
};
export type Period = "today" | "7d" | "month";
export type AiMode = "ai" | "demo";
export type AiStatus = {
  mode: AiMode;
  checkFailed?: boolean;
  supportsAudio: boolean;
  neuralVoice: boolean;
};
export type DraftKind =
  "income" | "expense" | "credit_sale" | "credit_collection";
export type MovementDraft = {
  kind: DraftKind;
  customer: string | null;
  description: string;
  amountMinor: number | null;
  category: string;
  photoIndex: number | null;
  date: string | null;
};
export type ExtractionResult = {
  mode: AiMode;
  transcript: string;
  notes: string;
  drafts: MovementDraft[];
};
export type ChatTurn = {
  role: "user" | "assistant";
  text: string;
  followUps?: string[];
};
export type CreditAdvice = {
  mode: AiMode;
  summary: string;
  strengths: string[];
  improvements: string[];
};
