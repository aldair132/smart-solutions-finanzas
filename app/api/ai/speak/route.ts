import { z } from "zod";
import { isNeuralVoiceEnabled } from "@/lib/server/aiProvider";
import { checkRateLimit } from "@/lib/server/rateLimit";
import { SpeechQuotaError, synthesizeSpeech } from "@/lib/server/speech";

const requestSchema = z.object({ text: z.string().trim().min(1).max(600) });

export async function POST(request: Request) {
  const limited = checkRateLimit(request, "speak", 20);
  if (limited) return limited;
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: "Texto inválido." }, { status: 400 });
  if (!isNeuralVoiceEnabled())
    return Response.json(
      { error: "La voz natural requiere Gemini." },
      { status: 501 },
    );
  try {
    const wav = await synthesizeSpeech(parsed.data.text);
    return new Response(new Uint8Array(wav), {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
    });
  } catch (failure) {
    if (failure instanceof SpeechQuotaError)
      return Response.json({ error: "Cuota de voz agotada." }, { status: 503 });
    console.error("Voz natural fallida", failure);
    return Response.json({ error: "Voz no disponible." }, { status: 502 });
  }
}
