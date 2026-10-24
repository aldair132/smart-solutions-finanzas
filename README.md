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
| `/` | Video guía de 1 minuto (`public/video/`), guía de bienvenida de 2 minutos (abre directamente la voz, la foto o el perfil) y resumen de espacios. |
| `/espacios/[id]` | Registro por **Voz** (se graba el audio y Gemini lo transcribe y ordena en una sola llamada; funciona en cualquier navegador), **Foto** (hasta 6 boletas, tickets, capturas de Yape o páginas de cuaderno a la vez, leídas en una sola llamada; detecta comprobantes repetidos y guarda cada movimiento con la fecha de su boleta) o **Escribir**. La IA propone borradores editables; nada se guarda sin confirmar. |
| `/espacios/[id]/movimientos` | Historial por periodo, edición y PDF. |
| `/espacios/[id]/analisis` | Indicadores del mes (ventas vs. mes pasado, gastos, ganancia y margen, venta promedio, fiados), proyección de cierre de mes y de los próximos 30 días, gráficos de ventas y gastos por semana, gastos por categoría y venta promedio por día, con tabla de datos y conclusiones automáticas. |
| `/espacios/[id]/credito` | Perfil para crédito de 90 días: ventas y resultado promedio, margen, constancia, estabilidad, tendencia, comprobantes y cuota referencial; puntaje de preparación 0–100, explicación con IA y **reporte PDF** para la entidad. |
| `/espacios/[id]/fiados` | Ventas al crédito: quién debe, cuánto y desde cuándo; cobros totales o parciales. Por voz: «Le fié 15 a doña Carmen», «Don Julio me pagó 10». Un fiado no suma a ventas hasta que se cobra. |
| `/espacios/[id]/perfil` | Perfil, configuración y salida de la demo. |
| Botón «Pregúntale a Smart» | **Modo conversación por voz**: tocas una vez, hablas, la app detecta la pausa, responde con voz neuronal y vuelve a escucharte (puedes interrumpirla). También acepta preguntas escritas. Responde con los registros del usuario. |

Datos de ejemplo: 90 días de historial generados de forma determinista (`lib/mockHistory.ts`) más los movimientos del 23/10/2026. Los cambios se guardan en `localStorage` del dispositivo; «Salir de la demo» los borra.

## Arquitectura

- `app/api/ai/extract` — voz (audio WAV o texto) o imagen → `ExtractionResult` validado con zod. Importes inciertos llegan como `null`.
- `app/api/ai/assistant` — chat (`task: "chat"`) y lectura del perfil (`task: "credit"`).
- `app/api/ai/speak` — voz neuronal de Gemini (WAV) para las respuestas habladas; 30 llamadas/min por IP.
- `app/api/ai/status` — indica si hay proveedor configurado y si acepta audio.
- `lib/server/aiProvider.ts` — salida estructurada con Gemini (REST; por defecto `gemini-flash-lite-latest` con razonamiento mínimo, 1–3 s, y `gemini-flash-latest` de respaldo si está saturado) o Claude (SDK oficial). Las claves solo existen en servidor.
- `lib/server/rateLimit.ts` — 12 llamadas de IA por minuto por IP (`AI_RATE_LIMIT_PER_MINUTE`), para que una URL pública no agote la cuota gratuita.
- `lib/receivables.ts` — saldos, resumen y búsqueda de fiados por nombre hablado («doña Carmen» ≈ «Sra. Carmen»).
- `hooks/useNaturalVoice.ts` — reproduce la voz neuronal (primera frase y resto en paralelo) y usa la voz del navegador si falla.
- `hooks/useAudioRecorder.ts` — en modo conversación detecta cuándo dejas de hablar (energía vs. ruido de fondo) y corta solo.
- `lib/analytics.ts` + `components/Charts.tsx` — indicadores y gráficos SVG sin librerías (paleta azul/naranja validada para daltonismo).
- `lib/server/receiptRules.ts` — en comprobantes, venta o compra lo decide el emisor (regla fija con tolerancia a errores de lectura), no el modelo.
- `lib/creditProfile.ts` — indicadores y puntaje, funciones puras y explicables (la IA explica, no calcula).
- `lib/aiService.ts` — cliente de las rutas y compresión de fotos (máx. 1280 px).
- `hooks/useAudioRecorder.ts` + `lib/audioEncoding.ts` — graba con MediaRecorder y convierte a WAV mono 16 kHz (máx. 60 s).
- `hooks/useSpeechRecognition.ts` — dictado del navegador, solo como respaldo cuando el proveedor es Claude (no acepta audio).

## Reportes PDF

| Reporte | Dónde | Para quién | Contenido |
| --- | --- | --- | --- |
| Detalle de movimientos | Movimientos | El emprendedor (control interno) | Totales del periodo y cada registro con fecha, concepto, categoría, tipo e importe. |
| Reporte para crédito | Crédito | La caja o cooperativa | Puntaje de preparación, 8 indicadores, gráfico de 3 meses, cálculo del puntaje, lectura de la IA y declaración para firmar. |

## Voz: costos y límites

- Pregunta por audio → respuesta en **una sola llamada** a Gemini (~3–4 s).
- Mientras piensa suena una frase pregrabada (`public/voz/`, sin costo) y la respuesta se sintetiza en una sola llamada.
- **Costo cero**: nivel gratuito de Gemini sin facturación (no hay cobros posibles), voz del navegador como respaldo y Vercel Hobby. La voz neuronal gratuita permite ~10 usos diarios por modelo; se rota entre `gemini-3.8-flash-lite-tts` y `gemini-3.8-flash-tts` (~20 respuestas habladas al día). Al agotarse, la app cambia sola a la mejor voz del navegador. `GEMINI_TTS_ENABLED=false` guarda la cuota mientras se prueba.

## Integraciones que siguen simuladas

- Autenticación, base de datos y API del backend (`TODO(BACKEND)` en `lib/demoService.ts` y `lib/aiService.ts`).
- Compartir el reporte con una entidad (hoy solo se descarga, con consentimiento implícito del usuario).
- El puntaje es un indicador de preparación propio, no una evaluación crediticia.
