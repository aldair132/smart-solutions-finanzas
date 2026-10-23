import type {
  AiMode,
  ChatTurn,
  CreditAdvice,
  ExtractionResult,
  Space,
} from "./types";

type ExtractionInput = {
  space: Space;
  kindHint: "income" | "expense" | null;
} & (
  | { sourceType: "voice"; text: string }
  | { sourceType: "image"; image: { mediaType: "image/jpeg"; data: string } }
);

async function postJson<Result>(url: string, body: unknown): Promise<Result> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    (Result & { error?: string }) | null;
  if (!response.ok || !payload)
    throw new Error(payload?.error ?? "No pudimos conectar con la IA.");
  return payload;
}

export async function getAiMode(): Promise<AiMode> {
  try {
    const response = await fetch("/api/ai/status");
    const payload = (await response.json()) as { provider: string | null };
    return payload.provider ? "ai" : "demo";
  } catch {
    return "demo";
  }
}

export async function extractMovementDrafts(
  input: ExtractionInput,
): Promise<ExtractionResult> {
  const { space, ...request } = input;
  // TODO(BACKEND): cuando exista la API del compañero, mover /api/ai/extract detrás de la sesión. Entrada: spaceId, kindHint, sourceType y texto/imagen. Salida: ExtractionResult con importes inciertos en null; nunca guarda movimientos.
  return postJson<ExtractionResult>("/api/ai/extract", {
    ...request,
    spaceType: space.type,
  });
}

export async function askAssistant(input: {
  question: string;
  context: object;
  history: ChatTurn[];
}): Promise<{ mode: AiMode; answer: string }> {
  // TODO(BACKEND): el contexto debería calcularse en servidor a partir de los movimientos autorizados, no enviarse desde el navegador.
  return postJson("/api/ai/assistant", {
    task: "chat",
    question: input.question,
    context: JSON.stringify(input.context),
    history: input.history.slice(-10),
  });
}

export async function getCreditAdvice(context: object): Promise<CreditAdvice> {
  return postJson<CreditAdvice>("/api/ai/assistant", {
    task: "credit",
    context: JSON.stringify(context),
  });
}

// Reduce la foto a máx. 1600 px en JPEG para no exceder el límite de subida del servidor.
export async function compressImage(file: File) {
  const maxSide = 1600;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  return {
    mediaType: "image/jpeg" as const,
    data: dataUrl.slice(dataUrl.indexOf(",") + 1),
    previewUrl: dataUrl,
  };
}
