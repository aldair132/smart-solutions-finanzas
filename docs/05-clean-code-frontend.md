# Reglas de Clean Code para el frontend

Proyecto: asistente financiero. Fecha: 23/10/2026.
Ámbito: React, Next.js y TypeScript; rama develop-frontend. Datos e IA simulados durante esta etapa. Estas reglas complementan los cuatro documentos de vistas; este documento define las convenciones de código.

## 1. Objetivo

Escribir código corto, claro y fácil de conectar al backend sin rehacer las pantallas. Priorizar comprensión sobre cantidad mínima de líneas. No comprimir varias instrucciones en una línea, crear abstracciones innecesarias ni comentar lo evidente.

## 2. Dónde colocar estas instrucciones

Guardar este documento en docs/05-clean-code-frontend.md. Agregar el siguiente bloque al AGENTS.md existente en la raíz del repositorio, conservando sus instrucciones actuales:

```md
## Reglas del frontend

Antes de crear o modificar código frontend:
- Lee docs/05-clean-code-frontend.md y el documento de la vista afectada:
  - docs/01-vista-general.md
  - docs/02-inicio-del-espacio.md
  - docs/03-movimientos.md
  - docs/04-perfil.md
- Mantén datos simulados y lógica de integración fuera de los componentes visuales.
- Marca cada punto de sustitución con TODO(BACKEND) o TODO(IA), inmediatamente antes de la línea que cambiará, indicando entradas, campos de salida y comportamiento esperado.
- Usa camelCase para variables y funciones; PascalCase para componentes React y tipos.
- Declara las variables al inicio de su función o bloque, respetando dependencias, validaciones y reglas de Hooks.
- Usa nombres representativos, funciones pequeñas y reutilización cuando exista una necesidad real.
- No conectes servicios reales ni modifiques backend en esta etapa salvo instrucción explícita.
- Revisa los scripts existentes en package.json y ejecuta las verificaciones pertinentes disponibles. No inventes comandos ni afirmes haber ejecutado pruebas que no ejecutaste.
- Al terminar, indica qué cambió, cómo se verificó y qué integraciones siguen simuladas.
```

AGENTS.md es el archivo de instrucciones de proyecto reconocido por Codex. Un Markdown cualquiera en docs no debe considerarse leído automáticamente: por eso se referencia explícitamente. En una sesión ya abierta, pedir que vuelva a leerlo después de actualizarlo. No es necesario crear una skill para estas reglas.

Referencia oficial: https://learn.chatgpt.com/docs/agent-configuration/agents-md

## 3. Convención de nombres

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Variables y propiedades | camelCase | selectedSpaceId, totalExpensesMinor |
| Funciones y métodos | camelCase, verbo y objeto | getSpaceMovements, calculateSpaceTotals |
| Booleanos | camelCase con is, has o can | isLoading, hasMovements, canExport |
| Eventos | camelCase con handle | handleSaveMovement |
| Hooks propios | camelCase con use | useSpaceMovements |
| Componentes React | PascalCase | SpaceSelector, MovementList |
| Tipos e interfaces | PascalCase | Movement, Space, MovementDraft |
| Constantes del proyecto | camelCase | recentMovementsLimit, demoDate |
| Archivos de servicio/utilidad | camelCase | movementService.ts, mockData.ts |
| Archivos de componentes | PascalCase | SpaceSelector.tsx |

Excepciones: nombres exigidos por Next.js y herramientas (page.tsx, layout.tsx, AGENTS.md), rutas y documentos ya acordados. No renombrarlos por aplicar camelCase indiscriminadamente. Componentes React deben comenzar con mayúscula al usarse en JSX.

Código en inglés para mantener consistencia con los modelos existentes; comentarios y textos de interfaz en español. Evitar data, temp, obj, aux o nombres como datosBaseDatos cuando se conoce el dominio: usar movements, spaces o currentUser. Los nombres deben describir el contenido y no su origen temporal.

