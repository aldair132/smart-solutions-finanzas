# Calendario compartido de la demostración

Actualización: 24/10/2026. Sustituye las referencias anteriores al reloj fijo.

- La zona del negocio es America/Lima (UTC-05:00), independientemente del dispositivo o servidor.
- `lib/businessDate.ts` calcula día, fecha y hora al invocarse; no fija el reloj al importar un módulo ni durante el build.
- `useCurrentDay` actualiza el calendario a medianoche y al recuperar foco o visibilidad. El proveedor compartido provoca la actualización de las vistas.
- Hoy, últimos 7 días y meses usan los límites de `movementPeriods.ts`. Hoy incluye todo el día calendario; los meses anteriores son completos.
- Los formularios comienzan con fecha y hora actuales de Lima. Las capturas aceptan hoy y fechas anteriores, rechazan días inexistentes o posteriores a hoy. El mensaje de extracción de IA usa el mismo calendario.
- Análisis excluye días futuros. Crédito y su PDF conservan `asOfDate`, el día con el que se calculó el reporte.

## Datos de ejemplo y persistencia

- Los fixtures conservan un ancla estática (`fixtureDate`) para generar un historial reproducible.
- Una demo nueva desplaza sus ejemplos e historial hasta el día de apertura y guarda `demoSeedDate`.
- Una demo ya guardada conserva sus fechas al volver a abrirse otro día. No se convierten ventas de ayer en ventas de hoy.
- Para estados antiguos sin `demoSeedDate`, una migración única adapta solo filas idénticas a los fixtures originales. Los movimientos y fiados creados o editados por el usuario se conservan con sus fechas.
- Reiniciar la demo genera nuevamente los ejemplos respecto del día actual.

La persistencia continúa en localStorage. El cambio de calendario no agrega servicios, autenticación ni base de datos.
