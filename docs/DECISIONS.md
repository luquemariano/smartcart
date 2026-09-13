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

## ADR-021 — Drizzle solo para el dominio

- **Decisión:** usar Drizzle ORM/Kit para las tablas de negocio de SmartCart y mantener Better Auth con su adaptador directo `pg` y sus migraciones oficiales.
- **Motivo:** aporta schema tipado, consultas acotadas y migraciones reproducibles sin duplicar el esquema de identidad.
- **Consecuencias:** `db:generate` y `db:migrate` administran solo el dominio; se debe ejecutar primero `auth:migrate` en un entorno nuevo.
- **Estado:** aprobada para F3.

## ADR-022 — Supermercados separados por propietario

- **Decisión:** derivar `owner_user_id` de la sesión server-side, normalizar nombre/sucursal y aplicar unicidad por propietario.
- **Motivo:** impedir acceso cruzado y duplicados accidentales sin imponer un catálogo global.
- **Consecuencias:** dos cuentas pueden registrar el mismo supermercado; ningún `userId` del cliente autoriza una operación.
- **Estado:** aprobada.

## ADR-023 — Guest stores locales y baja física inicial

- **Decisión:** guardar supermercados de invitados bajo `smartcart_guest_stores_v1:<guestId>` y usar hard delete en F3.
- **Motivo:** el invitado no debe crear registros cloud y todavía no existe historial que requiera conservar referencias.
- **Consecuencias:** la migración guest→cuenta y una eventual baja lógica quedan para fases posteriores; la clave local no es un mecanismo de backup.
- **Estado:** aprobada para F3; revisar antes de implementar historial.

## ADR-024 — Catálogo personal de productos en F4

- **Decisión:** cada producto pertenece a un usuario registrado; no se crea catálogo global ni relación con supermercados.
- **Motivo:** mantener el dominio pequeño y permitir que un producto se use después en múltiples supermercados mediante observaciones.
- **Consecuencias:** la futura identidad global y metadata por usuario requerirá una migración explícita; F4 no implementa precios ni historial.
- **Estado:** aprobada para F4.

## ADR-025 — Barcode textual y presentación estructurada

- **Decisión:** guardar barcode como texto opcional y separar `quantity_value` decimal de `quantity_unit`, con unidades iniciales `g`, `kg`, `ml`, `l` y `unit`.
- **Motivo:** preservar ceros iniciales, aceptar EAN/UPC/GTIN razonables y preparar precio por unidad base sin depender de strings libres.
- **Consecuencias:** no se implementa lector real; las conversiones usan aritmética decimal exacta y las categorías incompatibles no se comparan.
- **Estado:** aprobada para F4.

## ADR-026 — Productos guest locales y hard delete inicial

- **Decisión:** usar `smartcart_guest_products_v1:<guestId>`, exponer helpers de lectura/limpieza futura y permitir hard delete mientras no haya referencias.
- **Motivo:** conservar el aislamiento guest y evitar migrar productos antes de definir la estrategia general guest→cuenta.
- **Consecuencias:** el almacenamiento local no es backup; al existir historial se deberá archivar o impedir borrado destructivo.
- **Estado:** aprobada para F4.

## ADR-027 — Una única sesión activa

- **Decisión:** un usuario o invitado puede tener como máximo una `ShoppingSession` en estado `active`; un segundo inicio devuelve conflicto claro.
- **Motivo:** simplificar restauración, continuidad y UX, evitando compras paralelas accidentales.
- **Consecuencias:** finalizar es necesario antes de iniciar otra; PostgreSQL refuerza la regla con un índice único parcial y guest la refuerza en su repositorio.
- **Estado:** aprobada para F5.

## ADR-030 — Presupuesto decimal opcional por sesión

