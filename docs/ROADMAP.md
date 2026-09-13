# SmartCart — Roadmap

Las fases son pequeñas y verificables. F14 es la última fase completada; F15 es la siguiente fase y todavía no fue iniciada.

## F0 — Foundation

- **Objetivo:** fijar producto, arquitectura, modelo, decisiones y estado retomable.
- **Entregables:** PRODUCT, ARCHITECTURE, DATA_MODEL, ROADMAP, CURRENT_STATE y DECISIONS.
- **Dependencias:** repositorio inspeccionado.
- **Cierre:** documentos coherentes, links revisados, `git diff --check` limpio y sin implementación de negocio.

## F1 — Bootstrap técnico

- **Estado:** completada.
- **Objetivo:** crear la base ejecutable del monolito.
- **Entregables:** Next.js 16.3.5 + TypeScript + App Router, Tailwind 4, ESLint 9, Prettier, Docker multi-stage, Compose con PostgreSQL 17, variables de entorno, manifest PWA base, página técnica y health endpoint.
- **Dependencias:** F0.
- **Cierre:** aplicación, PostgreSQL healthy y validaciones técnicas verificadas dentro de Compose.

## F2 — Identidad y modo invitado

- **Estado:** completada; F2.1 y F2.2 completadas.
- **Objetivo:** permitir entrar como invitado o autenticarse.
- **Entregables:** sesión protegida, Google OAuth condicional, email/credenciales, sesión local invitada, migración conceptual documentada y tablas estándar de Better Auth.
- **Dependencias:** F1.
- **Cierre:** ambos caminos son utilizables y no se mezclan datos entre usuarios.

### F2.1 — Infraestructura de identidad

- **Estado:** completada.
- **Objetivo:** integrar Better Auth, autenticación email/password, Google preparado e identidad invitada local.
- **Entregables:** handler `/api/auth/[...all]`, cliente React, helper server-side, migración oficial, UI mínima de estados y tests de guest identity.
- **Dependencias:** F1 y PostgreSQL.
- **Cierre:** checks de código pasan; migración oficial creó y verificó las tablas estándar; signup/signin email funciona localmente. Google queda sujeto a credenciales externas y no fue probado mediante OAuth real.

### F2.2 — Experiencia de identidad y acceso

- **Estado:** completada; Google real pendiente de validación externa.
- **Objetivo:** cerrar la entrada rápida, estados de acceso, errores y transición conceptual guest→cuenta.
- **Entregables:** UX mobile-first, Google condicional, email secundario, estados autenticado/invitado, logout, loading/error states, helpers de guest pendiente y tests relevantes.
- **Dependencias:** F2.1.
- **Cierre:** guest no requiere backend, logout no crea guest, email funciona localmente, estados UI están cubiertos y Google queda documentado como única prueba externa pendiente.

## F3 — Supermercados

- **Estado:** completada.
- **Objetivo:** seleccionar y crear supermercados.
- **Entregables:** modelo `stores` en PostgreSQL, migración Drizzle, CRUD API autenticado con Zod y autorización server-side, CRUD local para invitados y UI compartida de listado/alta/edición/baja/selección.
- **Dependencias:** F2.
- **Cierre:** selección/creación/edición/eliminación funciona con validación, aislamiento entre propietarios y aislamiento entre invitados; no se implementa aún migración ni sincronización.

## F4 — Productos

- **Estado:** completada.
- **Objetivo:** registrar productos manuales y frecuentes.
- **Entregables:** modelo `products` personal, migración Drizzle, CRUD API autorizado, búsqueda básica por nombre/marca/barcode, barcode string opcional, marca, presentación decimal estructurada, taxonomía inicial de unidades, conversiones exactas y CRUD local guest.
- **Dependencias:** F3.
- **Cierre:** un producto puede existir sin código, puede editarse para agregarlo después, se busca y reutiliza dentro del catálogo del propietario; invitados permanecen en localStorage y no se mezclan.

## F5 — Sesión de compra

