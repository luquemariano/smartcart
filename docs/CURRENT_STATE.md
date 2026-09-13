# SmartCart — Estado actual

## Fase actual

**F14 — PriceObservation (completada y cerrada).** HEAD: `7ac479f` (`docs: close F14 price observations`). F15 todavía no fue iniciada.

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
- Tabla `shopping_sessions` creada mediante migración Drizzle independiente y aplicada en PostgreSQL.
- Sesiones autenticadas con estados `active/completed`, Store opcional y límite DB de una activa por propietario.
- API para iniciar, recuperar activa, listar, obtener y finalizar sesiones, con autorización server-side.
- Sesiones guest locales persistentes entre refresh/reapertura, con historial básico y helpers de futura importación.
- Eliminación de Store protegida por FK `RESTRICT` cuando existe cualquier sesión asociada.
- Fechas persistidas como timestamps UTC y formateadas en zona local para la UI.
- Presupuesto opcional por sesión en `NUMERIC(19,2)`, expuesto como string decimal y con `ARS` por defecto.
- Inicio, edición, eliminación y conservación del presupuesto al finalizar, tanto en PostgreSQL como en el repositorio guest local.
- Sesiones finalizadas inmutables respecto del presupuesto y de sus ítems; la UI muestra el total final en modo lectura.
- Tabla `shopping_items` con snapshot del producto, `quantity NUMERIC(12,3)` y `unit_price NUMERIC(19,2) NULL`; subtotal y total son derivados.
- Alta desde catálogo o manual con precio opcional, incremento atómico de la misma referencia solo cuando el precio coincide, y conflicto explícito ante precio diferente.
- Edición inline de cantidad/precio, subtotales por ítem y resumen autenticado server-side con gasto, presupuesto, disponible y porcentaje.
- FKs `shopping_session_id` y `product_id` con `ON DELETE RESTRICT`; Product usado no puede eliminarse.
- Repositorio guest de ítems persistente, aislado por guest ID y sesión, con el mismo ciclo activo/histórico y helpers monetarios compartidos.
- Historial derivado de compras `completed`, con filtro por Store, orden, paginación, detalle readonly, conteos y advertencia de precios pendientes.
- API autenticada `/api/shopping-history` y `/api/shopping-history/:id`, con aislamiento por propietario y carga de ítems acotada por página.
- Comparación server-side de una compra finalizada contra la compra anterior, priorizando el mismo supermercado y evitando comparar monedas distintas.
- Comparación compacta de precios por producto usando únicamente snapshots compatibles de `ShoppingItem`; presentaciones como `1 L` y `500 g` quedan fuera.
- Resumen histórico por supermercado con compras finalizadas, gasto válido, ticket promedio y cambio entre las dos más recientes.
- Equivalencia guest local para comparación de compras, productos y resumen por supermercado.

## Qué no existe

- No existen predicciones, scraping, IA, gráficos complejos, captura asistida/OCR, cantidades compradas por peso con reglas específicas ni sincronización avanzada. PriceObservation y la migración guest→cuenta de F12 están implementadas.
- Google OAuth no fue probado con credenciales reales ni configuración externa de Google Cloud.
- La baja de supermercados sigue siendo hard delete solo para Stores no referenciados; los referenciados se rechazan para proteger el historial. Soft delete queda pendiente.
- La baja de productos es hard delete por ahora, pero los Products referenciados por ítems históricos quedan protegidos por FK `RESTRICT`.
- Las sesiones no tienen delete; los Stores referenciados no pueden borrarse, aunque todavía no existe soft delete.
- No se realizaron commits ni push durante F7; el HEAD existente corresponde al cierre de F6.

## Decisiones aprobadas

Producto web responsive mobile-first, con evolución a PWA; invitado sin registro; cuenta opcional con Google y email; Better Auth sobre PostgreSQL; monolito Next.js con TypeScript/App Router/Tailwind; almacenamiento local preparado para IndexedDB; autorización server-side; imágenes efímeras y datos estructurados; sin monetización, scraping, promociones ni IA compleja en MVP. Better Auth usa sus migraciones oficiales; no se incorporó ORM adicional ni se crearon tablas de negocio. F2.2 conserva el guest ID tras autenticación para una futura importación explícita.

El producto inicial es un asistente personal de compra, no un comparador general de supermercados. F3–F10 mantienen el alcance limitado a contexto de compra, catálogo personal, sesión, presupuesto, ítems, precios derivados, historial propio y comparaciones derivadas del propio historial.

## Riesgos abiertos

- Configurar y probar OAuth real de Google.
- Endurecer verificación/recuperación de email antes de producción.
- Decidir proveedor de PostgreSQL y hosting.
- Diseñar conflictos de migración invitado→cuenta y sincronización multi-dispositivo.
- Validar qué capacidades PWA/offline son confiables en navegadores móviles objetivo.
- Definir reglas de precios por peso/volumen cuando se retome ese alcance futuro.
- Evaluar el riesgo de dependencias de desarrollo de Drizzle Kit: `npm install` reporta 4 vulnerabilidades moderadas transitivas.

## Siguiente fase

La siguiente fase es **F15 — Comparación de listas entre supermercados**. F15 todavía no fue iniciada.

## Instrucción de continuidad

La próxima instancia debe leer este archivo junto con PRODUCT, ARCHITECTURE, DATA_MODEL, ROADMAP y DECISIONS antes de cambiar el repositorio. Debe conservar las decisiones autoritativas y señalar contradicciones antes de inventar nuevas reglas.

F11 — Listas de compras reutilizables: CRUD, snapshots, checked/reset, duplicación, importación a compra activa y equivalencia guest local. No incluye precios proyectados, OCR, promociones ni comparación automática.

F12 — Importación guest → cuenta: implementada y validada contra PostgreSQL con migración 0007 aplicada, importación explícita, idempotencia, rollback y conflicto de sesión activa.

F13 — Barcode durante compra activa: implementada. Usa `BarcodeDetector` nativo cuando existe, cámara trasera en memoria y entrada manual como fallback; agrega Products conocidos o permite alta rápida de Products desconocidos con precio explícito, tanto para cuenta como guest. No incorpora migración ni almacenamiento de imágenes. La prueba física de cámara queda pendiente de un dispositivo/navegador compatible.

F14 — PriceObservation: COMPLETADA, validada y cerrada. Incluye migración `0008`, tabla, índices y constraints, generación atómica al finalizar ShoppingSession, idempotencia por `shopping_item_id`, historial por Product, latest price por Store, soporte guest, reconstrucción server-side durante F12 y backfill histórico idempotente. La integración PostgreSQL real, multi-Store, ownership, delete protection, rollback y retry F12 fueron validados. Total efectivo: 58 tests OK.