- **Decisión:** agregar `budget_amount NUMERIC(19,2)` nullable a `ShoppingSession` y exponerlo como string decimal canónico. Campo ausente, `null` o entrada vacía significan “sin presupuesto”; si se informa, el valor debe ser mayor que cero, tener como máximo dos decimales y no superar `9999999999999999.99`.
- **Motivo:** evitar pérdida de precisión monetaria y permitir iniciar una compra con o sin presupuesto.
- **Consecuencias:** no se persisten floats; se rechazan coma decimal, separadores de miles, valores negativos, cero, especiales y más de dos decimales. El presupuesto no bloquea la finalización y F6 no calcula totales porque aún no existen ítems.
- **Estado:** aprobada para F6.

## ADR-033 — ShoppingItem conserva snapshot del catálogo

- **Decisión:** `ShoppingItem` guarda `product_id` opcional y snapshots de nombre, marca, barcode y presentación (`product_quantity_value`/`product_quantity_unit`). Un producto manual usa `product_id = null`.
- **Motivo:** el histórico debe conservar lo que se agregó aunque el Product maestro cambie después, y una compra no debe obligar a crear primero un producto de catálogo.
- **Consecuencias:** el servidor construye el snapshot desde el Product autorizado y no acepta snapshots arbitrarios para referencias de catálogo. No se crea automáticamente un Product manual.
- **Estado:** aprobada para F7.

## ADR-034 — Cantidad de ítem decimal y semántica de presentación

- **Decisión:** `quantity` usa `NUMERIC(12,3)`, es positiva y se transporta como string decimal. La presentación del producto describe un envase/unidad; `quantity` indica cuántas presentaciones se agregan.
- **Motivo:** soportar cantidades como `1.5` sin float y sin resolver todavía el dominio completo de venta por peso.
- **Consecuencias:** `Leche 1 L` con `quantity = 3` significa tres envases; el precio y la semántica de kilogramos comprados quedan para fases posteriores.
- **Estado:** aprobada para F7.

## ADR-035 — Deduplicación conservadora de ShoppingItems

- **Decisión:** la misma referencia `product_id` solo tiene una fila por sesión y una nueva alta incrementa `quantity` atómicamente. Los productos manuales no se deduplican.
- **Motivo:** evitar filas repetidas por doble tap sin inventar equivalencias para nombres manuales.
- **Consecuencias:** una unicidad `(shopping_session_id, product_id)` permite el upsert seguro; PostgreSQL mantiene múltiples manuales porque `NULL` no colisiona en la restricción única.
- **Estado:** aprobada para F7.

## ADR-036 — ShoppingItems históricos y Product protegido

- **Decisión:** solo una sesión `active` permite alta, edición y eliminación de ítems. Los ítems de sesiones `completed` solo se listan. `shopping_session_id` y `product_id` usan `ON DELETE RESTRICT`; un Product referenciado devuelve `409` al intentar eliminarlo.
- **Motivo:** impedir pérdida destructiva del historial y conservar integridad entre snapshot y referencias.
- **Consecuencias:** finalizar no borra ni transforma ítems; el snapshot sigue disponible aunque el catálogo se modifique, pero el Product no puede eliminarse mientras exista la referencia.
- **Estado:** aprobada para F7.

## ADR-031 — ARS como moneda inicial del presupuesto

- **Decisión:** agregar `currency VARCHAR(3) NOT NULL DEFAULT 'ARS'`; el servidor asigna `ARS` y no acepta `currency` del cliente. La UI usa `Intl.NumberFormat('es-AR')` sin selector de moneda.
- **Motivo:** entregar una experiencia local coherente sin abrir todavía reglas multi-moneda.
- **Consecuencias:** la columna queda preparada para una futura evolución, pero F6 solo permite ARS y toda sesión existente recibe ese valor por defecto durante la migración.
- **Estado:** aprobada para F6.

## ADR-032 — Presupuesto inmutable al finalizar

- **Decisión:** una sesión `completed` conserva `budget_amount` y `currency`, pero rechaza cambios o eliminación del presupuesto con conflicto `409`.
- **Motivo:** el presupuesto forma parte del contexto histórico de la compra y no debe alterarse después del cierre.
- **Consecuencias:** la edición/eliminación solo está disponible mientras la sesión está activa, tanto para cuentas como para invitados; finalizar sigue siendo posible con o sin presupuesto.
- **Estado:** aprobada para F6.

