type Window = { startedAt: number; count: number };

const windowMs = 60_000;
// Gemini gratuito admite ~15 llamadas/min por proyecto; 12 por IP deja margen a varios jurados.
const maxRequestsPerWindow = Number(process.env.AI_RATE_LIMIT_PER_MINUTE ?? 12);
const windows = new Map<string, Window>();

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

// Límite en memoria por instancia del servidor: suficiente para una demo pública.
// TODO(BACKEND): en producción usar un almacén compartido (Redis/Upstash) y límites por usuario autenticado.
export function checkRateLimit(request: Request): Response | null {
  const key = getClientKey(request);
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.startedAt > windowMs) {
    windows.set(key, { startedAt: now, count: 1 });
    return null;
  }
  current.count += 1;
  if (current.count <= maxRequestsPerWindow) return null;
  const retryAfterSeconds = Math.ceil(
    (current.startedAt + windowMs - now) / 1000,
  );
  return Response.json(
    {
      error: `Demasiadas solicitudes seguidas. Espera ${retryAfterSeconds} segundos e intenta otra vez.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
