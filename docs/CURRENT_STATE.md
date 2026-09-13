# SmartCart — Estado actual

## Fase actual

**F2.1 — Infraestructura de identidad (completada).**

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

## Qué no existe

- No existen autenticación, usuarios, sesiones invitadas, tablas ni migraciones de negocio.
- No existen carrito, supermercados, productos, historial, OCR, cámara, IndexedDB ni service worker offline complejo.
- No se han creado tablas de negocio; solo existen las tablas estándar de identidad de Better Auth.
- PostgreSQL está configurado para Compose, pero no pudo verificarse healthy porque Docker Desktop no estaba ejecutando el daemon.
- No se realizaron commits ni push.

## Decisiones aprobadas

Producto web responsive mobile-first, con evolución a PWA; invitado sin registro; cuenta opcional con Google y email; Better Auth sobre PostgreSQL; monolito Next.js con TypeScript/App Router/Tailwind; almacenamiento local preparado para IndexedDB; autorización server-side; imágenes efímeras y datos estructurados; sin monetización, scraping, promociones ni IA compleja en MVP. Better Auth usa sus migraciones oficiales; no se incorporó ORM adicional ni se crearon tablas de negocio.

El producto inicial es un asistente personal de compra, no un comparador general de supermercados.

## Riesgos abiertos

- Las credenciales reales de Google y la verificación OAuth externa todavía no están configuradas.
- Elegir proveedor/librería concreta de autenticación y estrategia de verificación de email.
- Definir precisión monetaria final y reglas de redondeo por moneda.
- Decidir proveedor de PostgreSQL y hosting.
- Diseñar conflictos de migración invitado→cuenta y sincronización multi-dispositivo.
- Validar qué capacidades PWA/offline son confiables en navegadores móviles objetivo.
- Definir taxonomía de unidades y comportamiento de precios por peso/volumen.

## Siguiente fase

Antes de declarar F1 cerrada, iniciar Docker Desktop y repetir `docker compose up -d --build`, el healthcheck de PostgreSQL y una comprobación HTTP de la aplicación dentro de Compose.

Puede abordarse **F2.2**, sin implementar todavía funcionalidades de compra.

## Instrucción de continuidad

La próxima instancia debe leer este archivo junto con PRODUCT, ARCHITECTURE, DATA_MODEL, ROADMAP y DECISIONS antes de cambiar el repositorio. Debe conservar las decisiones autoritativas y señalar contradicciones antes de inventar nuevas reglas.
