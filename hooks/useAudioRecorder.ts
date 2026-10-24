"use client";
import { useEffect, useRef, useState } from "react";
import { convertRecordingToWav } from "@/lib/audioEncoding";

type WavAudio = Awaited<ReturnType<typeof convertRecordingToWav>>;
type RecorderOptions = {
  // Corta solo al detectar una pausa después de hablar (modo conversación).
  autoStopOnSilence?: boolean;
  onNoSpeech?: () => void;
};
const maxRecordingSeconds = 60;
const silenceAfterSpeechMs = 1300;
const maxWaitForSpeechMs = 8000;
const vadIntervalMs = 100;

// Detector de voz por energía: compara el volumen con el ruido de fondo inicial.
function startVoiceDetector(
  stream: MediaStream,
  onLevel: (level: number) => void,
  onSilenceAfterSpeech: () => void,
  onNoSpeech: () => void,
) {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const samples = new Float32Array(1024);
  const startedAt = Date.now();
  let noiseFloor = Infinity;
  let hasSpoken = false;
  let silentSince = 0;
  analyser.fftSize = 1024;
  audioContext.createMediaStreamSource(stream).connect(analyser);
  const timer = window.setInterval(() => {
    const elapsed = Date.now() - startedAt;
    analyser.getFloatTimeDomainData(samples);
    const rms = Math.sqrt(
      samples.reduce((sum, sample) => sum + sample * sample, 0) /
        samples.length,
    );
    if (elapsed < 400) noiseFloor = Math.min(noiseFloor, rms);
    const threshold = Math.max(0.02, (noiseFloor || 0.01) * 3);
    onLevel(Math.min(1, rms / (threshold * 3)));
    if (elapsed < 400) return;
    if (rms > threshold) {
      hasSpoken = true;
      silentSince = 0;
      return;
    }
    if (!hasSpoken) {
      if (elapsed > maxWaitForSpeechMs) onNoSpeech();
      return;
    }
    silentSince ||= Date.now();
    if (Date.now() - silentSince > silenceAfterSpeechMs) onSilenceAfterSpeech();
  }, vadIntervalMs);
  return () => {
    window.clearInterval(timer);
    audioContext.close();
  };
}

// Graba con MediaRecorder: funciona en Chrome, Edge, Opera, Brave, Firefox y Safari,
// a diferencia del dictado del navegador (Web Speech), que solo funciona en Chrome/Edge.
export function useAudioRecorder(
  onRecorded: (audio: WavAudio) => void,
  options: RecorderOptions = {},
) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const onRecordedRef = useRef(onRecorded);
  const optionsRef = useRef(options);
  const stopDetectorRef = useRef<(() => void) | null>(null);
  const discardRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [recorderError, setRecorderError] = useState("");
  useEffect(() => {
    onRecordedRef.current = onRecorded;
    optionsRef.current = options;
  });
  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);
  useEffect(() => {
    if (
      seconds >= maxRecordingSeconds &&
      recorderRef.current?.state === "recording"
    )
      recorderRef.current.stop();
  }, [seconds]);
  useEffect(() => {
    return () => {
      stopDetectorRef.current?.();
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        recorder.onstop = null;
        recorder.stop();
      }
    };
  }, []);
  async function startRecording(
    startOptions: RecorderOptions = optionsRef.current,
  ) {
    if (recorderRef.current?.state === "recording") return;
    setRecorderError("");
    try {
      // Filtros del navegador: menos ruido de tienda y voz con volumen parejo.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      discardRef.current = false;
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = async () => {
        stopDetectorRef.current?.();
        stopDetectorRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setLevel(0);
        if (discardRef.current) return;
        try {
          onRecordedRef.current(
            await convertRecordingToWav(
              new Blob(chunks, { type: recorder.mimeType }),
            ),
          );
        } catch {
          setRecorderError("No pudimos procesar el audio. Intenta otra vez.");
        }
      };
      recorderRef.current = recorder;
      if (startOptions.autoStopOnSilence)
        stopDetectorRef.current = startVoiceDetector(
          stream,
          setLevel,
          () => stopRecording(),
          () => {
            cancelRecording();
            startOptions.onNoSpeech?.();
          },
        );
      setSeconds(0);
      setIsRecording(true);
      recorder.start();
    } catch {
      setRecorderError(
        "Permite el uso del micrófono en tu navegador para grabar.",
      );
    }
  }
  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }
  // Detiene sin enviar el audio (por ejemplo, al salir del modo conversación).
  function cancelRecording() {
    discardRef.current = true;
    stopRecording();
  }
  return {
    isRecording,
    seconds,
    level,
    maxRecordingSeconds,
    recorderError,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
