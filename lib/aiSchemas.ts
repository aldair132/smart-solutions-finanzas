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
      "Audio: transcripción literal palabra por palabra, sin resumir. Imágenes: qué comprobantes son y sus totales, en una línea",
    ),
  notes: z
    .string()
    .describe("Advertencias breves para el usuario; vacío si todo es claro"),
  movements: z.array(
    z.object({
      kind: z
        .enum(["income", "expense", "credit_sale", "credit_collection"])
        .describe(
          "income venta cobrada; expense gasto; credit_sale venta fiada (no pagada); credit_collection cobro de un fiado anterior",
        ),
      customer: z
        .string()
        .nullable()
        .describe(
          "Solo en credit_sale o credit_collection: nombre o apodo del cliente tal como lo dijo; null en los demás",
        ),
      description: z.string().describe("Concepto corto, máximo 6 palabras"),
      amountSoles: z
        .number()
        .nullable()
        .describe("Importe total en soles; null si no se entiende"),
      category: z.enum(movementCategories),
      photo: z
        .number()
        .nullable()
        .describe(
          "Número de la foto de la que sale (Foto 1 = 1); null si no hay fotos",
        ),
      date: z
        .string()
        .nullable()
        .describe(
          "AAAA-MM-DD: fecha del comprobante o la mencionada (hoy, ayer…); null si no hay",
        ),
      issuer: z
        .string()
        .nullable()
        .describe(
          "Nombre del emisor impreso en el comprobante; null en voz o texto",
        ),
      items: z
        .array(
          z.object({
            description: z.string().describe("Producto, máximo 5 palabras"),
            quantity: z
              .number()
              .nullable()
              .describe("Cantidad impresa; null si no aparece"),
            amountSoles: z
              .number()
              .describe("Importe de la línea en soles (cantidad × precio)"),
          }),
        )
        .describe(
          "Productos de una boleta, factura o ticket; vacío en cuadernos, pagos digitales, voz o texto",
        ),
    }),
  ),
});
export const assistantReplySchema = z.object({
  answer: z.string().describe("Respuesta breve en español sencillo"),
  followUps: z
    .array(z.string())
    .describe(
      "2 o 3 preguntas cortas (máx. 7 palabras) que el usuario podría hacer después, en primera persona",
    ),
});
export const voiceReplySchema = z.object({
  question: z
    .string()
    .describe("Transcripción literal de la pregunta del audio"),
  answer: z.string().describe("Respuesta breve en español sencillo"),
  followUps: z
    .array(z.string())
    .describe(
      "2 o 3 preguntas cortas (máx. 7 palabras) que el usuario podría hacer después, en primera persona",
    ),
});
export const creditAdviceSchema = z.object({
  summary: z.string().describe("Dos oraciones sobre la situación del negocio"),
  strengths: z.array(z.string()).describe("Hasta 3 fortalezas concretas"),
  improvements: z
    .array(z.string())
    .describe("Hasta 3 acciones concretas para mejorar el perfil"),
});
export type Extraction = z.infer<typeof extractionSchema>;
