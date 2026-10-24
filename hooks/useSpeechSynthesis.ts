"use client";
import { useEffect, useState } from "react";

// Prefiere voces de Latinoamérica; si no hay, cualquier voz en español.
function pickSpanishVoice() {
  const voices = window.speechSynthesis.getVoices();
  const preferredLocales = [
    "es-PE",
    "es-419",
    "es-US",
    "es-MX",
    "es-CO",
    "es-AR",
  ];
  for (const locale of preferredLocales) {
    const voice = voices.find((item) => item.lang.replace("_", "-") === locale);
    if (voice) return voice;
  }
  return (
    voices.find((item) => item.lang.toLowerCase().startsWith("es")) ?? null
  );
}

// Lectura en voz alta gratuita del navegador: útil para quienes leen con dificultad.
export function useSpeechSynthesis() {
  const [isSupported, setIsSupported] = useState(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  useEffect(() => {
    const supported =
      typeof window !== "undefined" && "speechSynthesis" in window;
    queueMicrotask(() => setIsSupported(supported));
    if (!supported) return;
    // Algunos navegadores cargan las voces de forma diferida.
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, []);
  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      text.replace(/S\/\s?([\d.,]+)/g, "$1 soles"),
    );
    const voice = pickSpanishVoice();
    utterance.lang = voice?.lang ?? "es-PE";
    if (voice) utterance.voice = voice;
    utterance.rate = 1;
    utterance.onend = () => setSpeakingText(null);
    utterance.onerror = () => setSpeakingText(null);
    setSpeakingText(text);
    window.speechSynthesis.speak(utterance);
  }
  function stop() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingText(null);
  }
  return { isSupported, speakingText, speak, stop };
}
