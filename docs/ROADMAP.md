# SmartCart — Roadmap

Las fases son pequeñas y verificables. F7 es la fase actual completada; ninguna fase posterior se considera implementada por existir en este documento.

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

## F8 — Captura de precio

- **Objetivo:** convertir una captura en precio estructurado.
- **Entregables:** entrada asistida, validaciones, unidad y descarte de imagen.
- **Dependencias:** F7.
- **Cierre:** observación revisable antes de guardarse.

## F9 — Historial

- **Objetivo:** conservar compras y observaciones de cuentas.
- **Entregables:** listado, detalle, filtros básicos y creación de observaciones desde compras.
- **Dependencias:** F6.
- **Cierre:** invitado no obtiene historial cloud sin migración explícita.

## F10 — Comparaciones históricas

- **Objetivo:** comparar precios propios entre supermercados.
- **Entregables:** comparación básica por producto/unidad y período, con moneda/unidad visibles.
- **Dependencias:** F9.
- **Cierre:** resultados trazables a observaciones y sin afirmar cobertura inexistente.

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

## F13 — Dashboard

- **Objetivo:** presentar valor acumulativo.
- **Entregables:** resumen de compras, tendencias simples y accesos a listas/comparaciones.
- **Dependencias:** F9–F11.
- **Cierre:** dashboard útil, rápido y sin convertir el producto en un comparador general.

## F14 — QA, mobile y PWA

- **Objetivo:** preparar una experiencia confiable en teléfonos.
- **Entregables:** pruebas de flujos críticos, accesibilidad básica, responsive QA, manifest, instalación y rendimiento.
- **Dependencias:** F6, F12, F13.
- **Cierre:** criterios de aceptación móviles y PWA documentados y verificados.

## F15 — Producción

- **Objetivo:** desplegar MVP con operación segura.
- **Entregables:** Docker/hosting, migraciones, backups, observabilidad, políticas de secretos y runbook.
- **Dependencias:** F14.
- **Cierre:** despliegue repetible, rollback conocido y controles de seguridad revisados.
