# SmartCart — Estado actual

## Fase actual

**F0 — Foundation / definición documental.**

## Qué existe hoy

- Repositorio Git inicializado en rama `main`.
- Repositorio limpio y sin archivos de proyecto visibles antes de F0.
- Documentación fundacional creada en `docs/`.

## Qué no existe

- No existe aplicación Next.js.
- No existe backend, base PostgreSQL, Docker, autenticación ni PWA.
- No existen tablas, migraciones, componentes productivos, funcionalidades de negocio ni sincronización offline.
- No se realizaron commits ni push.

## Decisiones aprobadas

Producto web responsive mobile-first, con evolución a PWA; invitado sin registro; cuenta opcional con Google y email; monolito Next.js con TypeScript/App Router/Tailwind; PostgreSQL; almacenamiento local preparado para IndexedDB; autorización server-side; imágenes efímeras y datos estructurados; sin monetización, scraping, promociones ni IA compleja en MVP.

El producto inicial es un asistente personal de compra, no un comparador general de supermercados.

## Riesgos abiertos

- Elegir proveedor/librería concreta de autenticación y estrategia de verificación de email.
- Definir precisión monetaria final y reglas de redondeo por moneda.
- Decidir proveedor de PostgreSQL y hosting.
- Diseñar conflictos de migración invitado→cuenta y sincronización multi-dispositivo.
- Validar qué capacidades PWA/offline son confiables en navegadores móviles objetivo.
- Definir taxonomía de unidades y comportamiento de precios por peso/volumen.

## Siguiente fase

**F1 — Bootstrap técnico:** inicializar Next.js, TypeScript, App Router, Tailwind, Docker de desarrollo, checks de calidad, entornos y estructura modular mínima, sin implementar aún el dominio completo.

## Instrucción de continuidad

La próxima instancia debe leer este archivo junto con PRODUCT, ARCHITECTURE, DATA_MODEL, ROADMAP y DECISIONS antes de cambiar el repositorio. Debe conservar las decisiones autoritativas y señalar contradicciones antes de inventar nuevas reglas.
