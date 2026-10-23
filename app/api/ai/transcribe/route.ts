import { z } from "zod";
import { transcriptionSchema } from "@/lib/aiSchemas";
import { generateStructured, getAiProvider } from "@/lib/server/aiProvider";

const requestSchema = z.object({
  audio: z.object({
    mediaType: z.literal("audio/wav"),
    data: z.string().max(4_000_000),
  }),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  if (getAiProvider() !== "gemini")
    return Response.json(
      { error: "Activa la IA para dictar tu pregunta; mientras, escríbela." },
      { status: 400 },
    );
  try {
    const transcription = await generateStructured({
      system:
        "Transcribes audios cortos en español de Perú. Devuelve solo lo que la persona dijo, con puntuación correcta.",
      prompt: "Transcribe este audio.",
      schema: transcriptionSchema,
      audio: parsed.data.audio,
    });
    return Response.json({ text: transcription.text });
  } catch (failure) {
    console.error("Transcripción fallida", failure);
    return Response.json(
      { error: "No pudimos entender el audio. Intenta otra vez o escribe." },
      { status: 502 },
    );
  }
}
