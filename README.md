# Smart Solutions · Finanzas por voz e imagen

Asistente de IA que digitaliza por **voz** y **foto** las ventas y gastos de pequeños negocios informales, los ordena por espacio y los convierte en un **perfil para crédito** que el emprendedor puede presentar a una caja, cooperativa o microfinanciera.

## Ejecutar

```bash
npm install
cp .env.example .env.local   # opcional: agrega GEMINI_API_KEY o ANTHROPIC_API_KEY
npm run dev
```

Abrir http://localhost:3000. Verificaciones: `npm run lint` y `npm run build` (incluye TypeScript).

Sin clave de IA la app funciona en **modo demostración**: las extracciones y respuestas son ejemplos fijos y la interfaz lo indica («IA en modo demostración»).

## Desplegar en Vercel

1. Importar el repositorio en Vercel (framework Next.js, sin cambios de configuración).
2. En *Settings → Environment Variables* agregar `GEMINI_API_KEY` (gratis en https://aistudio.google.com/apikey) o `ANTHROPIC_API_KEY`.
3. Redesplegar. En Inicio la etiqueta debe decir «IA activa».

Usar un nombre de proyecto neutro: la URL no debe incluir nombres de personas, universidades ni países.

## Qué hace

| Ruta | Función |
| --- | --- |
| `/` | Resumen de espacios (negocios y cuenta personal). |
| `/espacios/[id]` | Registro por **Voz** (se graba el audio y Gemini lo transcribe y ordena en una sola llamada; funciona en cualquier navegador), **Foto** (boleta, ticket o página de cuaderno) o **Escribir**. La IA propone borradores editables; nada se guarda sin confirmar. |
| `/espacios/[id]/movimientos` | Historial por periodo, edición y PDF. |
| `/espacios/[id]/credito` | Perfil para crédito de 90 días: ventas y resultado promedio, margen, constancia, estabilidad, tendencia, comprobantes y cuota referencial; puntaje de preparación 0–100, explicación con IA y **reporte PDF** para la entidad. |
| `/espacios/[id]/perfil` | Perfil, configuración y salida de la demo. |
| Botón «Pregúntale a Smart» | Chat financiero (texto o voz) que responde con los registros del usuario. |

Datos de ejemplo: 90 días de historial generados de forma determinista (`lib/mockHistory.ts`) más los movimientos del 23/10/2026. Los cambios se guardan en `localStorage` del dispositivo; «Salir de la demo» los borra.

## Arquitectura

- `app/api/ai/extract` — voz (audio WAV o texto) o imagen → `ExtractionResult` validado con zod. Importes inciertos llegan como `null`.
- `app/api/ai/assistant` — chat (`task: "chat"`) y lectura del perfil (`task: "credit"`).
- `app/api/ai/transcribe` — audio → texto para dictar preguntas al asistente.
- `app/api/ai/status` — indica si hay proveedor configurado y si acepta audio.
- `lib/server/aiProvider.ts` — salida estructurada con Gemini (REST; por defecto `gemini-flash-lite-latest` con razonamiento mínimo, 1–3 s, y `gemini-flash-latest` de respaldo si está saturado) o Claude (SDK oficial). Las claves solo existen en servidor.
- `lib/creditProfile.ts` — indicadores y puntaje, funciones puras y explicables (la IA explica, no calcula).
- `lib/aiService.ts` — cliente de las rutas y compresión de fotos (máx. 1280 px).
- `hooks/useAudioRecorder.ts` + `lib/audioEncoding.ts` — graba con MediaRecorder y convierte a WAV mono 16 kHz (máx. 60 s).
- `hooks/useSpeechRecognition.ts` — dictado del navegador, solo como respaldo cuando el proveedor es Claude (no acepta audio).

## Integraciones que siguen simuladas

- Autenticación, base de datos y API del backend (`TODO(BACKEND)` en `lib/demoService.ts` y `lib/aiService.ts`).
- Compartir el reporte con una entidad (hoy solo se descarga, con consentimiento implícito del usuario).
- El puntaje es un indicador de preparación propio, no una evaluación crediticia.
