import { z } from "zod";
import { extractionSchema } from "@/lib/aiSchemas";
import { getDemoExtraction } from "@/lib/mockData";
import { generateStructured, getAiProvider } from "@/lib/server/aiProvider";
import { extractionSystemPrompt } from "@/lib/server/prompts";
import type { ExtractionResult } from "@/lib/types";

const requestSchema = z.object({
  sourceType: z.enum(["voice", "image"]),
  spaceType: z.enum(["business", "personal"]),
  kindHint: z.enum(["income", "expense"]).nullable(),
  text: z.string().trim().max(4000).optional(),
  image: z
    .object({
      mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      data: z.string().max(6_000_000),
    })
    .optional(),
});
type ExtractionRequest = z.infer<typeof requestSchema>;

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  const input = parsed.data;
  if (input.sourceType === "voice" && !input.text)
    return Response.json(
      { error: "No escuchamos ningún texto." },
      { status: 400 },
    );
  if (input.sourceType === "image" && !input.image)
    return Response.json({ error: "Falta la imagen." }, { status: 400 });
  if (!getAiProvider())
    return Response.json(getDemoExtraction(input.sourceType, input.kindHint));
  try {
    const extraction = await generateStructured({
      system: extractionSystemPrompt,
      prompt: buildExtractionPrompt(input),
      schema: extractionSchema,
      image: input.image,
    });
    const result: ExtractionResult = {
      mode: "ai",
      transcript: extraction.transcript,
      notes: extraction.notes,
      drafts: extraction.movements.map((movement) => ({
        kind: input.spaceType === "personal" ? "expense" : movement.kind,
        description: movement.description.slice(0, 120),
        amountMinor:
          movement.amountSoles && movement.amountSoles > 0
            ? Math.round(movement.amountSoles * 100)
            : null,
        category: movement.category,
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
      : "Es un negocio: puede haber ventas y gastos.";
  const hint = input.kindHint
    ? `El usuario eligió registrar ${input.kindHint === "income" ? "ventas" : "gastos"}; úsalo solo cuando el texto sea ambiguo.`
    : "";
  if (input.sourceType === "voice")
    return `${spaceContext} ${hint}\nDictado del usuario: """${input.text}"""`;
  return `${spaceContext} ${hint}\nExtrae los movimientos de esta imagen.`;
}
