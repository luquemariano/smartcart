<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Reglas del repositorio

- Antes de cambiar código, inspeccioná `git status`, la rama y los documentos pertinentes en `docs/`; respetá el estado real del código cuando contradiga documentación obsoleta y corregí esa documentación en el mismo cambio.
- Trabajá en una rama de tarea; no implementes ni commitees directamente en `main`. Usá commits con archivos explícitos y no incluyas `.env*`, secretos, artefactos generados ni cambios ajenos.
- Leé `docs/WORKFLOW.md`, `docs/TESTING.md` y `docs/SECURITY.md` antes de cambios sustanciales.
- Para cambios de Next.js consultá primero la documentación empaquetada en `node_modules/next/dist/docs/` para la versión instalada; seguí sus convenciones y avisos vigentes.
- Para cambios de lógica ejecutá `npm run verify` y las pruebas de integración requeridas por `docs/TESTING.md`; no afirmes validaciones que no ejecutaste.
- No despliegues ni operes VPS, DNS, dominios o servicios productivos como parte del workflow del repositorio. No ejecutes comandos destructivos de base de datos fuera de una instancia local efímera de pruebas.
- Señalá contradicciones documentales antes de cambiar reglas de producto y mantené `README.md`, `docs/CURRENT_STATE.md` y `docs/ROADMAP.md` alineados.
