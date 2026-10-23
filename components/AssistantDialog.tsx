"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { askAssistant } from "@/lib/aiService";
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
  const { spaces, movements } = useDemo();
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const listEndRef = useRef<HTMLDivElement>(null);
  const speech = useSpeechRecognition((text) =>
    setQuestion((current) => `${current} ${text}`.trim()),
  );
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
      {error && (
        <p className="error" role="alert">
          {error}
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
          placeholder="Escribe o dicta tu pregunta"
        />
        {speech.isSupported && (
          <button
            type="button"
            className={`icon-button ${speech.isListening ? "listening" : ""}`}
            aria-label={
              speech.isListening ? "Detener dictado" : "Dictar pregunta"
            }
            aria-pressed={speech.isListening}
            onClick={
              speech.isListening ? speech.stopListening : speech.startListening
            }
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
