# SmartCart — Estado actual

## Fase actual

**F2.2 — Experiencia de identidad y acceso (completada).**

## Qué existe hoy

- Repositorio Git inicializado en rama `main`.
- Documentación fundacional creada en `docs/`.
- Aplicación Next.js 16.3.5 con TypeScript, App Router, Tailwind CSS, ESLint y Prettier.
- Página técnica mobile-first en `/` y endpoint `/api/health`.
- Dockerfile multi-stage y Compose con aplicación y PostgreSQL 17, volumen, red interna y healthcheck.
- Manifest web e icono SVG placeholder para preparar la evolución a PWA.
- Scripts de desarrollo, build, lint, typecheck y formato.
- Better Auth 1.7.4 con PostgreSQL directo mediante `pg` y handler App Router.
- Email/password habilitado sin verificación temporal.
- Google OAuth preparado de forma condicional por variables de entorno.
- Identidad invitada local en `localStorage`, sin usuario ni sesión Better Auth.
- Tests mínimos con Vitest para crear, reutilizar y resetear la identidad invitada.
- Migración oficial aplicada y tablas `user`, `session`, `account` y `verification` verificadas en PostgreSQL.
- Signup/signin email verificados contra el stack Docker con una cuenta temporal eliminada después de la prueba.
- Pantalla de acceso mobile-first con Google como CTA principal, invitado inmediato y email secundario.
- Estados de carga, errores traducidos al español, estado autenticado con nombre/email/avatar y logout.
- Contrato local `getPendingGuestIdentity`/`clearGuestIdentityAfterImport` preparado sin migración de compras.
- Signout real verificado con `Origin`/`Referer` válidos y sesión posterior `null`.

## Qué no existe

- No existen carrito, supermercados, productos, historial, OCR, cámara, IndexedDB ni service worker offline complejo.
- No se han creado tablas de negocio; solo existen las tablas estándar de identidad de Better Auth.
- Google OAuth no fue probado con credenciales reales ni configuración externa de Google Cloud.
- No se realizaron commits ni push durante F2.2.

## Decisiones aprobadas

Producto web responsive mobile-first, con evolución a PWA; invitado sin registro; cuenta opcional con Google y email; Better Auth sobre PostgreSQL; monolito Next.js con TypeScript/App Router/Tailwind; almacenamiento local preparado para IndexedDB; autorización server-side; imágenes efímeras y datos estructurados; sin monetización, scraping, promociones ni IA compleja en MVP. Better Auth usa sus migraciones oficiales; no se incorporó ORM adicional ni se crearon tablas de negocio. F2.2 conserva el guest ID tras autenticación para una futura importación explícita.

El producto inicial es un asistente personal de compra, no un comparador general de supermercados.

## Riesgos abiertos

- Configurar y probar OAuth real de Google.
- Endurecer verificación/recuperación de email antes de producción.
- Definir precisión monetaria final y reglas de redondeo por moneda.
- Decidir proveedor de PostgreSQL y hosting.
- Diseñar conflictos de migración invitado→cuenta y sincronización multi-dispositivo.
- Validar qué capacidades PWA/offline son confiables en navegadores móviles objetivo.
- Definir taxonomía de unidades y comportamiento de precios por peso/volumen.

## Siguiente fase

Puede abordarse **F3 — Supermercados**, manteniendo fuera las funcionalidades de compra no previstas en esa fase.

## Instrucción de continuidad

La próxima instancia debe leer este archivo junto con PRODUCT, ARCHITECTURE, DATA_MODEL, ROADMAP y DECISIONS antes de cambiar el repositorio. Debe conservar las decisiones autoritativas y señalar contradicciones antes de inventar nuevas reglas.
