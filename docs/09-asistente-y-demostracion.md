# Cierre del asistente y textos de demostración

- Cada pregunta usa un AbortController. Cerrar, terminar la conversación o desmontar el diálogo cancela la petición del navegador e ignora cualquier resultado tardío.
- Cancelar la petición no garantiza detener un procesamiento que el proveedor ya haya recibido. No se añaden llamadas para comprobar la disponibilidad del proveedor.
- No se admiten dos preguntas simultáneas desde el mismo diálogo. Desactivar la lectura mientras espera una respuesta impide que esa respuesta comience a hablar.
- Se detienen reproducción, dictado y grabación al cerrar. Si el permiso del micrófono o la conversión del audio terminan después de cancelar, se liberan los recursos y no se envía el audio.
- «IA configurada» significa que el servidor informa una configuración; no garantiza que una llamada posterior responda. Un fallo al consultar el estado se muestra como «No se pudo comprobar la IA».
- La salida se llama «Salir y reiniciar demo» y explica que elimina cambios locales y restablece los ejemplos antes de confirmar.
- La ayuda aclara que el almacenamiento es local al navegador y depende de su disponibilidad. Los pies de página no prometen sincronización remota.
- Captura, asistente y privacidad explican brevemente qué contenido se envía al proveedor si se usa la IA configurada. La política legal sigue identificada como pendiente de revisión.

Se mantienen las rutas de IA existentes y el guardado local. No se agrega autenticación, base de datos ni una nueva integración.
