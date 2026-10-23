# Vista 4 — Perfil común y configuración

Estado: guía de implementación del prototipo. Fecha: 23/10/2026.

## Objetivo y ruta

Ruta /espacios/[spaceId]/perfil. Gestionar la cuenta del cliente y acceder a ayuda y opciones de seguridad. El perfil es único para todos los espacios; spaceId conserva únicamente el contexto de navegación.

## Componentes y distribución

| Orden | Componente | Contenido | Espacio |
| --- | --- | --- | --- |
| 1 | Título | «Perfil» y acceso «Mis espacios» | 48–64 px |
| 2 | ProfileSummary | Avatar, Rosa Martínez y «Tu cuenta para todos tus espacios» | Tarjeta menta de 100–120 px |
| 3 | AccountOptions | Datos del cliente, Atención al cliente, Biometría digital | Filas de 56–64 px |
| 4 | SecurityAndLegal | Cambiar clave, Términos y condiciones, Política de privacidad | Filas de 56–64 px |
| 5 | SpaceSettings | «Configuración de Bodega Doña Rosa» | Fila de 56–64 px, específica del espacio |
| 6 | LogoutButton | Cerrar sesión, separado del resto | 56 px |
| 7 | BottomTabs | Perfil activo | Fija abajo, 64 px más safe-area |

Configuración del espacio se añade para conservar el acceso acordado en el primer diseño; no confundirla con datos personales. En Cuenta personal su etiqueta será «Configuración de cuenta personal».

## Comportamiento de cada opción

| Opción | Destino o comportamiento del prototipo | Integración futura |
| --- | --- | --- |
| Datos del cliente | Panel editable con nombre y campos ficticios opcionales de correo/teléfono; guardar en estado local | API de cuenta |
| Atención al cliente | Panel de ayuda con preguntas básicas y aviso «Canal de contacto pendiente» | Canal verificado de soporte |
| Biometría digital | Opción deshabilitada con «Próximamente» y explicación | Autenticación de dispositivo compatible; fuera de este alcance |
| Cambiar clave | Panel explicativo «Disponible al conectar el inicio de sesión» | Flujo seguro de cambio de credenciales |
| Términos y condiciones | Panel identificado «Documento pendiente de revisión» | Texto aprobado por responsables |
| Política de privacidad | Panel identificado «Documento pendiente de revisión» | Política conforme al tratamiento real de datos |
| Configuración del espacio | Editar nombre del negocio en estado local; moneda PEN informativa | API de espacios |
| Cerrar sesión | Confirmación y salida de la demo a pantalla neutral con «Volver a la demostración» | Invalidar sesión real |

No inventar teléfonos, correos de soporte ni documentos legales aprobados. No recolectar claves reales en una maqueta. No activar una huella mediante un interruptor fingiendo autenticación funcional. En el prototipo, el aviso «Modo demostración» aclara el alcance de Cerrar sesión.

## Formularios locales

Datos del cliente: nombre obligatorio de 1–60 caracteres. Correo y teléfono opcionales; si se muestran, validar su formato sin exigir documentos de identidad ni información innecesaria. Botones Guardar y Cancelar, avisos claros y sin falsas confirmaciones de servidor. Cambiar nombre actualiza el saludo global.

Configuración del negocio: mostrar espacio seleccionado, nombre editable, moneda fija PEN. Reutilizar validación de nombres de la vista general. Cancelar no modifica datos; guardar actualiza selector y tarjetas. No permitir borrar negocios con movimientos desde esta primera versión. Para personal no ofrecer convertirlo en negocio ni duplicarlo.

## Navegación y sesión de demostración

Inicio y Movimientos regresan al espacio de la ruta; no seleccionan arbitrariamente el primero. «Mis espacios» vuelve a /. Los paneles secundarios incluyen Volver o Cerrar y restauran el foco al control que los abrió.

La salida de demo usa una pantalla neutral propuesta /demo con botón «Volver a la demostración». Limpiar el estado temporal al confirmar y reiniciar los datos ficticios al reingresar. Esta pantalla auxiliar no es una quinta vista principal ni implementa login real.

## Estados

Sin foto: iniciales o icono de persona. Nombre largo: permitir ajuste sin ocultar acciones. Guardado local exitoso: mensaje breve. Error de validación junto al campo, conservando lo escrito. Cambios sin guardar: confirmar descarte al salir del panel.

## Archivos sugeridos

app/espacios/[spaceId]/perfil/page.tsx; app/demo/page.tsx para salida; components/profile/ProfileSummary.tsx, ProfileOption.tsx, CustomerDataDialog.tsx, SpaceSettingsDialog.tsx y LogoutDialog.tsx.

## Criterios de aceptación

- El mismo usuario aparece al abrir Perfil desde distintos negocios.
- Todas las opciones requeridas están visibles y tienen una respuesta definida.
- Biometría y cambio de clave no simulan seguridad operativa.
- Editar datos personales no modifica movimientos; cambiar nombre de negocio afecta solo ese espacio.
- Cerrar sesión en demo pide confirmación; cancelar mantiene el estado.
- Textos legales y soporte pendientes están identificados sin prometer servicios inexistentes.
- Tabulación, foco y cierre de diálogos funcionan; la barra no tapa Cerrar sesión.

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

