"use client";
import { useEffect, useRef, useState } from "react";
import { convertRecordingToWav } from "@/lib/audioEncoding";

type WavAudio = Awaited<ReturnType<typeof convertRecordingToWav>>;
const maxRecordingSeconds = 60;

// Graba con MediaRecorder: funciona en Chrome, Edge, Opera, Brave, Firefox y Safari,
// a diferencia del dictado del navegador (Web Speech), que solo funciona en Chrome/Edge.
export function useAudioRecorder(onRecorded: (audio: WavAudio) => void) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const onRecordedRef = useRef(onRecorded);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recorderError, setRecorderError] = useState("");
  useEffect(() => {
    onRecordedRef.current = onRecorded;
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
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        recorder.onstop = null;
        recorder.stop();
      }
    };
  }, []);
  async function startRecording() {
    setRecorderError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
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
  return {
    isRecording,
    seconds,
    maxRecordingSeconds,
    recorderError,
    startRecording,
    stopRecording,
  };
}
