import { connection } from "next/server";
import { getAiProvider } from "@/lib/server/aiProvider";

export async function GET() {
  // Se evalúa en cada petición para reflejar la clave configurada en el servidor.
  await connection();
  return Response.json({ provider: getAiProvider() });
}
