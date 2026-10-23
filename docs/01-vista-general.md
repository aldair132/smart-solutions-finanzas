# Vista 1 — Resumen general de espacios

Estado: guía de implementación del prototipo. Fecha: 23/10/2026.

## Objetivo y ruta

Ruta /. Permitir entender la situación registrada de los negocios y los gastos personales por separado y elegir dónde trabajar. Es el primer nivel; no lleva las tres pestañas inferiores. En modo demo se puede entrar sin iniciar sesión con datos ficticios. El acceso a datos reales se definirá con autenticación en otra etapa.

## Componentes y distribución

| Orden | Componente | Contenido | Tamaño y posición |
| --- | --- | --- | --- |
| 1 | OverviewHeader | «Hola, Rosa» y periodo «Hoy · 23 oct.» | Arriba, ancho completo, 56–72 px |
| 2 | SpaceList | Título «Mis espacios» y tarjetas de negocios y cuenta personal | Ancho completo; separación 12 px |
| 3 | BusinessCard | Nombre, ventas, gastos, resultado y chevron | 130–150 px por tarjeta; columnas internas iguales |
| 4 | PersonalCard | «Cuenta personal» y gastos | 100–120 px |
| 5 | ConsolidatedSummary | Resultado general y totales del periodo | Fondo menta, 140–160 px |
| 6 | AddBusinessButton | «Agregar negocio» | Ancho completo, mínimo 48 px |

En móvil se apilan las tarjetas. En desktop pueden formar una grilla, conservando el resumen después de la lista. Nombres completos accesibles, sin invadir importes. Las tarjetas enteras son enlaces, sin botones anidados.

## Reglas y navegación

- Tocar un espacio abre /espacios/{id}; el selector y las pestañas aparecerán allí.
- Todas las tarjetas usan el mismo periodo. Primera versión: Hoy; la fecha es informativa, no un filtro decorativo sin respuesta.
- Resultado de negocio = ventas registradas − gastos registrados.
- Resultado general = ingresos externos de todos los espacios − gastos externos de todos los espacios. En el alcance inicial la cuenta personal registra solo gastos: ventas de negocios − gastos de negocios − gastos personales.
- Mostrar «Según tus registros de hoy». No escribir «dinero disponible», «ganancia neta» ni «crédito aprobado».
- Transferir dinero entre espacios propios no reduce el resultado global. No crear dos gastos por la misma transferencia.
- No ofrecer agregar una segunda cuenta personal. Sí permitir varios negocios.

## Agregar negocio en el prototipo

Abrir un diálogo con nombre obligatorio (1–60 caracteres sin contar espacios extremos), botones Cancelar y Crear. Rechazar nombre vacío y avisar si ya existe un nombre igual ignorando mayúsculas. Moneda PEN fija en esta demo. Crear un id estable local, agregar tarjeta con ceros y abrir su Inicio. Cancelar no cambia datos. Indicar que se trata de un negocio de demostración y no se conservará tras recargar.

## Estados

- Sin negocios: conservar Cuenta personal y mostrar «Agrega tu primer negocio».
- Negocio nuevo: ventas, gastos y resultado en cero; no ocultar tarjeta.
- Resultado negativo: signo menos y etiqueta explícita, sin depender del color.
- Carga/error reales son estados futuros; al incorporarlos no sustituir carga por ceros.

## Archivos sugeridos

app/page.tsx; components/overview/OverviewHeader.tsx, SpaceCard.tsx, ConsolidatedSummary.tsx y AddBusinessDialog.tsx. La página compone componentes; el cálculo queda en lib/finance.ts.

## Criterios de aceptación

- Las tres tarjetas iniciales muestran 115, 150 y gastos personales 40; consolidado 225.
- Cambiar movimientos en el estado actualiza tarjetas y consolidado.
- Cada tarjeta abre el espacio correcto y no hay pestañas inferiores en /.
- Agregar/cancelar negocio funciona y valida el nombre.
- Resultado negativo, lista vacía y nombres largos se muestran sin romper el diseño.

## Convenciones compartidas

- Proyecto Next.js con React y TypeScript; rama develop-frontend. Usar app/ en la raíz, tal como existe en el repositorio; no crear otra carpeta src/app en paralelo.
- Alcance actual: frontend con datos simulados. No implementar backend, autenticación real, IA real ni biometría en esta etapa.
- Diseño móvil primero, desde 360 px, sin desplazamiento horizontal; contenedor desktop máximo 1100 px. Padding 16 px en móvil y 24 px en desktop, separación de bloques 24 px.
- Fondo #FAFCFA; superficies menta #E8F5EE; acción principal #166534; texto #173B2A; texto secundario #466354; tarjetas blancas; bordes #D6E7DC. Radios 12–16 px. Tipografía sans serif, cuerpo 16 px y etiquetas 14 px.
- Verificar contraste al implementar, foco visible, etiquetas accesibles y controles táctiles de al menos 44 × 44 px. No comunicar tipos ni errores solo por color.
- La imagen aprobada es referencia visual; estas reglas concretan el comportamiento. Los tamaños son orientativos, no alturas rígidas.
- Moneda demo PEN (S/), zona horaria America/Lima. Fijar el reloj de la demo al 23/10/2026 para reproducir los ejemplos; en producción usar fecha dinámica. Mostrar «Datos de ejemplo».
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