Los documentos anteriores sugerían mock-data.ts y date-ranges.ts: antes de implementarlos adoptar mockData.ts y dateRanges.ts. Si ya existen, actualizar importaciones al renombrar, sin crear duplicados.

## 4. Organización mínima

```text
app/                       # Rutas y composición de pantallas
components/                # Componentes visuales por funcionalidad
hooks/                     # Estado y operaciones reutilizadas, solo si hacen falta
lib/
  types.ts                 # Contratos del frontend
  mockData.ts              # Datos ficticios iniciales
  mockStore.ts             # Estado demo mutable y operaciones locales
  services/
    spaceService.ts
    movementService.ts
    userService.ts
    aiService.ts
  finance.ts               # Cálculos puros
  format.ts                # Formato monetario y fechas
  dateRanges.ts            # Periodos de consulta
```

Crear solo los archivos necesarios para la tarea. No generar carpetas vacías, interfaces genéricas, clases base o múltiples capas para una operación simple. El servicio es el punto de sustitución; el componente recibe los datos y muestra la interfaz.

No consultar la base de datos directamente desde el navegador. En la futura integración, el frontend consumirá la API del compañero. La API consultará la base de datos y, cuando corresponda, al proveedor de IA. Las claves privadas permanecen en servidor.

## 5. Regla obligatoria para datos hardcodeados

Los datos de negocio (usuarios, espacios, movimientos y resultados simulados de IA) se definen en mockData.ts, no dentro del JSX. Los textos de interfaz y tokens de diseño pueden ser constantes locales o compartidas; no necesitan un TODO de backend.

Cada operación de lectura o escritura simulada tendrá un comentario inmediatamente encima de la línea concreta que será reemplazada. El comentario debe indicar:

1. Marcador TODO(BACKEND) o TODO(IA).
2. Qué llamada real sustituirá esa línea; si aún no hay endpoint acordado, indicarlo sin inventar uno como definitivo.
3. Parámetros de entrada y campos de salida con tipos o referencia al contrato.
4. Reglas relevantes: espacio, periodo, autorización en servidor, errores o confirmación.

No basta «aquí conectar BD». No repetir el mismo TODO en cada tarjeta que consume el resultado: ubicarlo en el servicio y mantener un mapa de operaciones.

## 6. Contratos mínimos y mapa de sustitución

Importes en céntimos enteros positivos; el tipo determina el signo. Fechas ISO con zona. No guardar totales duplicados en los mocks: calcularlos desde movimientos.

| Archivo y función propuestos | Entrada | Salida esperada de la futura API |
| --- | --- | --- |
| userService.ts: getCurrentUser | Sesión autenticada | id, fullName, email opcional, phone opcional, avatarUrl opcional |
| userService.ts: updateCurrentUser | fullName, email/phone opcionales | Usuario actualizado con los mismos campos |
| spaceService.ts: getSpaces | Sesión autenticada | Lista con id, name, type (business/personal), currency, timeZone |
| spaceService.ts: createSpace | name, type business, currency, timeZone | Space con id generado por backend |
| spaceService.ts: updateSpace | spaceId, name | Space actualizado |
| movementService.ts: getMovements | spaceId, startAt y endAt opcionales | Lista de Movement del espacio y periodo |
| movementService.ts: createMovement | spaceId y borrador confirmado | Movement con id generado por backend |
| movementService.ts: updateMovement | movementId, campos editables | Movement actualizado |
| movementService.ts: deleteMovement | movementId | Confirmación sin contenido o resultado acordado |
| aiService.ts: extractMovementDraft | spaceId, tipo elegido, sourceType y archivo/texto | Borrador editable; nunca movimiento guardado |

Movement: id, spaceId, kind (income/expense/transfer), amountMinor, description, occurredAt, category opcional. Si se incorpora transferencia: contrato adicional de origen/destino e identificador común, pendiente de acordar. Excluir transferencias internas de ingresos/gastos operativos.

