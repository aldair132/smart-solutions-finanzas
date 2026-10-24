# Vista 3 — Historial y exportación de movimientos

Estado: guía de implementación del prototipo. Fecha: 23/10/2026.

Actualización del filtro mensual: Movimientos usa la fecha actual en America/Lima.
«Elegir mes» ofrece el mes actual y los dos anteriores, con año incluido.
El mes actual termina al finalizar hoy; los anteriores incluyen el mes completo.
La selección se conserva en `?period=month&month=YYYY-MM`, también al cambiar
de espacio. Un mes inválido o fuera de los tres disponibles usa el mes actual.
Hoy, 7 días, lista, totales y PDF de esta vista comparten estos límites dinámicos.
Todas las vistas comparten ahora el calendario dinámico descrito en docs/06-calendario-demo.md.

## Objetivo y ruta

Ruta /espacios/[spaceId]/movimientos. Consultar todos los movimientos del espacio activo dentro de un periodo y descargar un registro PDF coherente con el filtro.

## Componentes y distribución

| Orden | Componente | Contenido | Espacio |
| --- | --- | --- | --- |
| 1 | SpaceHeader | Volver a Mis espacios y selector | 80–100 px |
| 2 | Encabezado de sección | «Movimientos» | 32–40 px |
| 3 | PeriodFilter | Hoy, 7 días, Este mes | 3 chips, mínimo 44 px |
| 4 | ExportPdfButton | «Descargar informe PDF» | Ancho completo, 48 px |
| 5 | TransactionList | Fechas y todos los registros filtrados | Filas de 64–72 px; desplazamiento vertical |
| 6 | PeriodTotals | Ventas y gastos del filtro | 80–100 px |
| 7 | BottomTabs | Movimientos activo | Fija abajo, 64 px más safe-area |

## Filtros exactos

- Hoy: desde las 00:00 de hoy hasta las 00:00 del día siguiente, fin excluido.
- 7 días: hoy y los seis días anteriores, no semana calendario.
- Este mes: desde el primer día del mes hasta el final de hoy, no últimos 30 días.
- Usar el calendario local del negocio (demo America/Lima), no el del servidor.
- Filtro inicial Hoy. Guardarlo en ?period=today|7d|month permite volver y compartir la ruta de la demo. Valor inválido vuelve a today.
- Al cambiar de espacio conservar periodo, recalcular lista y totales. El periodo debe verse en el PDF y pantalla.

## Lista, detalle y corrección

Ordenar de reciente a antiguo y agrupar por fecha. Cada fila muestra concepto, tipo, hora e importe con signo. Usar las mismas filas del Inicio. Aquí se muestran TODOS los movimientos filtrados, sin límite de cinco. En una demo pequeña basta scroll; no diseñar paginación decorativa.

Al tocar una fila abrir un diálogo con concepto, tipo, importe, fecha, espacio y categoría si existe. «Editar» habilita campos; Guardar valida y actualiza el estado compartido. Cancelar conserva el original. Si se permite eliminar, pedir confirmación explícita e indicar que afecta a los totales. No ofrecer cambiar de espacio al editar en este primer alcance.

## Informe PDF

Implementación frontend: generar un PDF real desde la colección filtrada usando una biblioteca compatible seleccionada al implementar; no pedir backend. Botón muestra «Generando…» mientras trabaja y evita doble descarga.

Contenido obligatorio: nombre del espacio, moneda, rango exacto, fecha de generación, tabla (fecha/hora, concepto, tipo, importe), totales y resultado registrado. En personal mostrar gastos y omitir ventas. Pie «Datos de ejemplo · Registro informativo». Repetir encabezados si hay varias páginas y evitar cortar filas. Nombre propuesto movimientos-{spaceId}-{fecha-inicio}-{fecha-fin}.pdf.

No mezclar espacios en el PDF, exportar únicamente lo filtrado, excluir transferencias de los totales operativos. No llamarlo certificado financiero ni informe que garantice crédito. Si falla, conservar filtro/lista y ofrecer reintentar.

## Estados

- Sin resultados: «No hay movimientos en este periodo», totales cero y descarga deshabilitada con explicación.
- Muchos resultados: lista completa desplazable, con barra inferior sin solaparse.
- Cuenta personal: gastos personales, mismas opciones de periodo y PDF.
- Carga y error de red reservados a la integración futura, sin simular éxito remoto.

## Archivos sugeridos

app/espacios/[spaceId]/movimientos/page.tsx; components/movements/PeriodFilter.tsx, TransactionList.tsx, TransactionDetailDialog.tsx, ExportPdfButton.tsx; lib/date-ranges.ts y lib/export-movements-pdf.ts.

## Criterios de aceptación

