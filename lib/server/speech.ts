// Voz neuronal de Gemini: devuelve WAV listo para reproducir en el navegador.
// El nivel gratuito permite ~10 usos diarios por modelo; por eso se rota entre modelos
// y, si todos se agotan, se responde de inmediato para usar la voz del navegador.
const ttsModels = [
  process.env.GEMINI_TTS_MODEL ?? "gemini-3.8-flash-lite-tts",
  "gemini-3.8-flash-tts",
];
const ttsVoice = process.env.GEMINI_TTS_VOICE ?? "Kore";
const ttsTimeoutMs = 15_000;
const defaultCooldownMs = 10 * 60_000;
const cooldownUntil = new Map<string, number>();

export class SpeechQuotaError extends Error {}

function wrapPcmAsWav(pcm: Buffer, sampleRate: number) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function getRetryDelayMs(errorBody: string) {
  const seconds = /"retryDelay":\s*"(\d+)s"/.exec(errorBody)?.[1];
  return seconds ? Number(seconds) * 1000 : defaultCooldownMs;
}

// El texto se envía sin instrucciones: estos modelos leen en voz alta cualquier indicación.
async function requestSpeech(model: string, text: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      signal: AbortSignal.timeout(ttsTimeoutMs),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: ttsVoice } },
          },
        },
      }),
    },
  );
  if (response.status === 429) {
    cooldownUntil.set(
      model,
      Date.now() + getRetryDelayMs(await response.text()),
    );
    throw new SpeechQuotaError(`Cuota de voz agotada (${model})`);
  }
  if (!response.ok)
    throw new Error(`TTS respondió ${response.status} (${model})`);
  const payload = (await response.json()) as {
    candidates?: {
      content?: {
        parts?: { inlineData?: { mimeType: string; data: string } }[];
      };
    }[];
  };
  const audio = payload.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!audio) throw new Error("TTS no devolvió audio.");
  const bytes = Buffer.from(audio.data, "base64");
  if (audio.mimeType.startsWith("audio/wav")) return bytes;
  // Algunos modelos devuelven PCM crudo (audio/L16;rate=24000).
  const sampleRate = Number(/rate=(\d+)/.exec(audio.mimeType)?.[1] ?? 24000);
  return wrapPcmAsWav(bytes, sampleRate);
}

export async function synthesizeSpeech(text: string) {
  const availableModels = ttsModels.filter(
    (model) => (cooldownUntil.get(model) ?? 0) < Date.now(),
  );
  let lastFailure: unknown = new SpeechQuotaError("Cuota de voz agotada.");
  for (const model of availableModels) {
    try {
      return await requestSpeech(model, text);
    } catch (failure) {
      lastFailure = failure;
    }
  }
  throw lastFailure;
}