MovementDraft: spaceId, kind (income/expense), amountMinor (number o null), description (string o null), occurredAt (string o null). Un valor incierto se representa como null para pedir corrección. No convertir datos faltantes en cero.

Los contratos son propuestas del frontend, no endpoints existentes. Reconciliarlos con el backend al integrar. Nunca confiar en userId enviado por el navegador para autorizar; el servidor debe comprobar la sesión y pertenencia de cada espacio.

## 7. Ejemplo de lectura: comentario justo antes de la línea

Ejemplo conceptual: mockStore implementa el filtrado local y los tipos se importan de lib/types.ts.

```ts
export async function getSpaceMovements(
  spaceId: string,
): Promise<Movement[]> {
  // TODO(BACKEND): sustituir esta lectura por la API de movimientos del espacio.
  // Entrada: spaceId; salida: id, spaceId, kind, amountMinor, description,
  // occurredAt y category opcional. Endpoint pendiente de acordar.
  // El servidor valida sesión/pertenencia; un error no se convierte en [].
  const movements = mockStore.getMovements(spaceId);

  return movements;
}
```

La interfaz continuará llamando getSpaceMovements al cambiar de fuente. El servicio futuro transformará la respuesta al contrato del frontend si los nombres del backend difieren. No distribuir fetch por cada componente visual.

## 8. Ejemplo de escritura simulada

```ts
export async function createMovement(
  draft: ConfirmedMovementDraft,
): Promise<Movement> {
  // TODO(BACKEND): sustituir por creación mediante la API, solo tras confirmar.
  // Entrada: spaceId, kind, amountMinor, description, occurredAt.
  // Salida: Movement completo con id del servidor; endpoint por acordar.
  // Si falla, conservar el formulario y no anunciar guardado exitoso.
  const savedMovement = mockStore.createMovement(draft);

  return savedMovement;
}
```

ConfirmedMovementDraft representa un borrador validado sin campos obligatorios nulos. La validación sucede antes de llamar a createMovement. En la demo, mockStore genera el id local y devuelve una copia; no mutar el arreglo exportado de fixtures desde componentes.

## 9. Ejemplo de IA simulada

```ts
export async function extractMovementDraft(
  input: CaptureInput,
): Promise<MovementDraft> {
  // TODO(IA): sustituir por la API de extracción del backend, no por una clave
  // del proveedor en el navegador. Entrada: spaceId, kind, sourceType
  // (voice/image/text) y archivo o texto. Salida: MovementDraft con campos
  // desconocidos en null. Revisar y confirmar antes de crear el movimiento.
  const movementDraft = getMockMovementDraft(input);

  return movementDraft;
}
```

CaptureInput y getMockMovementDraft deben definirse explícitamente al implementar. La simulación respeta spaceId y kind seleccionados. Rotular «Extracción simulada» en la demo; no fingir transcripción, análisis real, autenticación ni biometría.

## 10. Variables al principio de la función

Agrupar al inicio las declaraciones que puedan inicializarse con datos disponibles y válidos. Usar const por defecto; let solo cuando haya reasignación necesaria. No usar var. Declarar una variable por instrucción.

```ts
function calculateOperatingResult(movements: Movement[]): number {
  const incomeMinor = sumMovementsByKind(movements, 'income');
  const expenseMinor = sumMovementsByKind(movements, 'expense');
  const operatingResultMinor = incomeMinor - expenseMinor;

  return operatingResultMinor;
}
```

Excepciones necesarias para corrección: variables que dependen de una validación, await, rama o iteración se declaran al comienzo de su bloque válido. No declarar let vacío arriba solo para cumplir una regla estética ni evaluar propiedades antes de comprobar que existen. En React los Hooks deben mantener orden estable; no moverlos dentro de condiciones o después de retornos condicionales. Nunca declarar todas las variables como globales.

## 11. Funciones y componentes legibles

