# Crédito sin historial y conteo de fiados

- Un negocio tiene historial reciente si existe al menos un movimiento de venta o gasto dentro de los últimos 90 días, incluyendo hoy. Las transferencias y las fechas futuras o antiguas quedan fuera.
- Sin historial, Crédito muestra un mensaje y accesos para registrar o consultar movimientos. No muestra un puntaje, una cuota, recomendaciones ni el botón de PDF.
- El cálculo devuelve `hasHistory: false` y todos los factores en cero para que otros consumidores no asignen puntos sin registros. El contexto del asistente comunica que no hay historial y envía puntaje y cuota como null.
- El generador de PDF rechaza perfiles sin historial antes de crear un documento.
- El factor Tendencia solo asigna puntos si hay ventas en el periodo anterior de 30 días. Si no existen, se indica que falta comparación; el PDF y el contexto de recomendaciones tampoco presentan un crecimiento de 0 % como medido.
- La antigüedad de un negocio sin registros es cero días.
- Inicio, Fiados y Análisis muestran «1 fiado pendiente» o «N fiados pendientes». El número cuenta deudas, no clientes únicos.

Los cálculos y el estado continúan siendo locales. No se añade una evaluación crediticia real ni una integración con entidades financieras.
