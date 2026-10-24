import { z } from "zod";
import { getBusinessDay } from "@/lib/businessDate";
import { checkRateLimit } from "@/lib/server/rateLimit";
import { extractionSchema } from "@/lib/aiSchemas";
import { getDemoExtraction } from "@/lib/mockData";
import { generateStructured, getAiProvider } from "@/lib/server/aiProvider";
import { extractionSystemPrompt } from "@/lib/server/prompts";
import { decideReceiptKind } from "@/lib/server/receiptRules";
import type { ExtractionResult } from "@/lib/types";

const maxPhotos = 6;
const requestSchema = z.object({
  sourceType: z.enum(["voice", "image"]),
  spaceType: z.enum(["business", "personal"]),
  spaceName: z.string().trim().max(60).optional(),
  kindHint: z.enum(["income", "expense"]).nullable(),
  text: z.string().trim().max(4000).optional(),
  // Hasta 6 fotos en una sola llamada (~4 MB en total, bajo el límite de Vercel).
  images: z
    .array(
      z.object({
        mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        data: z.string().max(1_500_000),
      }),
    )
    .min(1)
    .max(maxPhotos)
    .optional(),
  audio: z
    .object({
      mediaType: z.literal("audio/wav"),
      data: z.string().max(4_000_000),
    })
    .optional(),
});
type ExtractionRequest = z.infer<typeof requestSchema>;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const limited = checkRateLimit(request);
  if (limited) return limited;
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  const input = parsed.data;
  if (input.sourceType === "voice" && !input.text && !input.audio)
    return Response.json(
      { error: "No escuchamos ningún texto." },
      { status: 400 },
    );
  if (input.sourceType === "image" && !input.images)
    return Response.json({ error: "Falta la imagen." }, { status: 400 });
  if (!getAiProvider())
    return Response.json(getDemoExtraction(input.sourceType, input.kindHint));
  try {
    const extraction = await generateStructured({
      system: extractionSystemPrompt,
      prompt: buildExtractionPrompt(input),
      schema: extractionSchema,
      images: input.images,
      audio: input.audio,
    });
    const result: ExtractionResult = {
      mode: "ai",
      transcript: extraction.transcript,
      notes: extraction.notes,
      drafts: extraction.movements.map((movement) => ({
        kind:
          input.spaceType === "personal"
            ? "expense"
            : decideReceiptKind(
                movement.kind,
                movement.issuer,
                input.spaceName,
              ),
        customer: movement.customer?.trim().slice(0, 60) || null,
        description: movement.description.slice(0, 120),
        amountMinor:
          movement.amountSoles && movement.amountSoles > 0
            ? Math.round(movement.amountSoles * 100)
            : null,
        category: movement.category,
        photoIndex:
          input.images &&
          movement.photo &&
          movement.photo <= input.images.length
            ? movement.photo
            : null,
        date:
          movement.date && isoDatePattern.test(movement.date)
            ? movement.date
            : null,
      })),
    };
    return Response.json(result);
  } catch (failure) {
    console.error("Extracción IA fallida", failure);
    return Response.json(
      {
        error:
          "La IA no pudo procesar el registro. Intenta otra vez o escríbelo.",
      },
      { status: 502 },
    );
  }
}

function buildExtractionPrompt(input: ExtractionRequest) {
  const today = `Hoy es ${getBusinessDay()}.`;
  const spaceContext =
    input.spaceType === "personal"
      ? "Es la cuenta personal: todo movimiento es un gasto (expense)."
      : `Es un negocio llamado "${input.spaceName ?? "sin nombre"}": puede haber ventas y gastos.`;
  const hint = input.kindHint
    ? `El usuario eligió registrar ${input.kindHint === "income" ? "ventas" : "gastos"}; úsalo solo cuando sea ambiguo.`
    : "";
  const context = `${today} ${spaceContext} ${hint}`;
  if (input.audio)
    return `${context}
Transcribe fielmente el audio en transcript y extrae los movimientos con su fecha si la mencionan.`;
  if (input.sourceType === "voice")
    return `${context}
Dictado del usuario: """${input.text}"""`;
  const photoCount = input.images?.length ?? 1;
  // Las fechas antiguas o futuras las valida la app (lib/draftReview.ts); la IA solo las lee.
  const receiptRules = `Copia en issuer el emisor de cada comprobante. No comentes las fechas en notes.`;
  if (photoCount === 1)
    return `${context}
Extrae los movimientos de la Foto 1. ${receiptRules}`;
  return `${context}
Hay ${photoCount} fotos. Cada comprobante es independiente: extrae sus movimientos e indica en photo de qué foto sale. ${receiptRules} Si dos fotos muestran el mismo comprobante (mismo número, o mismo total y fecha), regístralo una sola vez y avísalo en notes.`;
}
