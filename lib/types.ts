export type Space = {
  id: string;
  name: string;
  type: "business" | "personal";
  currency: "PEN";
  timeZone: string;
};
export type Movement = {
  id: string;
  spaceId: string;
  kind: "income" | "expense" | "transfer";
  amountMinor: number;
  description: string;
  occurredAt: string;
  category?: string;
};
export type User = { id: string; fullName: string };
export type DemoState = { spaces: Space[]; movements: Movement[]; user: User };
export type Period = "today" | "7d" | "month";
