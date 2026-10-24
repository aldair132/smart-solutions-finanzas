"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useNaturalVoice } from "@/hooks/useNaturalVoice";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { askAssistant } from "@/lib/aiService";
import { buildAssistantContext } from "@/lib/assistantContext";
import type { ChatTurn } from "@/lib/types";
import { useDemo } from "./DemoProvider";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

type WavAudio = { mediaType: "audio/wav"; data: string };
type ConversationPhase =
  "idle" | "listening" | "thinking" | "preparing" | "speaking";

const suggestedQuestions = [
  "¿Cuánto gané esta semana?",
  "¿En qué estoy gastando más este mes?",
  "¿Cómo mejoro mi perfil para un crédito?",
  "¿Quién me debe fiado y cuánto?",
];
const phaseCaptions: Record<ConversationPhase, string> = {
  idle: "Toca y conversa conmigo",
  listening: "Te escucho… habla y haz una pausa",
  thinking: "Pensando…",
  preparing: "Preparando mi respuesta…",
  speaking: "Hablando · toca para interrumpirme",
};
const voiceReplyStorageKey = "smart-solutions-voice-replies";

function readVoiceReplyPreference() {
  try {
    return window.localStorage.getItem(voiceReplyStorageKey) !== "off";
  } catch {
    return true;
  }
}

