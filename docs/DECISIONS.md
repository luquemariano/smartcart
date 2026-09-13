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

## ADR-013 — Better Auth para identidad

- **Decisión:** usar Better Auth con PostgreSQL directo mediante `pg` y sus migraciones oficiales.
- **Motivo:** cubre sesiones, email/password y OAuth sin introducir Prisma/Drizzle ni duplicar tablas estándar.
- **Consecuencias:** se mantienen las tablas de Better Auth separadas del dominio; el comando `auth migrate` debe ejecutarse antes de usar autenticación persistente.
- **Estado:** aprobada.

## ADR-014 — Google como método principal

- **Decisión:** mostrar `Continuar con Google` como CTA principal cuando esté configurado.
- **Motivo:** reduce fricción para crear una cuenta.
- **Consecuencias:** las credenciales son variables de entorno y el callback local debe configurarse externamente; sin credenciales el resto de la app sigue arrancando.
- **Estado:** aprobada.

## ADR-015 — Email/password secundario sin verificación todavía

- **Decisión:** habilitar email/password sin exigir verificación en F2.1.
- **Motivo:** permite probar el flujo sin agregar un proveedor de correo transaccional.
- **Consecuencias:** es una concesión temporal; se debe implementar verificación, recuperación y endurecimiento antes de producción.
- **Estado:** aprobada temporalmente.

## ADR-016 — Invitado local, no Anonymous de Better Auth

- **Decisión:** no usar el plugin Anonymous; persistir solo un ID aleatorio local en el navegador.
- **Motivo:** el invitado no debe crear usuario, sesión ni datos cloud antes de registrarse.
- **Consecuencias:** la futura migración requerirá una rutina explícita, idempotente y server-side; no existe migración real en F2.1.
- **Estado:** aprobada.

## ADR-017 — Autorización derivada de sesión server-side

- **Decisión:** obtener `user.id` desde `auth.api.getSession` en servidor.
- **Motivo:** impedir que un `userId` enviado por el cliente permita acceso cruzado.
- **Consecuencias:** toda futura consulta/mutación deberá filtrar por el usuario de la sesión validada.
- **Estado:** aprobada.

## ADR-018 — Google primero, email secundario

- **Decisión:** ordenar el acceso como Google, invitado y email; Google es el CTA principal para cuentas.
- **Motivo:** reduce fricción sin bloquear el uso básico.
- **Consecuencias:** Google se habilita solo con credenciales; email conserva una interfaz secundaria.
- **Estado:** aprobada.

## ADR-019 — Guest ID se conserva hasta importación explícita

- **Decisión:** autenticarse no borra automáticamente el guest ID; se conserva hasta una futura importación exitosa.
- **Motivo:** los datos locales futuros podrían necesitar asociarse a la nueva cuenta.
- **Consecuencias:** la importación deberá ser idempotente, server-side y autorizada; logout no crea guest automáticamente.
- **Estado:** aprobada.

## ADR-020 — Errores de autenticación traducidos

- **Decisión:** no mostrar mensajes crudos de Better Auth; mapearlos a mensajes breves en español.
- **Motivo:** evitar filtrar detalles internos y reducir confusión en móvil.
- **Consecuencias:** códigos nuevos requieren actualizar el mapeo y mantener un fallback genérico.
- **Estado:** aprobada.
