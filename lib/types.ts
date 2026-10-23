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
};
export type User = { id: string; fullName: string };
export type DemoState = { spaces: Space[]; movements: Movement[]; user: User };
export type Period = "today" | "7d" | "month";
export type AiMode = "ai" | "demo";
export type AiStatus = { mode: AiMode; supportsAudio: boolean };
export type MovementDraft = {
  kind: "income" | "expense";
  description: string;
  amountMinor: number | null;
  category: string;
};
export type ExtractionResult = {
  mode: AiMode;
  transcript: string;
  notes: string;
  drafts: MovementDraft[];
};
export type ChatTurn = { role: "user" | "assistant"; text: string };
export type CreditAdvice = {
  mode: AiMode;
  summary: string;
  strengths: string[];
  improvements: string[];
};
