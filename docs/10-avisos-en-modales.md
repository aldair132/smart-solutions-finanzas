# Confirmaciones y avisos de la aplicación

- Se reemplaza `window.confirm` por una confirmación dentro de `Dialog`, con el borde verde de la app.
- Al cerrar un formulario modificado se ofrece «Seguir editando» o «Descartar y salir». Cancelar o pulsar Escape en esa confirmación conserva el formulario.
- El evento Escape de un diálogo hijo no vuelve a abrir la confirmación del padre.
- `MessageDialog` unifica los errores de operaciones y avisos de Inicio, Movimientos, Crédito, Perfil, Fiados, captura y asistente. El mensaje puede cerrarse con «Entendido» sin perder el formulario.
- Los títulos y descripciones están asociados mediante atributos ARIA. Los avisos de error y de descarte usan `alertdialog`.
- Las indicaciones de validación junto a cada campo y los estados de carga conservan su función dentro del formulario; los errores de operaciones y confirmaciones se presentan en modales.
- Los permisos de cámara/micrófono y otros avisos administrados por el navegador continúan perteneciendo al navegador.

El cambio afecta a la presentación y confirmación en el frontend. No agrega servicios ni modifica el guardado de datos.
