"use client";
import { useEffect, useRef, useState } from "react";
import { synthesizeSpeech } from "@/lib/aiService";

type VoiceStatus = "idle" | "loading" | "speaking";
type SpeakOptions = { onEnd?: () => void };

const fillerClips = [
  "/voz/revisando-1.wav",
  "/voz/revisando-2.wav",
  "/voz/revisando-3.wav",
];
const neuralRetryMs = 10 * 60_000;
// Compartido por toda la página: si la voz neuronal falla, no se vuelve a intentar
// por un rato y las respuestas suenan de inmediato con la voz del navegador.
let neuralUnavailableUntil = 0;

function isNeuralAvailable() {
  return Date.now() > neuralUnavailableUntil;
}

// Divide en primera frase + resto: la primera parte llega antes y empieza a sonar
// mientras la segunda se genera en paralelo.
function splitForSpeech(text: string) {
  const cleanText = text.replace(/S\/\s?([\d.,]+)/g, "$1 soles").trim();
  const firstSentenceEnd = cleanText.search(/[.!?](\s|$)/);
  if (firstSentenceEnd < 0 || firstSentenceEnd > cleanText.length - 20)
    return [cleanText];
  return [
    cleanText.slice(0, firstSentenceEnd + 1).trim(),
    cleanText.slice(firstSentenceEnd + 1).trim(),
  ].filter(Boolean);
}

// Prefiere voces neuronales del sistema ("Natural", "Online", "Google") con acento latino.
function pickBrowserVoice() {
  const spanishVoices = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith("es"));
  const score = (voice: SpeechSynthesisVoice) =>
    (/natural|online|neural|google/i.test(voice.name) ? 4 : 0) +
    (/es[-_](PE|419|US|MX|CO|AR|CL)/i.test(voice.lang) ? 2 : 0) +
    (voice.localService ? 0 : 1);
  return spanishVoices.sort((first, second) => score(second) - score(first))[0];
}

function speakWithBrowser(text: string, onEnd: () => void) {
  if (!("speechSynthesis" in window)) {
    onEnd();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickBrowserVoice();
  utterance.lang = voice?.lang ?? "es-PE";
  if (voice) utterance.voice = voice;
  utterance.rate = 1.05;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// Voz neuronal de Gemini con respaldo a la mejor voz del navegador.
export function useNaturalVoice({ useNeural }: { useNeural: boolean }) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fillerRef = useRef<Promise<void> | null>(null);
  const fillerControllerRef = useRef<AbortController | null>(null);
  const urlsRef = useRef<string[]>([]);
  useEffect(() => {
    const urls = urlsRef.current;
    // Algunos navegadores cargan la lista de voces de forma diferida.
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    return () => {
      abortRef.current?.abort();
      fillerControllerRef.current?.abort();
      audioRef.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  function releaseAudio() {
    // Se vacía el mismo arreglo para que la limpieza al desmontar lo vea.
    urlsRef.current.splice(0).forEach((url) => URL.revokeObjectURL(url));
  }
  function stopPlayback() {
    abortRef.current?.abort();
    abortRef.current = null;
    fillerControllerRef.current?.abort();
    fillerControllerRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    fillerRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    releaseAudio();
  }
  function stop() {
    stopPlayback();
    setStatus("idle");
    setSpeakingText(null);
  }
  function playSource(source: string, controller: AbortController) {
    return new Promise<void>((resolve, reject) => {
      if (controller.signal.aborted) return resolve();
      const audio = new Audio(source);
      audioRef.current = audio;
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("No se pudo reproducir."));
      controller.signal.addEventListener(
        "abort",
        () => {
          audio.pause();
          resolve();
        },
        { once: true },
      );
      audio.play().catch(reject);
    });
  }
  // Frase corta pregrabada ("A ver, déjame revisar…") mientras la IA piensa.
  function playFiller() {
    if (!useNeural || !isNeuralAvailable()) return;
    const controller = new AbortController();
    const clip = fillerClips[Math.floor(Math.random() * fillerClips.length)];
    stopPlayback();
    fillerControllerRef.current = controller;
    fillerRef.current = playSource(clip, controller).catch(() => undefined);
  }
  async function speak(text: string, { onEnd }: SpeakOptions = {}) {
    const pendingFiller = fillerRef.current;
    const controller = new AbortController();
    const parts = splitForSpeech(text);
    const finish = () => {
      if (controller.signal.aborted) return;
      releaseAudio();
      setStatus("idle");
      setSpeakingText(null);
      onEnd?.();
    };
    const fallBackToBrowser = () => {
      setStatus("speaking");
      speakWithBrowser(parts.join(" "), finish);
    };
    // No se corta la frase de relleno: la respuesta empieza cuando termina.
    abortRef.current?.abort();
    abortRef.current = controller;
    fillerRef.current = null;
    setSpeakingText(text);
    setStatus("loading");
    if (!useNeural || !isNeuralAvailable()) {
      await pendingFiller;
      if (!controller.signal.aborted) fallBackToBrowser();
      return;
    }
    try {
      const pendingAudio = parts.map((part) =>
        synthesizeSpeech(part, controller.signal),
      );
      await pendingFiller;
      for (const pending of pendingAudio) {
        const url = URL.createObjectURL(await pending);
        urlsRef.current.push(url);
        setStatus("speaking");
        await playSource(url, controller);
        if (controller.signal.aborted) return;
      }
      finish();
    } catch {
      if (controller.signal.aborted) return;
      neuralUnavailableUntil = Date.now() + neuralRetryMs;
      fallBackToBrowser();
    }
  }
  return { status, speakingText, speak, stop, playFiller };
}