export function AssistantDialog({
  spaceId,
  onClose,
}: {
  spaceId: string;
  onClose: () => void;
}) {
  const { spaces, movements, receivables, aiMode, supportsAudio, neuralVoice } =
    useDemo();
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [isVoiceReplyOn, setIsVoiceReplyOn] = useState(true);
  const [isConversing, setIsConversing] = useState(false);
  const isConversingRef = useRef(false);
  const listEndRef = useRef<HTMLDivElement>(null);
  // Conversación por voz solo con Gemini (entiende audio); si no, dictado del navegador.
  const canConverse = aiMode === "ai" && supportsAudio;
  const voice = useNaturalVoice({ useNeural: neuralVoice });
  const speech = useSpeechRecognition((text) =>
    setQuestion((current) => `${current} ${text}`.trim()),
  );
  const recorder = useAudioRecorder((audio) => askQuestion({ audio }));
  const phase: ConversationPhase = recorder.isRecording
    ? "listening"
    : isThinking
      ? "thinking"
      : voice.status === "loading"
        ? "preparing"
        : voice.status === "speaking"
          ? "speaking"
          : "idle";
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "end" });
  }, [history, isThinking]);
  useEffect(() => {
    const preference = readVoiceReplyPreference();
    queueMicrotask(() => setIsVoiceReplyOn(preference));
  }, []);
  function toggleVoiceReply() {
    const nextValue = !isVoiceReplyOn;
    setIsVoiceReplyOn(nextValue);
    if (!nextValue) voice.stop();
    try {
      window.localStorage.setItem(
        voiceReplyStorageKey,
        nextValue ? "on" : "off",
      );
    } catch {
      // La preferencia solo dura esta sesión.
    }
  }
  function listenAgain() {
    recorder.startRecording({
      autoStopOnSilence: true,
      onNoSpeech: () => {
        endConversation();
        setError("No te escuché. Toca el círculo cuando quieras seguir.");
      },
    });
  }
  function startConversation() {
    isConversingRef.current = true;
    setIsConversing(true);
    setError("");
    voice.stop();
    listenAgain();
  }
  function endConversation() {
    isConversingRef.current = false;
    setIsConversing(false);
    recorder.cancelRecording();
    voice.stop();
  }
  function handleOrbClick() {
    if (!isConversing) return startConversation();
    if (phase === "listening") return recorder.stopRecording();
    if (phase === "speaking" || phase === "preparing") {
      // Interrumpir: deja de hablar y vuelve a escuchar de inmediato.
      voice.stop();
      return listenAgain();
    }
  }
  async function askQuestion(input: { question?: string; audio?: WavAudio }) {
    const typedQuestion = input.question?.trim();
    const shouldSpeak = isConversingRef.current || isVoiceReplyOn;
    if (isThinking || (!typedQuestion && !input.audio)) return;
    speech.stopListening();
    voice.stop();
    setQuestion("");
    setError("");
    if (typedQuestion)
      setHistory((current) => [
        ...current,
        { role: "user", text: typedQuestion },
      ]);
    setIsThinking(true);
    // Respuesta inmediata ("A ver, déjame revisar…") mientras la IA piensa.
    if (shouldSpeak) voice.playFiller();
    try {
      const reply = await askAssistant({
        question: typedQuestion,
        audio: input.audio,
        spoken: shouldSpeak,
        context: buildAssistantContext(spaces, movements, receivables, spaceId),
        history,
      });
      setHistory((current) => [
        ...current,
        ...(input.audio
          ? [{ role: "user" as const, text: reply.question || "(audio)" }]
          : []),
        { role: "assistant", text: reply.answer, followUps: reply.followUps },
      ]);
      if (shouldSpeak)
        voice.speak(reply.answer, {
          onEnd: () => {
            if (isConversingRef.current) listenAgain();
          },
        });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sin respuesta.");
      endConversation();
    } finally {
      setIsThinking(false);
    }
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askQuestion({ question });
  }
  return (
    <Dialog
      size="large"
      title="Tu asistente financiero"
      onClose={() => {
        endConversation();
        onClose();
      }}
    >
      {canConverse && (
        <section className={`voice-orb-panel ${phase}`} aria-live="polite">
          <button
            type="button"
            className="voice-orb"
            aria-label={
              isConversing ? phaseCaptions[phase] : "Conversar por voz"
            }
            disabled={phase === "thinking"}
            onClick={handleOrbClick}
            style={{ "--level": recorder.level } as CSSProperties}
          >
            <Icon name={phase === "speaking" ? "speaker" : "mic"} />
          </button>
          <p className="voice-orb-caption">
            {isConversing ? phaseCaptions[phase] : phaseCaptions.idle}
          </p>
          {isConversing && (
            <button
              type="button"
              className="text-button"
              onClick={endConversation}
            >
              Terminar conversación
            </button>
          )}
        </section>
      )}
      <div className="chat-log">
        {!history.length && (
          <div className="chat-welcome">
            <p>
              {canConverse
                ? "Pregúntame en voz alta como si conversaras con una amiga, o toca una pregunta:"
                : "Pregúntame por tus ventas, gastos o cómo prepararte para un crédito:"}
            </p>
            <div className="example-chips">
              {suggestedQuestions.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => askQuestion({ question: item })}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map((turn, index) => (
          <div key={index} className={`chat-bubble ${turn.role}`}>
            <p>{turn.text}</p>
            {turn.role === "assistant" && (
              <button
                type="button"
                className="listen-button"
                onClick={() =>
                  voice.speakingText === turn.text
                    ? voice.stop()
                    : voice.speak(turn.text)
                }
              >
                <Icon name="speaker" />
                {voice.speakingText === turn.text ? "Detener" : "Escuchar"}
              </button>
            )}
            {turn.role === "assistant" &&
              index === history.length - 1 &&
              turn.followUps &&
              turn.followUps.length > 0 && (
                <div className="follow-ups" aria-label="Preguntas sugeridas">
                  {turn.followUps.map((followUp) => (
                    <button
                      type="button"
                      key={followUp}
                      disabled={isThinking}
                      onClick={() => askQuestion({ question: followUp })}
                    >
                      {followUp}
                    </button>
                  ))}
                </div>
              )}
          </div>
        ))}
        {isThinking && (
          <p className="chat-bubble assistant thinking">
            <span className="typing-dots" aria-label="Pensando">
              <i />
              <i />
              <i />
            </span>
          </p>
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
          placeholder="O escribe tu pregunta"
        />
        {!canConverse && speech.isSupported && (
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
      <button
        type="button"
        className={`voice-toggle ${isVoiceReplyOn ? "on" : ""}`}
        aria-pressed={isVoiceReplyOn}
        onClick={toggleVoiceReply}
      >
        <Icon name="speaker" />
        {isVoiceReplyOn
          ? "Leo en voz alta las respuestas escritas"
          : "Respuestas escritas sin voz"}
      </button>
    </Dialog>
  );
}
