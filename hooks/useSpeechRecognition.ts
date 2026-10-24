"use client";
import { useEffect, useRef, useState } from "react";

// Tipos mínimos de Web Speech API; TypeScript no los incluye en lib.dom.
type RecognitionResultList = ArrayLike<
  ArrayLike<{ transcript: string }> & { isFinal: boolean }
>;
type RecognitionEvent = { resultIndex: number; results: RecognitionResultList };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionConstructor = new () => Recognition;

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

export function useSpeechRecognition(onFinalText: (text: string) => void) {
  const recognitionRef = useRef<Recognition | null>(null);
  const onFinalTextRef = useRef(onFinalText);
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [speechError, setSpeechError] = useState("");
  useEffect(() => {
    onFinalTextRef.current = onFinalText;
  });
  useEffect(() => {
    const supported = getRecognitionConstructor() !== null;
    // Se decide tras montar para no desajustar el HTML del servidor.
    queueMicrotask(() => setIsSupported(supported));
    return () => {
      const recognition = recognitionRef.current;
      if (!recognition) return;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    };
  }, []);
  function startListening() {
    const RecognitionClass = getRecognitionConstructor();
    if (!RecognitionClass) return;
    const recognition = new RecognitionClass();
    recognition.lang = "es-PE";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interim = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index++
      ) {
        const result = event.results[index];
        if (result.isFinal) onFinalTextRef.current(result[0].transcript.trim());
        else interim += result[0].transcript;
      }
      setInterimText(interim);
    };
    recognition.onerror = (event) => {
      setSpeechError(
        event.error === "not-allowed"
          ? "Permite el uso del micrófono para dictar."
          : "No pudimos escucharte. Intenta otra vez o escribe.",
      );
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };
    recognitionRef.current = recognition;
    setSpeechError("");
    setIsListening(true);
    recognition.start();
  }
  function stopListening() {
    recognitionRef.current?.stop();
  }
  function cancelListening() {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText("");
  }
  return {
    isSupported,
    isListening,
    interimText,
    speechError,
    startListening,
    stopListening,
    cancelListening,
  };
}
