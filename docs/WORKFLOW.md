# Workflow autónomo local

Este repositorio admite trabajo autónomo de desarrollo en una rama local o de PR. El flujo no despliega ni administra VPS, DNS, dominios, credenciales productivas o servicios productivos.

## Inicio de una tarea

1. Revisar `git status --short --branch`, rama, remotos y commits recientes. Preservar todo cambio del usuario.
2. Leer `AGENTS.md`, `README.md`, `docs/CURRENT_STATE.md`, `docs/ROADMAP.md` y las decisiones/modelo/arquitectura que afecte el cambio.
3. Trabajar desde una rama de tarea basada en `main`; nunca implementar ni commitear directo en `main`.
4. Para cambios de Next.js, consultar primero la documentación versionada bajo `node_modules/next/dist/docs/`.
5. Implementar el alcance menor que resuelva el pedido y mantener documentación coherente con código y migraciones.

## Validación y entrega

- Instalar exactamente el lockfile con `npm ci`.
- Ejecutar `npm run verify` (formato check, TypeScript, ESLint, suite Vitest y build).
- `format:check` valida las guías Markdown de continuidad/workflow, README e instrucciones de agentes; el repo base contiene archivos heredados de código y documentación que aún no siguen Prettier. Evitar reformatarlos masivamente dentro de cambios no relacionados.
- Ejecutar las integraciones PostgreSQL siguiendo `docs/TESTING.md` cuando el cambio toque dominio/API/migraciones.
- Revisar `git diff --check`, el diff completo y `git status`; incluir solo archivos intencionales en el commit.
- Entregar rama y resumen verificable. Abrir un PR cuando esté autorizado y disponible; no mergear salvo instrucción expresa.

Las pruebas manuales de navegador o dispositivo se informan como pendientes hasta ejecutarlas con evidencia. No se sustituyen por inferencia del agente.
