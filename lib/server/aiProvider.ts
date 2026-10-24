import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export type AiProviderName = "anthropic" | "gemini";
export type AiImage = {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  data: string;
};
export type AiAudio = { mediaType: "audio/wav"; data: string };
type StructuredRequest<Schema extends z.ZodType> = {
  system: string;
  prompt: string;
  schema: Schema;
  // Cada imagen se etiqueta "Foto N" para que la IA indique de cuál sale cada dato.
  images?: AiImage[];
  audio?: AiAudio;
};
type GeminiModel = { name: string; thinkingLevel: "minimal" | "low" };

// Gemini tiene latencia variable (2 s a 20+ s según la demanda). Se usan modelos ligeros
// en cascada: si uno no responde a tiempo, se lanza el siguiente en paralelo y gana el primero.
const geminiModels: GeminiModel[] = [
  {
    name: process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest",
    thinkingLevel: "minimal",
  },
  { name: "gemini-3.1-flash-lite", thinkingLevel: "minimal" },
  { name: "gemini-3.5-flash", thinkingLevel: "low" },
];
const hedgeDelayMs = 7_000;
const geminiTimeoutMs = 25_000;

// Las claves solo se leen en servidor; nunca usar variables NEXT_PUBLIC_.
export function getAiProvider(): AiProviderName | null {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

// Solo Gemini acepta audio; con Claude la voz usa el dictado del navegador.
export function supportsAudio() {
  return getAiProvider() !== "anthropic";
}

// Voz neuronal gratuita de Gemini; GEMINI_TTS_ENABLED=false guarda la cuota (p. ej. al probar).
export function isNeuralVoiceEnabled() {
  return (
    getAiProvider() === "gemini" && process.env.GEMINI_TTS_ENABLED !== "false"
  );
}

export async function generateStructured<Schema extends z.ZodType>(
  request: StructuredRequest<Schema>,
): Promise<z.infer<Schema>> {
  const provider = getAiProvider();
  if (provider === "gemini") return generateWithGemini(request);
  if (provider === "anthropic") return generateWithClaude(request);
  throw new Error("No hay proveedor de IA configurado.");
}

async function generateWithClaude<Schema extends z.ZodType>({
  system,
  prompt,
  schema,
  images = [],
  audio,
}: StructuredRequest<Schema>): Promise<z.infer<Schema>> {
  const client = new Anthropic();
  const content: Anthropic.ContentBlockParam[] = [];
  if (audio) throw new Error("Claude no procesa audio; usa el dictado.");
  images.forEach((image, index) => {
    content.push({ type: "text", text: `Foto ${index + 1}:` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.data },
    });
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

async function generateWithGemini<Schema extends z.ZodType>(
  request: StructuredRequest<Schema>,
): Promise<z.infer<Schema>> {
  const controllers = geminiModels.map(() => new AbortController());
  const timers: ReturnType<typeof setTimeout>[] = [];
  try {
    return await new Promise<z.infer<Schema>>((resolve, reject) => {
      let failures = 0;
      let lastFailure: unknown = null;
      let started = 0;
      const startNext = () => {
        const index = started;
        if (index >= geminiModels.length) return;
        started += 1;
        callGemini(geminiModels[index], request, controllers[index].signal)
          .then(resolve)
          .catch((failure) => {
            if (controllers[index].signal.aborted) return;
            failures += 1;
            lastFailure = failure;
            // Un error de la petición (400) no mejora con otro modelo.
            if (!isRetryableGeminiFailure(failure)) return reject(failure);
            if (failures === geminiModels.length) return reject(lastFailure);
            startNext();
          });
        timers.push(setTimeout(startNext, hedgeDelayMs));
      };
      startNext();
    });
  } finally {
    // El primer resultado gana: se cancelan las demás peticiones y temporizadores.
    timers.forEach(clearTimeout);
    controllers.forEach((controller) => controller.abort());
  }
}

function isRetryableGeminiFailure(failure: unknown) {
  if (failure instanceof DOMException) return true;
  return (
    failure instanceof Error &&
    /Gemini respondió (429|5\d\d)/.test(failure.message)
  );
}

async function callGemini<Schema extends z.ZodType>(
  model: GeminiModel,
  { system, prompt, schema, images = [], audio }: StructuredRequest<Schema>,
  signal: AbortSignal,
): Promise<z.infer<Schema>> {
  const jsonSchema = z.toJSONSchema(schema);
  const parts: object[] = [];
  // Gemini rechaza la clave $schema del estándar JSON Schema.
  delete jsonSchema.$schema;
  images.forEach((image, index) => {
    parts.push({ text: `Foto ${index + 1}:` });
    parts.push({ inlineData: { mimeType: image.mediaType, data: image.data } });
  });
  if (audio)
    parts.push({ inlineData: { mimeType: audio.mediaType, data: audio.data } });
  parts.push({ text: prompt });
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent`,
    {
      method: "POST",
      signal: AbortSignal.any([signal, AbortSignal.timeout(geminiTimeoutMs)]),
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
          thinkingConfig: { thinkingLevel: model.thinkingLevel },
        },
      }),
    },
  );
  if (!response.ok)
    throw new Error(
      `Gemini respondió ${response.status} (${model.name}): ${await response.text()}`,
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
