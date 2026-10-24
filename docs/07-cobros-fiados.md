# Cobros de fiados en la demo

- Los nombres se comparan completos, ignorando mayúsculas, tildes, espacios repetidos y tratamientos iniciales como Sr., Sra., don o doña. Ana, Mariana y Ana María son nombres diferentes.
- En el borrador de un cobro se puede elegir un cliente pendiente mediante botones. Un nombre sin coincidencia no genera un ingreso automáticamente: se conserva el formulario para corregirlo. Si es una venta nueva, se cambia el tipo a Venta.
- Un cobro por nombre se reparte entre las deudas de ese cliente en el mismo negocio, comenzando por la más antigua. S/ 25 sobre deudas de S/ 10 y S/ 20 registra abonos de S/ 10 y S/ 15.
- Cobrar desde una fila de Fiados afecta únicamente a esa deuda. Ambos flujos rechazan importes que superen el saldo, sin recortar ni descartar dinero silenciosamente.
- Cada abono genera un ingreso con `receivableId`. Un cobro repartido aparece como varios movimientos cuya suma es el importe confirmado.
- La captura completa se valida y guarda de una sola vez. Las filas se procesan en su orden, incluyendo nuevos fiados y abonos. Si alguna falla, no se guarda ninguna venta, gasto, deuda ni cobro del lote.
- Dos comandos consecutivos validan el estado más reciente, incluso antes del siguiente render de React.
- Los cobros vinculados se muestran como detalle de solo lectura en Movimientos. También se protegen los cobros anteriores identificados por el concepto «Cobro de fiado:». La corrección o reversión de cobros queda pendiente de un flujo específico que actualice ambos registros.

La lógica se ejecuta localmente en `lib/demoTransactions.ts`; no hay una nueva conexión al backend. Los TODO(BACKEND) señalan la transacción futura y la idempotencia que deberá implementar la API del compañero. La identidad de clientes continúa representada por su nombre normalizado dentro del negocio; personas con el mismo nombre necesitan nombres diferenciados en esta demo y un identificador de cliente al integrar el backend.
