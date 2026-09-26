# Límites de seguridad del workflow

- Mantener secretos fuera de Git, diffs, logs y artefactos. `.env*` está ignorado; solo `.env.example` se versiona.
- Usar únicamente credenciales y datos sintéticos locales en desarrollo y pruebas.
- Las integraciones usan una base PostgreSQL aislada, efímera y local. No borrar ni migrar bases compartidas o remotas.
- No desplegar, provisionar VPS, cambiar DNS/dominios ni operar servicios productivos dentro de este workflow.
- CI usa permisos `contents: read`, un servicio PostgreSQL de GitHub Actions y variables efímeras de prueba. No requiere secrets de aplicación.
- Revisar dependencias y scripts antes de aprobar cambios de lockfile. No ejecutar automáticamente remediaciones amplias de dependencias como `npm audit fix --force`.
- Reportar vulnerabilidades en privado según las instrucciones de seguridad del repositorio/organización; no publicar credenciales o datos personales en issues.

Este documento establece límites de ejecución del desarrollo local; no certifica que la aplicación esté lista para producción.