- **Estado:** completada.
- **Objetivo:** iniciar y mantener una compra.
- **Entregables:** modelo `shopping_sessions`, estados `active/completed`, Store opcional con FK `RESTRICT`, índice único parcial de una sesión activa por usuario, API autenticada de inicio/consulta/listado/finalización, repositorio guest local e interfaz de restauración/finalización.
- **Dependencias:** F3, F4.
- **Cierre:** una sesión se crea y retoma sin perder contexto, no se permiten dos activas por propietario, finish es idempotente y no se puede eliminar un Store referenciado.

## F6 — Carrito y presupuesto

- **Estado:** completada solo en su alcance de presupuesto; los ítems y cálculos quedan explícitamente fuera.
- **Objetivo:** controlar gasto en tiempo real.
- **Entregables F6 implementados:** presupuesto opcional de la sesión, alta/edición/eliminación, validación decimal exacta, persistencia cloud/guest, restauración, visualización en activa e historial y conservación al finalizar.
- **Fuera de alcance F6:** ítems, cantidad comprada, precio, subtotales, total, resumen calculado y bloqueo por presupuesto.
- **Dependencias:** F5.
- **Cierre:** flujo manual de presupuesto validado para cuenta e invitado; las operaciones de dinero se conservan como strings decimales y PostgreSQL usa `NUMERIC(19,2)`.

## F7 — Captura/lectura de producto

- **Estado:** completada solo para ítems manuales/de catálogo; captura asistida queda fuera.
- **Objetivo:** acelerar carga opcionalmente.
- **Entregables F7 implementados:** `ShoppingItem` con snapshot, producto de catálogo o manual, cantidad decimal, incremento de referencias de catálogo, edición/eliminación activa, listado histórico, persistencia guest y protección de Product usado.
- **Fuera de alcance F7:** precio, subtotal, total, presupuesto restante, OCR, cámara, barcode scanning y `PriceObservation`.
- **Dependencias:** F4, F6.
- **Cierre:** flujo manual completo validado para cuenta e invitado; los ítems sobreviven la finalización y no se introducen capturas ni imágenes.

## F8 — Precio, subtotales y resumen

- **Estado:** completada en su alcance MVP; la captura asistida queda fuera.
- **Objetivo:** registrar precio por unidad/presentación y controlar el gasto durante la compra.
- **Entregables:** `unit_price` nullable, validación decimal, subtotales/total derivados, resumen con presupuesto, disponible y porcentaje, edición inline, historial básico y semántica guest equivalente.
- **Dependencias:** F7.
- **Cierre:** precio pendiente no cuenta como cero, el mismo producto no sobrescribe un precio silenciosamente, y una compra completada conserva precio, cantidad y snapshot en modo lectura.

## F9 — Historial

- **Estado:** completada; PriceObservation queda fuera.
- **Objetivo:** convertir compras completadas en historial útil y consistente.
- **Entregables:** listado solo `completed`, detalle readonly basado en snapshots, totales/conteos, warning de precios pendientes, filtro por Store, orden newest/oldest, paginación limit/offset y equivalencia guest.
- **Dependencias:** F6.
- **Cierre:** usuario A no puede ver historial ni Stores de B; sesiones activas quedan excluidas; no se persisten agregados derivados.

## F10 — Comparaciones históricas

- **Estado:** completada; no se incorporó PriceObservation.
- **Objetivo:** comparar compras, precios de productos y resúmenes por supermercado usando solo el historial propio.
- **Entregables:** comparación contra compra anterior, estado parcial/insuficiente, porcentaje exacto cuando corresponde, compatibilidad estricta de presentación y moneda, resumen agregado por supermercado, endpoint de overview, UI guest/autenticada y validación de IDs/filtros.
- **Dependencias:** F9.
- **Cierre:** resultados trazables a snapshots históricos, sin inventar precios faltantes ni normalizaciones inseguras; F11 fue completada posteriormente.

## F11 — Listas de compras

- **Objetivo:** planificar compras repetibles.
- **Entregables:** CRUD de listas, ítems y creación de sesión desde lista.
- **Dependencias:** F4, F5.
- **Cierre:** lista y compra mantienen historiales independientes.

## F12 — Offline y sincronización

