# SmartCart — Registro de decisiones (ADR liviano)

## ADR-001 — PWA antes que aplicación nativa

- **Decisión:** comenzar con web responsive mobile-first y evolucionar a PWA.
- **Motivo:** maximiza alcance y velocidad, y cubre el uso desde teléfono sin mantener dos clientes nativos.
- **Consecuencias:** se deben considerar capacidades y límites de navegador, instalación, caché y offline.
- **Estado:** aprobada.

## ADR-002 — Modo invitado permitido

- **Decisión:** una compra completa debe funcionar sin registro.
- **Motivo:** la propuesta de valor debe probarse antes de pedir identidad.
- **Consecuencias:** se necesita estado local y un flujo posterior de migración.
- **Estado:** aprobada.

## ADR-003 — Registro opcional con Google y email

- **Decisión:** ofrecer Google OAuth y cuenta con email.
- **Motivo:** combina baja fricción con una alternativa independiente.
- **Consecuencias:** habrá proveedor de identidad, protección de sesiones, verificación y recuperación.
- **Estado:** aprobada; proveedor concreto abierto.

## ADR-004 — Monolito Next.js inicialmente

- **Decisión:** frontend y backend inicial dentro de Next.js usando App Router, Server Actions y Route Handlers según corresponda.
- **Motivo:** reduce complejidad operativa y mantiene cerca UI, dominio y API.
- **Consecuencias:** se requieren límites modulares y autorización server-side; microservicios solo con evidencia.
- **Estado:** aprobada.

## ADR-005 — PostgreSQL como persistencia remota

- **Decisión:** usar PostgreSQL para datos de cuentas e histórico.
- **Motivo:** integridad relacional, consultas históricas y extensibilidad.
- **Consecuencias:** migraciones, backups y gestión de conexiones forman parte del bootstrap.
- **Estado:** aprobada.

## ADR-006 — Imágenes no persistentes

- **Decisión:** procesar capturas y descartar la imagen; guardar datos estructurados.
- **Motivo:** minimiza privacidad, almacenamiento y riesgo de retención innecesaria.
- **Consecuencias:** OCR/cámara deben tener pipeline efímero y fallback manual.
- **Estado:** aprobada.

## ADR-007 — Offline contemplado desde diseño

- **Decisión:** diseñar almacenamiento local, idealmente IndexedDB, y futura cola de sincronización.
- **Motivo:** la conectividad dentro de supermercados puede ser deficiente.
- **Consecuencias:** identificadores idempotentes, versiones y conflictos deberán diseñarse antes de sincronizar.
- **Estado:** aprobada; implementación posterior a F0.

## ADR-008 — Mobile-first y accesibilidad básica

- **Decisión:** optimizar primero para teléfono y uso con una mano.
- **Motivo:** es el contexto principal de la compra.
- **Consecuencias:** controles grandes, pocos pasos, feedback rápido y pruebas en viewport móvil.
- **Estado:** aprobada.

## ADR-009 — Sin monetización en MVP

- **Decisión:** no incluir pagos, suscripciones, publicidad ni monetización.
- **Motivo:** proteger el foco en control del gasto y aprendizaje del producto.
- **Consecuencias:** no se diseñan planes, billing ni límites comerciales en esta etapa.
- **Estado:** aprobada.

## ADR-010 — Sin promociones, scraping ni IA compleja inicialmente

- **Decisión:** excluir promociones bancarias, scraping masivo, Precios Claros, fuentes externas y IA generativa del MVP.
- **Motivo:** son integraciones y reglas de alto costo que desvían del registro manual confiable.
- **Consecuencias:** comparación inicial basada en datos propios y declarada como tal.
- **Estado:** aprobada.

## ADR-011 — Dinero decimal y moneda explícita

- **Decisión:** almacenar importes con NUMERIC/DECIMAL y código ISO 4217, inicialmente ARS.
- **Motivo:** evita errores de punto flotante y no bloquea futuras monedas.
- **Consecuencias:** servidor, base y UI deben compartir reglas de escala/redondeo.
- **Estado:** aprobada; escala final pendiente de F1.

## ADR-012 — No confiar en identidad del cliente

- **Decisión:** resolver el usuario autenticado server-side y autorizar cada lectura/mutación.
- **Motivo:** impedir acceso cruzado mediante `user_id` manipulado.
- **Consecuencias:** los handlers/actions no aceptan identidad como autoridad y deben probar aislamiento.
- **Estado:** aprobada.
