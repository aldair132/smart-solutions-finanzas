import { z } from "zod";

export const movementCategories = [
  "Ventas",
  "Mercadería",
  "Insumos",
  "Transporte",
  "Servicios",
  "Alquiler",
  "Personal",
  "Otros",
] as const;
export const extractionSchema = z.object({
  transcript: z
    .string()
    .describe(
      "Audio: transcripción literal palabra por palabra, sin resumir. Imagen: qué comprobante es y su total, en una línea",
    ),
  notes: z
    .string()
    .describe("Advertencias breves para el usuario; vacío si todo es claro"),
  movements: z.array(
    z.object({
      kind: z.enum(["income", "expense"]),
      description: z.string().describe("Concepto corto, máximo 6 palabras"),
      amountSoles: z
        .number()
        .nullable()
        .describe("Importe total en soles; null si no se entiende"),
      category: z.enum(movementCategories),
    }),
  ),
});
export const assistantReplySchema = z.object({
  answer: z.string().describe("Respuesta breve en español sencillo"),
});
export const creditAdviceSchema = z.object({
  summary: z.string().describe("Dos oraciones sobre la situación del negocio"),
  strengths: z.array(z.string()).describe("Hasta 3 fortalezas concretas"),
  improvements: z
    .array(z.string())
    .describe("Hasta 3 acciones concretas para mejorar el perfil"),
});
export const transcriptionSchema = z.object({
  text: z.string().describe("Transcripción literal del audio"),
});
export type Extraction = z.infer<typeof extractionSchema>;