- Hoy muestra cinco registros de bodega, ventas 150 y gastos 35.
- Prueba manual con datos temporales de ayer, hace siete días y fin de mes verifica límites; no modificar el conjunto demo base permanentemente.
- Cambiar filtro actualiza lista, totales y contenido exportado con la misma selección.
- PDF abre correctamente, contiene el espacio correcto y mantiene tabla legible en varias páginas.
- Editar o eliminar recalcula Inicio y vista general.
- Sin resultados se explica la situación y no se descarga un informe vacío accidentalmente.

## Convenciones compartidas

- Proyecto Next.js con React y TypeScript; rama develop-frontend. Usar app/ en la raíz, tal como existe en el repositorio; no crear otra carpeta src/app en paralelo.
- Alcance actual: frontend con datos simulados. No implementar backend, autenticación real, IA real ni biometría en esta etapa.
- Diseño móvil primero, desde 360 px, sin desplazamiento horizontal; contenedor desktop máximo 1100 px. Padding 16 px en móvil y 24 px en desktop, separación de bloques 24 px.
- Fondo #FAFCFA; superficies menta #E8F5EE; acción principal #166534; texto #173B2A; texto secundario #466354; tarjetas blancas; bordes #D6E7DC. Radios 12–16 px. Tipografía sans serif, cuerpo 16 px y etiquetas 14 px.
- Verificar contraste al implementar, foco visible, etiquetas accesibles y controles táctiles de al menos 44 × 44 px. No comunicar tipos ni errores solo por color.
- La imagen aprobada es referencia visual; estas reglas concretan el comportamiento. Los tamaños son orientativos, no alturas rígidas.
- Moneda demo PEN (S/), zona horaria America/Lima. Usar la fecha actual de Lima en etiquetas, registros, validaciones, cálculos y PDF. El 23/10/2026 es únicamente el ancla de los fixtures; consultar docs/06-calendario-demo.md. Mostrar «Datos de ejemplo».
- Una sola fuente de datos: lib/mock-data.ts; tipos en lib/types.ts; cálculos en lib/finance.ts; formato en lib/format.ts. Un proveedor de estado cliente compartido permite reflejar cambios en todas las vistas. Los datos en memoria se reinician al recargar; no simular persistencia remota.
- Modelo mínimo Space: id, name, type (business | personal), currency. Movement: id, spaceId, kind (income | expense | transfer), amountMinor, description, occurredAt (ISO con zona), category opcional. Importes positivos en céntimos enteros; el tipo determina el signo. Las transferencias requieren vinculación entre origen y destino si se implementan.
- Filtrar por spaceId antes de calcular totales. Las transferencias internas no cuentan como ventas, ingresos ni gastos. No sumar monedas diferentes. El resultado registrado no es utilidad contable ni saldo disponible.
- Rutas propuestas: / (vista general), /espacios/[spaceId] (Inicio), /espacios/[spaceId]/movimientos, /espacios/[spaceId]/perfil. El perfil pertenece al usuario; la ruta conserva el contexto del espacio para volver mediante las pestañas.
- Componentes compartidos: SpaceSelector, BottomTabs, MoneyAmount, EmptyState. El selector ofrece negocios, cuenta personal y «Ver todos mis espacios» hacia /. Al cambiar de espacio conserva la pestaña actual y nunca mezcla movimientos.
- Barra inferior con Inicio, Movimientos y Perfil solo dentro de un espacio; fija con padding inferior y safe-area para no tapar contenido. En desktop mantener las mismas tres opciones visibles, sin introducir otra jerarquía.
- Para rutas con un espacio inexistente, mostrar «No encontramos este espacio» y volver a /. No usar silenciosamente otro negocio.

## Datos de ejemplo compartidos

Todos los movimientos corresponden al 23/10/2026; no hay otros movimientos en el conjunto inicial.

| Espacio | Concepto | Tipo | Hora local | Importe |
| --- | --- | --- | --- | --- |
| bodega | Abarrotes | income | 10:30 | S/ 90.00 |
| bodega | Bolsas | expense | 09:45 | S/ 20.00 |
| bodega | Bebidas | income | 09:10 | S/ 40.00 |
| bodega | Limpieza | expense | 08:50 | S/ 15.00 |
| bodega | Pan | income | 08:15 | S/ 20.00 |
| comida | Venta de almuerzos | income | 12:00 | S/ 250.00 |
| comida | Insumos | expense | 07:30 | S/ 100.00 |
| personal | Transporte | expense | 08:00 | S/ 40.00 |

Espacios: bodega = Bodega Doña Rosa; comida = Puesto de comida; personal = Cuenta personal. Usuario ficticio: Rosa Martínez. Bodega: ventas 150, gastos 35, resultado 115. Comida: ventas 250, gastos 100, resultado 150. Personal: gastos 40. Consolidado: ingresos 400, gastos 175, resultado 225 soles.