- Una función realiza una tarea; nombres con verbo y significado del negocio.
- Extraer una función si la misma regla se usa en varios lugares: calcular totales, formatear moneda, generar rangos, validar borradores.
- También extraer lógica compleja con nombre claro aunque se utilice una sola vez. No extraer una expresión trivial solo para reducir líneas.
- Preferir retornos tempranos a múltiples niveles de if. Evitar ternarias anidadas; una ternaria simple para presentación está permitida.
- Para muchos parámetros relacionados, usar un objeto tipado; evitar cinco parámetros posicionales ambiguos.
- Componentes reciben props tipadas; las páginas componen secciones. No mezclar generación de PDF, extracción IA y renderizado de filas en una sola función.
- Extraer componentes por responsabilidad, reutilización o complejidad real; no crear un componente por cada etiqueta HTML.
- No fijar un límite arbitrario de líneas. Si cuesta explicar la función en una frase, revisar sus responsabilidades.
- No añadir useMemo, useCallback o un Hook propio sin una razón concreta.

## 12. Estado, errores y consistencia

- Fuente única de verdad para espacios y movimientos; los resúmenes se derivan de ella.
- No duplicar totalVentas en cada pantalla ni mantener sincronización manual de totales.
- No mutar props ni estado directamente. Usar actualizaciones inmutables y claves estables (id, no índice) en listas editables.
- Contemplar carga, error, vacío y éxito. Un error de API no significa que el negocio tiene cero movimientos.
- Si cambia el espacio durante una petición, impedir que la respuesta anterior sobrescriba el espacio nuevo; cancelar o ignorar resultados obsoletos.
- Formularios conservan datos ante fallos. Evitar doble envío mientras se guarda.
- TypeScript sin any de conveniencia; usar tipos explícitos en límites del sistema y validar respuestas externas antes de confiar en ellas.
- Comentarios explican decisiones, reglas o integración pendiente, no repiten cada línea. Eliminar código muerto y console.log de depuración.

## 13. Cálculos y seguridad básica

- Cálculos monetarios en enteros; formatear solo al presentar.
- Filtrar por espacio y periodo antes de sumar. Excluir transferencias internas y no mezclar monedas.
- Centralizar límites de fecha por zona horaria; no duplicar lógica en Inicio, Movimientos y PDF.
- No exponer credenciales en variables públicas, JSX, mocks ni registros.
- No renderizar HTML de IA sin tratamiento seguro. Mostrar salida como datos validados y texto.
- Voz e imagen generan borradores; la confirmación del usuario es obligatoria para guardar.
- La biometría y autenticación real se implementan como mecanismos reales posteriormente, no como booleanos que aparentan proteger datos.

## 14. Verificación antes de entregar

- Ejecutar lint, comprobación de tipos y build según scripts disponibles en package.json y alcance del cambio.
- Verificar manualmente la vista modificada, ancho móvil, navegación por teclado y estados relevantes.
- Pruebas útiles: cálculos monetarios, separación de espacios, límites de periodos, transferencias y validación de borradores. No crear pruebas de cada constante o texto estático.
- Buscar TODO(BACKEND) y TODO(IA): cada integración pendiente tiene entrada, salida y ubicación concreta.
- Al integrar un servicio real, sustituir la línea marcada, actualizar el comentario y verificar carga/error/éxito. No dejar un TODO resuelto ni fallback silencioso a mocks.
- Documentar los endpoints cuando se acuerden. El frontend no inventa ni implementa la lógica privada del compañero.

## 15. Orden sugerido de implementación

1. Tipos y fixtures coherentes con las cuatro vistas.
2. Estado demo y servicios con comentarios de integración.
3. Cálculos y formato compartidos.
4. Componentes de cada pantalla, navegación y formularios locales.
5. Verificación funcional y actualización de los documentos cuando cambie una decisión.

Este documento y el bloque AGENTS.md son entregables para incorporar al repositorio. No se ha modificado el AGENTS.md real ni el código del proyecto desde esta conversación.
