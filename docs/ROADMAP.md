# SmartCart — Roadmap

Las fases son pequeñas y verificables. F0 es la fase actual; ninguna fase posterior se considera implementada por existir en este documento.

## F0 — Foundation

- **Objetivo:** fijar producto, arquitectura, modelo, decisiones y estado retomable.
- **Entregables:** PRODUCT, ARCHITECTURE, DATA_MODEL, ROADMAP, CURRENT_STATE y DECISIONS.
- **Dependencias:** repositorio inspeccionado.
- **Cierre:** documentos coherentes, links revisados, `git diff --check` limpio y sin implementación de negocio.

## F1 — Bootstrap técnico

- **Objetivo:** crear la base ejecutable del monolito.
- **Entregables:** Next.js + TypeScript + App Router, Tailwind, configuración de calidad, Docker para desarrollo, configuración de entornos y esqueleto modular mínimo.
- **Dependencias:** F0.
- **Cierre:** aplicación arranca, checks básicos pasan, secretos están fuera del repo y la estructura coincide con ARCHITECTURE.

## F2 — Identidad y modo invitado

- **Objetivo:** permitir entrar como invitado o autenticarse.
- **Entregables:** sesión protegida, Google OAuth, email/credenciales, sesión local invitada y flujo conceptual de migración preparado.
- **Dependencias:** F1.
- **Cierre:** ambos caminos son utilizables y no se mezclan datos entre usuarios.

## F3 — Supermercados

- **Objetivo:** seleccionar y crear supermercados.
- **Entregables:** CRUD autorizado para cuentas y almacenamiento local para invitados.
- **Dependencias:** F2.
- **Cierre:** selección/creación funciona con validación y aislamiento.

## F4 — Productos

- **Objetivo:** registrar productos manuales y frecuentes.
- **Entregables:** alta, edición, búsqueda básica, cantidades/unidades y barcode opcional.
- **Dependencias:** F3.
- **Cierre:** un producto puede existir sin código y puede reutilizarse.

## F5 — Sesión de compra

- **Objetivo:** iniciar y mantener una compra.
- **Entregables:** estados, supermercado opcional, sesión local/remota y recuperación básica.
- **Dependencias:** F3, F4.
- **Cierre:** una sesión se crea y retoma sin perder su contexto.

## F6 — Carrito y presupuesto

- **Objetivo:** controlar gasto en tiempo real.
- **Entregables:** ítems, cantidad, precio, subtotales, total, presupuesto, edición, eliminación y resumen/finalización.
- **Dependencias:** F5.
- **Cierre:** cálculos decimales validados y flujo completo manual.

## F7 — Captura/lectura de producto

- **Objetivo:** acelerar carga opcionalmente.
- **Entregables:** código de barras y/o captura asistida con alternativa manual.
- **Dependencias:** F4, F6.
- **Cierre:** falla de cámara/OCR no bloquea la compra y las imágenes no se persisten por defecto.

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
