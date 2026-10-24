import { z } from "zod";
import { checkRateLimit } from "@/lib/server/rateLimit";
import { assistantReplySchema, creditAdviceSchema } from "@/lib/aiSchemas";
import { getDemoAssistantAnswer, getDemoCreditAdvice } from "@/lib/mockData";
import { generateStructured, getAiProvider } from "@/lib/server/aiProvider";
import {
  assistantSystemPrompt,
  creditSystemPrompt,
} from "@/lib/server/prompts";
import type { ChatTurn } from "@/lib/types";

const requestSchema = z.discriminatedUnion("task", [
  z.object({
    task: z.literal("chat"),
    question: z.string().trim().min(1).max(500),
    context: z.string().max(20_000),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          text: z.string().max(1500),
        }),
      )
      .max(10),
  }),
  z.object({
    task: z.literal("credit"),
    context: z.string().max(20_000),
  }),
]);

export async function POST(request: Request) {
  const limited = checkRateLimit(request);
  if (limited) return limited;
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  const input = parsed.data;
  const hasProvider = getAiProvider() !== null;
  try {
    if (input.task === "credit") {
      if (!hasProvider) return Response.json(getDemoCreditAdvice());
      const advice = await generateStructured({
        system: creditSystemPrompt,
        prompt: `Indicadores del negocio (JSON):\n${input.context}`,
        schema: creditAdviceSchema,
      });
      return Response.json({
        mode: "ai",
        summary: advice.summary,
        strengths: advice.strengths.slice(0, 3),
        improvements: advice.improvements.slice(0, 3),
      });
    }
    if (!hasProvider)
      return Response.json({ mode: "demo", answer: getDemoAssistantAnswer() });
    const reply = await generateStructured({
      system: assistantSystemPrompt,
      prompt: `Contexto financiero (JSON):\n${input.context}\n\nConversación previa:\n${formatHistory(input.history)}\n\nPregunta: ${input.question}`,
      schema: assistantReplySchema,
    });
    return Response.json({ mode: "ai", answer: reply.answer });
  } catch (failure) {
    console.error("Asistente IA fallido", failure);
    return Response.json(
      {
        error: "El asistente no está disponible ahora. Intenta en un momento.",
      },
      { status: 502 },
    );
  }
}

function formatHistory(history: ChatTurn[]) {
  if (!history.length) return "(ninguna)";
  return history
    .map(
      (turn) =>
        `${turn.role === "user" ? "Usuario" : "Asistente"}: ${turn.text}`,
    )
    .join("\n");
}