## ADR-028 — Store nullable y protegido por referencia

- **Decisión:** una sesión puede no tener Store; si lo tiene, debe pertenecer al mismo usuario. La FK usa `ON DELETE RESTRICT`.
- **Motivo:** permitir controlar una compra sin registrar lugar y preservar el contexto de sesiones ya creadas.
- **Consecuencias:** eliminar un Store referenciado devuelve 409; no se introduce soft delete hasta que exista historial que lo justifique.
- **Estado:** aprobada para F5.

## ADR-029 — Sesiones guest locales sin importación automática

- **Decisión:** persistir sesiones guest bajo `smartcart_guest_shopping_sessions_v1:<guestId>`, restaurarlas tras refresh y conservarlas hasta una importación explícita futura.
- **Motivo:** F5 necesita continuidad local sin crear usuario ni datos cloud.
- **Consecuencias:** no existe sincronización ni importación en esta fase; el historial guest es básico y no contiene productos ni precios.
- **Estado:** aprobada para F5.

## ADR-037 — Precio por unidad y cálculo derivado

- **Decisión:** `ShoppingItem.unit_price` usa `NUMERIC(19,2)` nullable y representa el precio de una unidad/presentación del ítem. Subtotales y totales se derivan con `quantity × unit_price`; `null` se muestra como “Precio pendiente” y no suma.
- **Motivo:** habilitar control de gasto sin confundir el precio de presentación con `productQuantityValue` ni introducir todavía un modelo completo de venta por peso.
- **Consecuencias:** no se persisten subtotales/totales; la API transporta importes como strings y los helpers usan enteros escalados, con redondeo half-up a centavos para subtotales no exactos.
- **Estado:** aprobada para F8.

## ADR-040 — Historial paginado y readonly

- **Decisión:** el historial representa solo `ShoppingSession` `completed`, ordenadas por `finishedAt DESC` por defecto, con `limit/offset` y filtro por Store. El detalle usa los snapshots de `ShoppingItem` y no muestra acciones de edición o eliminación.
- **Motivo:** conservar una lectura fiel del pasado y evitar traer historial ilimitado o depender del Product actual.
- **Consecuencias:** una sesión activa no aparece; las consultas autenticadas filtran siempre por `owner_user_id`; guest replica la semántica localmente.
- **Estado:** aprobada para F9.

## ADR-041 — Precios pendientes explícitos en historial

- **Decisión:** si una compra completada contiene ítems sin precio, se muestra `Total registrado`, la cantidad de ítems pendientes y una advertencia. `null` nunca se interpreta como cero.
- **Motivo:** permitir cierre operativo sin presentar un total parcial como definitivo.
- **Consecuencias:** no se puede completar precio ni modificar snapshot desde el historial; cualquier evolución de precios queda para PriceObservation.
- **Estado:** aprobada para F9.

## ADR-038 — Conflicto explícito de precio al fusionar catálogo

- **Decisión:** una referencia de catálogo repetida fusiona cantidad solo cuando el precio coincide (incluyendo ambos `null`). Si difiere, la alta devuelve conflicto y la persona debe editar el ítem existente explícitamente.
- **Motivo:** evitar sobrescrituras invisibles y mantener el comportamiento de doble toque de F7 sin perder control sobre el precio.
- **Consecuencias:** el cliente recibe un mensaje accionable; los ítems manuales siguen sin deduplicarse.
- **Estado:** aprobada para F8.

## ADR-039 — Resumen confiable y umbrales visuales

- **Decisión:** el resumen autenticado se calcula server-side y expone gasto, presupuesto, disponible y porcentaje. El disponible puede ser negativo y el porcentaje superar 100%; la barra visual se acota a 100%. Los estados son normal `<80%`, cerca `80–99.99%` y superado `>=100%`.
- **Motivo:** separar decisiones financieras exactas de la presentación visual y comunicar sobrepresupuesto sin truncarlo.
- **Consecuencias:** guest usa el mismo helper compartido localmente; una sesión sin presupuesto muestra solo gasto.
- **Estado:** aprobada para F8.
