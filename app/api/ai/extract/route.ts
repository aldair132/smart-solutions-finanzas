import { z } from "zod";
import { checkRateLimit } from "@/lib/server/rateLimit";
import { extractionSchema } from "@/lib/aiSchemas";
import { demoDate, getDemoExtraction } from "@/lib/mockData";
import { generateStructured, getAiProvider } from "@/lib/server/aiProvider";
import { extractionSystemPrompt } from "@/lib/server/prompts";
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
        kind: input.spaceType === "personal" ? "expense" : movement.kind,
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
  const spaceContext =
    input.spaceType === "personal"
      ? "Es la cuenta personal: todo movimiento es un gasto (expense)."
      : `Es un negocio llamado "${input.spaceName ?? "sin nombre"}": puede haber ventas y gastos. En un comprobante, si el emisor es este negocio (o un nombre parecido) es una venta (income); si lo emite otro negocio, es una compra (expense).`;
  const hint = input.kindHint
    ? `El usuario eligió registrar ${input.kindHint === "income" ? "ventas" : "gastos"}; úsalo solo cuando el texto sea ambiguo.`
    : "";
  if (input.audio)
    return `${spaceContext} ${hint}\nTranscribe fielmente el audio en transcript y extrae los movimientos.`;
  if (input.sourceType === "voice")
    return `${spaceContext} ${hint}\nDictado del usuario: """${input.text}"""`;
  const photoCount = input.images?.length ?? 1;
  const receiptRules = `Para CADA comprobante compara el emisor (el nombre impreso arriba, junto al RUC) con "${input.spaceName ?? ""}": solo si coinciden es venta (income); si lo emite otro negocio o proveedor, para el usuario es una compra (expense), aunque el papel diga "Boleta de venta". Hoy es ${demoDate}: si una fecha tiene más de un año o es posterior a hoy, avísalo en notes.`;
  if (photoCount === 1)
    return `${spaceContext} ${hint}\nExtrae los movimientos de la Foto 1. ${receiptRules}`;
  return `${spaceContext} ${hint}\nHay ${photoCount} fotos. Cada comprobante es independiente: extrae sus movimientos e indica en photo de qué foto sale. ${receiptRules} Si dos fotos muestran el mismo comprobante (mismo número, o mismo total y fecha), regístralo una sola vez y avísalo en notes.`;
}
