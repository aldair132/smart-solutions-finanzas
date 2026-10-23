import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export type AiProviderName = "anthropic" | "gemini";
export type AiImage = {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  data: string;
};
type StructuredRequest<Schema extends z.ZodType> = {
  system: string;
  prompt: string;
  schema: Schema;
  image?: AiImage;
};

// Las claves solo se leen en servidor; nunca usar variables NEXT_PUBLIC_.
export function getAiProvider(): AiProviderName | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

export async function generateStructured<Schema extends z.ZodType>(
  request: StructuredRequest<Schema>,
): Promise<z.infer<Schema>> {
  const provider = getAiProvider();
  if (provider === "anthropic") return generateWithClaude(request);
  if (provider === "gemini") return generateWithGemini(request);
  throw new Error("No hay proveedor de IA configurado.");
}

async function generateWithClaude<Schema extends z.ZodType>({
  system,
  prompt,
  schema,
  image,
}: StructuredRequest<Schema>): Promise<z.infer<Schema>> {
  const client = new Anthropic();
  const content: Anthropic.ContentBlockParam[] = [];
  if (image)
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.data },
    });
  content.push({ type: "text", text: prompt });
  const response = await client.messages.parse({
    model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
    max_tokens: 4000,
    system,
    output_config: { format: zodOutputFormat(schema), effort: "low" },
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output)
    throw new Error("La IA no devolvió una respuesta válida.");
  return response.parsed_output;
}

async function generateWithGemini<Schema extends z.ZodType>({
  system,
  prompt,
  schema,
  image,
}: StructuredRequest<Schema>): Promise<z.infer<Schema>> {
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
  const jsonSchema = z.toJSONSchema(schema);
  // Gemini rechaza la clave $schema del estándar JSON Schema.
  delete jsonSchema.$schema;
  const parts: object[] = [];
  if (image)
    parts.push({ inlineData: { mimeType: image.mediaType, data: image.data } });
  parts.push({ text: prompt });
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
        },
      }),
    },
  );
  if (!response.ok)
    throw new Error(
      `Gemini respondió ${response.status}: ${await response.text()}`,
    );
  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("");
  if (!text) throw new Error("Gemini no devolvió contenido.");
  return schema.parse(JSON.parse(text));
}