- **Objetivo:** tolerar conectividad deficiente con reconciliación.
- **Entregables:** IndexedDB robusto, cola idempotente, reintentos, estados y conflictos explícitos.
- **Dependencias:** F2, F5, F6, F9.
- **Cierre:** una compra puede continuar offline y sincronizar sin duplicación silenciosa.

## F13 — Barcode durante compra activa

- **Objetivo:** agilizar el agregado de productos mientras se realiza una compra.
- **Entregables:** cámara trasera con `BarcodeDetector`, fallback manual, lookup exacto, alta rápida de Product desconocido y reutilización de las reglas de ShoppingItem para cuenta y guest.
- **Dependencias:** F5, F6, F8 y F12.
- **Cierre:** barcode preservado como string, snapshots correctos, precio explícito, sin persistencia de imágenes y sin auto-inicio de sesión.

## F14 — PriceObservation

- **Objetivo:** registrar historial normalizado de precios por Product, Store y fecha.
- **Entregables:** tabla `price_observations`, generación al finalizar compra, idempotencia, historial por Product, latest price por Store, soporte guest, reconstrucción F12 y backfill explícito.
- **Dependencias:** F8–F13.
- **Cierre:** migración 0008 aplicada, PostgreSQL real validado, ownership y delete protection confirmados, retry/backfill sin duplicados y tests completos.

## F15 — Comparación de listas entre supermercados

- **Estado:** siguiente fase; no iniciada.
- **Objetivo:** usar `PriceObservation` para estimar cuánto costaría una `ShoppingList` en distintos `Store` según precios conocidos.
- **Entregables:** estimación por lista y Store, cobertura explícita de precios faltantes y consultas históricas acotadas.
- **Dependencias:** F11 y F14.
- **Cierre:** comparación transparente, sin inventar precios y sin incluir promociones o costos externos.

## F16 — Promociones / costo real opcional

- **Objetivo:** dejar espacio para promociones, tarjetas, distancia, combustible/taxi u otros costos, sin implementarlos todavía.
- **Entregables:** definición futura de fuentes y reglas opcionales de costo real.
- **Dependencias:** F15.
- **Cierre:** alcance explícito y separado del precio histórico normalizado.

## F17 — Offline/PWA robusta

- **Objetivo:** soportar IndexedDB, cola local, sincronización y resolución de conflictos.
- **Entregables:** persistencia offline, reintentos, sincronización y conflictos explícitos.
- **Dependencias:** F14.
- **Cierre:** una compra puede continuar offline sin duplicación silenciosa.

## F18 — QA funcional / producción

- **Objetivo:** seguridad, performance, accesibilidad funcional, mobile real y producción.
- **Entregables:** validación funcional, hardening, observabilidad, despliegue y runbook.
- **Dependencias:** F15–F17.
- **Cierre:** operación segura y criterios de calidad verificados.

## F19 — UX/UI final

- **Objetivo:** diseño visual, dashboard desktop, mobile purchase mode, navegación, responsive y polishing final.
- **Entregables:** experiencia visual final y pulido transversal.
- **Dependencias:** F15–F18.
- **Cierre:** UX/UI final validada en desktop y mobile.

### F11 — Listas reutilizables (implementada)

Plantillas de compra con productos de catálogo o manuales, snapshots, cantidades, checks, duplicación, reset, guest local e importación a ShoppingSession. La siguiente fase puede explorar observaciones de precio y comparación sin acoplarlas a esta plantilla.

### F12 — Importación guest → cuenta (implementada)

Importación explícita y transaccional de Stores, Products, compras, ítems y listas. Incluye trazabilidad idempotente, resolución segura de duplicados, snapshot serializado desde el cliente, limpieza local posterior al éxito y preservación ante error o conflicto de sesión activa.

### F14 — PriceObservation (completada)

Historial normalizado de precios de Products por Store y fecha, generado al finalizar compras con precio y Store válidos. Incluye consulta por Product, latest price por Store, backfill explícito e idempotente, soporte guest y reconstrucción durante F12. La comparación completa de listas por supermercado queda fuera de F14 y no fue iniciada.
