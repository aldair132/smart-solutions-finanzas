# Mis espacios · Frontend de demostración

Aplicación Next.js con cuatro vistas basadas en la referencia visual y las guías de `docs/`.

## Ejecutar

```bash
npm install
npm run dev
```

Abrir http://localhost:3000. Verificaciones disponibles: `npm run lint` y `npm run build` (incluye TypeScript).

## Rutas

- `/`: espacios, resumen del día y creación de negocios.
- `/espacios/[spaceId]`: registro de ventas/gastos y últimos cinco movimientos.
- `/espacios/[spaceId]/movimientos?period=today|7d|month`: historial, edición y PDF local.
- `/espacios/[spaceId]/perfil`: perfil común, configuración del espacio y salida de la demo.
- `/demo`: pantalla de salida.

Espacios iniciales: `bodega`, `comida`, `personal`. Fecha demo fija: 23/10/2026, zona America/Lima, moneda PEN. La cuenta personal registra únicamente gastos. El estado es compartido durante la navegación y se reinicia al recargar o salir de la demo.

## Organización e integración pendiente

- `lib/types.ts`: contratos propuestos del frontend.
- `lib/mockData.ts`: fixtures y propuesta de extracción simulada.
- `lib/demoService.ts`: puntos de sustitución marcados con TODO(BACKEND) y TODO(IA).
- `components/DemoProvider.tsx`: estado compartido en memoria.
- `lib/finance.ts`: importes en céntimos, filtros y formato por zona horaria.
- `lib/exportMovementsPdf.ts`: PDF generado con jsPDF, usando solamente los movimientos filtrados.
- `components/`: pantallas, formularios y elementos visuales reutilizados.

No hay autenticación, almacenamiento remoto ni extracción IA real. Voz usa un ejemplo; Foto muestra el archivo local y una propuesta ficticia; Escribir permite registro manual. Todos requieren revisión y confirmación. Biometría está deshabilitada; soporte y documentos legales se identifican como pendientes. No se recopilan contraseñas.

Los endpoints deben acordarse con backend. La futura API debe comprobar sesión y pertenencia de cada espacio, validar las escrituras y devolver errores explícitos. El PDF permanece en frontend.
