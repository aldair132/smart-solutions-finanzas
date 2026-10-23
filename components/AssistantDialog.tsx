"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { askAssistant, transcribeAudio } from "@/lib/aiService";
import { buildAssistantContext } from "@/lib/assistantContext";
import type { ChatTurn } from "@/lib/types";
import { useDemo } from "./DemoProvider";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

const suggestedQuestions = [
  "¿Cuánto gané esta semana?",
  "¿En qué estoy gastando más este mes?",
  "¿Cómo mejoro mi perfil para un crédito?",
  "¿Qué negocio me deja más?",
];

export function AssistantDialog({
  spaceId,
  onClose,
}: {
  spaceId: string;
  onClose: () => void;
}) {
  const { spaces, movements, aiMode, supportsAudio } = useDemo();
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const listEndRef = useRef<HTMLDivElement>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const speech = useSpeechRecognition((text) =>
    setQuestion((current) => `${current} ${text}`.trim()),
  );
  const recorder = useAudioRecorder(async (audio) => {
    setIsTranscribing(true);
    setError("");
    try {
      sendQuestion(await transcribeAudio(audio));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sin audio.");
    } finally {
      setIsTranscribing(false);
    }
  });
  // Con Gemini se graba audio (cualquier navegador); si no, dictado del navegador.
  const usesRecorder = aiMode === "ai" && supportsAudio;
  const isListening = usesRecorder ? recorder.isRecording : speech.isListening;
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "end" });
  }, [history, isThinking]);
  async function sendQuestion(text: string) {
    const cleanQuestion = text.trim();
    if (!cleanQuestion || isThinking) return;
    speech.stopListening();
    setQuestion("");
    setError("");
    setHistory((current) => [
      ...current,
      { role: "user", text: cleanQuestion },
    ]);
    setIsThinking(true);
    try {
      const reply = await askAssistant({
        question: cleanQuestion,
        context: buildAssistantContext(spaces, movements, spaceId),
        history,
      });
      setHistory((current) => [
        ...current,
        { role: "assistant", text: reply.answer },
      ]);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sin respuesta.");
    } finally {
      setIsThinking(false);
    }
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendQuestion(question);
  }
  return (
    <Dialog title="Tu asistente financiero" onClose={onClose}>
      <div className="chat-log" aria-live="polite">
        {!history.length && (
          <div className="chat-welcome">
            <p>
              Pregúntame por tus ventas, gastos o cómo prepararte para un
              crédito. Respondo con tus propios registros.
            </p>
            <div className="example-chips">
              {suggestedQuestions.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => sendQuestion(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map((turn, index) => (
          <p key={index} className={`chat-bubble ${turn.role}`}>
            {turn.text}
          </p>
        ))}
        {isThinking && (
          <p className="chat-bubble assistant thinking">Pensando…</p>
        )}
        <div ref={listEndRef} />
      </div>
      {(error || recorder.recorderError) && (
        <p className="error" role="alert">
          {error || recorder.recorderError}
        </p>
      )}
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          aria-label="Tu pregunta"
          value={
            speech.isListening && speech.interimText
              ? speech.interimText
              : question
          }
          maxLength={500}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={
            recorder.isRecording
              ? `Grabando ${recorder.seconds}s… toca el micrófono para enviar`
              : isTranscribing
                ? "Entendiendo tu audio…"
                : "Escribe o dicta tu pregunta"
          }
        />
        {(usesRecorder || speech.isSupported) && (
          <button
            type="button"
            className={`icon-button ${isListening ? "listening" : ""}`}
            aria-label={isListening ? "Detener y enviar" : "Dictar pregunta"}
            aria-pressed={isListening}
            disabled={isTranscribing}
            onClick={() => {
              if (usesRecorder)
                return recorder.isRecording
                  ? recorder.stopRecording()
                  : recorder.startRecording();
              return speech.isListening
                ? speech.stopListening()
                : speech.startListening();
            }}
          >
            <Icon name="mic" />
          </button>
        )}
        <button
          className="button primary"
          disabled={!question.trim() || isThinking}
        >
          Enviar
        </button>
      </form>
    </Dialog>
  );
}
