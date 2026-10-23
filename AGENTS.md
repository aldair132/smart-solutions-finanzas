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

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
