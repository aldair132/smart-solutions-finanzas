# Vista 2 — Inicio del negocio o cuenta personal

Estado: guía de implementación del prototipo. Fecha: 23/10/2026.

## Objetivo y ruta

Ruta /espacios/[spaceId]. Registrar ventas o gastos rápidamente y comprobar los cinco movimientos más recientes. Un único diseño reutilizable cambia sus etiquetas según el tipo de espacio.

## Componentes y distribución

| Orden | Componente | Contenido | Espacio |
| --- | --- | --- | --- |
| 1 | SpaceHeader | «Mis espacios» y selector con nombre activo | 80–100 px arriba |
| 2 | RegisterActions | «¿Qué quieres registrar?», Venta y Gasto | Dos botones en fila de 64–80 px |
| 3 | CaptureMethods | Voz, Foto, Escribir y ayuda | Fila de 3 opciones, 96–120 px |
| 4 | TodaySummary | Hoy, ventas y gastos | Dos tarjetas, 100–112 px |
| 5 | RecentMovements | Últimos 5 movimientos y Ver todos | Filas de 64–72 px, alto adaptable |
| 6 | BottomTabs | Inicio activo, Movimientos, Perfil | Fija abajo, unos 64 px más safe-area |

Reservar espacio inferior para la barra. En teléfonos cortos permitir desplazarse para leer movimientos; nunca reducir el texto para hacer caber toda la vista.

## Interacción de registro

Propuesta para concretar los botones visibles de la imagen: Venta y Gasto son selectores de tipo, no guardan ni abren una captura por sí solos. Al elegir uno aparece su estado seleccionado. No preseleccionar tipo en negocios para evitar registros equivocados. Texto de ayuda inicial «Elige venta o gasto y luego cómo registrarlo». Si se toca un método antes, indicar que primero se elija el tipo.

Después, Voz, Foto o Escribir abre un panel de captura para el tipo elegido. Mostrar «La IA prepara el registro; tú confirmas» acompañado de «Extracción simulada» en la demo.

1. Elegir tipo.
2. Elegir método.
3. Completar captura.
4. Revisar importe, concepto, fecha y espacio destino.
5. Confirmar o cancelar.
6. Guardado local: actualizar resumen/lista, cerrar panel y mostrar «Venta registrada» o «Gasto registrado».

### Simulación honesta de los métodos

- Voz: botón «Usar audio de ejemplo», transcripción fija y formulario editable. No pedir micrófono ni fingir grabación real en esta etapa.
- Foto: cargar imagen y previsualizar; «Simular extracción» genera una propuesta de ejemplo etiquetada como simulada. No afirmar haber interpretado realmente el archivo.
- Escribir: formulario manual funcional.
- Validar importe mayor que cero con hasta dos decimales, concepto no vacío y fecha válida. Guardar en céntimos. Bloquear doble confirmación. Cancelar no altera datos.
- Detalle visual final de estos paneles se revisará por separado; el flujo anterior permite un prototipo navegable.

## Resumen y lista

Resumen solo de hoy del espacio activo. Lista de últimos cinco movimientos de ese espacio, aunque sean de días anteriores; mostrar fecha además de hora cuando no son de hoy. Orden descendente por occurredAt. Mostrar menos filas si existen menos registros, sin rellenar con datos duplicados. «Ver todos» abre Movimientos. Tocar fila abre detalle y permite corregirla; guardar una edición recalcula todos los resúmenes.

## Variante personal

Mostrar «Cuenta personal», un único botón «Registrar gasto», métodos disponibles directamente, tarjeta «Gastos de hoy» y últimos cinco gastos. No mostrar «Ventas S/ 0» como si fuera un negocio. Registro de ingresos personales queda pendiente de decisión y fuera del prototipo inicial.

## Estados

Sin movimientos: «Aún no registraste movimientos» y mantener acciones. Confirmación exitosa accesible; error conserva formulario. Cambio de espacio con datos sin guardar: solicitar descartar o permanecer. Id inexistente: estado de error y volver al general.

## Archivos sugeridos

app/espacios/[spaceId]/page.tsx; layout.tsx para contexto común; components/home/RegisterActions.tsx, CaptureMethods.tsx, TodaySummary.tsx, RecentMovements.tsx y components/transactions/TransactionDraftDialog.tsx.

## Criterios de aceptación

- Bodega muestra ventas 150 y gastos 35, con cinco filas coherentes.
- Selección de espacio actualiza encabezado, resumen y lista conjuntamente.
- No hay guardado por tocar Venta, Gasto, Voz o Foto.
- Confirmar agrega una fila y recalcula; cancelar no cambia nada.
- Cuenta personal solo presenta registro y resumen de gastos.
- Los cinco movimientos se ordenan por fecha; la barra no tapa el último.

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

