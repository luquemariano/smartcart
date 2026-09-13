# SmartCart — Estado actual

## Fase actual

**F4 — Productos (completada).**

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
- Drizzle ORM 0.45.2 integrado únicamente para el dominio SmartCart, separado de Better Auth.
- Tabla `stores` creada mediante migración Drizzle y aplicada en PostgreSQL.
- CRUD autenticado de supermercados con autorización server-side, Zod y aislamiento por propietario.
- CRUD local de supermercados para invitados, aislado por `guestId` en `localStorage`.
- UI compartida para cuentas e invitados: listar, crear, editar, eliminar y seleccionar supermercado.
- Tests de repositorio local, UI y flujo autenticado con aislamiento entre dos usuarios.
- Tabla `products` creada con migración Drizzle independiente de F3 y verificada en PostgreSQL.
- Catálogo personal autenticado con CRUD, búsqueda por nombre/marca/barcode y aislamiento server-side.
- Catálogo guest local con búsqueda, CRUD, persistencia por guest ID y helpers de futura importación.
- Barcode opcional como string de 8 a 14 dígitos, preservando ceros iniciales y sin conversión numérica.
- Presentación estructurada con cantidad decimal exacta y unidades `g`, `kg`, `ml`, `l`, `unit`.
- Helpers puros de normalización de masa/volumen/unidades y tests de incompatibilidades.

## Qué no existe

- No existen precios, carrito, sesiones de compra, historial, sincronización ni migración guest→cuenta.
- Google OAuth no fue probado con credenciales reales ni configuración externa de Google Cloud.
- La baja de supermercados es hard delete por ahora; deberá revisarse cuando exista historial.
- La baja de productos es hard delete por ahora; deberá revisarse cuando exista historial o referencias.
- No se realizaron commits ni push durante F4; el commit anterior corresponde al cierre de F3.

## Decisiones aprobadas

Producto web responsive mobile-first, con evolución a PWA; invitado sin registro; cuenta opcional con Google y email; Better Auth sobre PostgreSQL; monolito Next.js con TypeScript/App Router/Tailwind; almacenamiento local preparado para IndexedDB; autorización server-side; imágenes efímeras y datos estructurados; sin monetización, scraping, promociones ni IA compleja en MVP. Better Auth usa sus migraciones oficiales; no se incorporó ORM adicional ni se crearon tablas de negocio. F2.2 conserva el guest ID tras autenticación para una futura importación explícita.

El producto inicial es un asistente personal de compra, no un comparador general de supermercados. F3 y F4 mantienen el alcance limitado a supermercados y catálogo personal.

## Riesgos abiertos

- Configurar y probar OAuth real de Google.
- Endurecer verificación/recuperación de email antes de producción.
- Definir precisión monetaria final y reglas de redondeo por moneda.
- Decidir proveedor de PostgreSQL y hosting.
- Diseñar conflictos de migración invitado→cuenta y sincronización multi-dispositivo.
- Validar qué capacidades PWA/offline son confiables en navegadores móviles objetivo.
- Definir reglas de precios por peso/volumen cuando llegue F6/F8.
- Evaluar el riesgo de dependencias de desarrollo de Drizzle Kit: `npm install` reporta 4 vulnerabilidades moderadas transitivas.

## Siguiente fase

Puede abordarse **F5 — Sesión de compra**, manteniendo fuera precios, carrito, historial y sincronización hasta sus fases correspondientes.

## Instrucción de continuidad

La próxima instancia debe leer este archivo junto con PRODUCT, ARCHITECTURE, DATA_MODEL, ROADMAP y DECISIONS antes de cambiar el repositorio. Debe conservar las decisiones autoritativas y señalar contradicciones antes de inventar nuevas reglas.
