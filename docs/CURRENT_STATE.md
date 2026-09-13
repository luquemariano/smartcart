# SmartCart — Estado actual

## Fase actual

**F1 — Bootstrap técnico (implementación completada; cierre operativo pendiente).**

## Qué existe hoy

- Repositorio Git inicializado en rama `main`.
- Documentación fundacional creada en `docs/`.
- Aplicación Next.js 16.3.5 con TypeScript, App Router, Tailwind CSS, ESLint y Prettier.
- Página técnica mobile-first en `/` y endpoint `/api/health`.
- Dockerfile multi-stage y Compose con aplicación y PostgreSQL 17, volumen, red interna y healthcheck.
- Manifest web e icono SVG placeholder para preparar la evolución a PWA.
- Scripts de desarrollo, build, lint, typecheck y formato.

## Qué no existe

- No existen autenticación, usuarios, sesiones invitadas, tablas ni migraciones de negocio.
- No existen carrito, supermercados, productos, historial, OCR, cámara, IndexedDB ni service worker offline complejo.
- PostgreSQL está configurado para Compose, pero no pudo verificarse healthy porque Docker Desktop no estaba ejecutando el daemon.
- No se realizaron commits ni push.

## Decisiones aprobadas

Producto web responsive mobile-first, con evolución a PWA; invitado sin registro; cuenta opcional con Google y email; monolito Next.js con TypeScript/App Router/Tailwind; PostgreSQL; almacenamiento local preparado para IndexedDB; autorización server-side; imágenes efímeras y datos estructurados; sin monetización, scraping, promociones ni IA compleja en MVP. En F1 no se incorporó ORM ni herramienta de migraciones, porque no están definidas y no hay tablas de negocio.

El producto inicial es un asistente personal de compra, no un comparador general de supermercados.

## Riesgos abiertos

- Levantar/verificar Docker Desktop y PostgreSQL en el entorno local.
- Elegir proveedor/librería concreta de autenticación y estrategia de verificación de email.
- Definir precisión monetaria final y reglas de redondeo por moneda.
- Decidir proveedor de PostgreSQL y hosting.
- Diseñar conflictos de migración invitado→cuenta y sincronización multi-dispositivo.
- Validar qué capacidades PWA/offline son confiables en navegadores móviles objetivo.
- Definir taxonomía de unidades y comportamiento de precios por peso/volumen.

## Siguiente fase

Antes de declarar F1 cerrada, iniciar Docker Desktop y repetir `docker compose up -d --build`, el healthcheck de PostgreSQL y una comprobación HTTP de la aplicación dentro de Compose.

La fase siguiente será **F2 — Identidad y modo invitado**: agregar autenticación y sesión invitada sin mezclar datos, manteniendo el flujo manual y sin avanzar a funcionalidades posteriores.

## Instrucción de continuidad

La próxima instancia debe leer este archivo junto con PRODUCT, ARCHITECTURE, DATA_MODEL, ROADMAP y DECISIONS antes de cambiar el repositorio. Debe conservar las decisiones autoritativas y señalar contradicciones antes de inventar nuevas reglas.
