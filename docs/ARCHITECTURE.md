# SmartCart — Arquitectura propuesta

## 1. Principios

Se propone un monolito modular simple, mobile-first y preparado para evolucionar. No se introducen microservicios ni FastAPI por defecto: el costo operativo y de coordinación no se justifica para el MVP.

## 2. Capas

- **Frontend:** Next.js con App Router, TypeScript y Tailwind CSS. Las pantallas deben separar presentación, estado de sesión y acceso a datos.
- **Backend:** capacidades dentro de Next.js mediante Server Actions y Route Handlers según el caso. La lógica de dominio y autorización debe estar en el servidor, no en componentes cliente.
- **Persistencia:** PostgreSQL como fuente de verdad de usuarios registrados y datos cloud. Better Auth conserva su adaptador directo `pg`; Drizzle gestiona las tablas de dominio de SmartCart desde F3.
- **Contratos:** tipos compartidos y validación Zod en los límites del servidor. Las Route Handlers de stores derivan el propietario de la sesión y nunca aceptan `userId` del cliente como autoridad.

## 3. PWA y almacenamiento local

La aplicación web deberá evolucionar a PWA instalable con manifest, service worker, iconos y estrategia de caché apropiada. El modo invitado utiliza almacenamiento local del dispositivo; IndexedDB es la opción recomendada para sesiones, ítems y metadatos de recuperación, evitando depender de `localStorage` para estructuras complejas.

El almacenamiento local no debe considerarse automáticamente confiable, permanente ni multi-dispositivo. La UI debe permitir continuar y recuperar una sesión mientras el navegador conserve sus datos.

En F3 los supermercados del invitado se guardan temporalmente en `localStorage` bajo `smartcart_guest_stores_v1:<guestId>`. En F4 los productos guest usan `smartcart_guest_products_v1:<guestId>`. Cada tipo de entidad y cada invitado tiene su propia clave; no se usa PostgreSQL. La estructura podrá migrar a IndexedDB cuando el volumen y la sincronización lo justifiquen.

## 4. Separación invitado/registrado

Una sesión invitada tiene un identificador local y no un `user_id` confiable. No se envía a la nube como historial hasta que la persona autentica y confirma la migración. Una cuenta registrada se identifica server-side desde la sesión autenticada; todas las consultas y mutaciones filtran por el usuario autenticado.

La migración deberá ser idempotente: crear una única representación de la compra, conservar su origen y marcar el estado de sincronización. Los conflictos futuros deben resolverse con una política explícita, no con sobrescrituras silenciosas.

## 5. Identidad y autenticación

Better Auth es la infraestructura de identidad de la aplicación y usa PostgreSQL mediante su adaptador directo basado en `pg`/Kysely. Sus tablas estándar (`user`, `session`, `account`, `verification` y las que la versión requiera) son distintas de las futuras tablas de negocio. Se aplican mediante el comando oficial `auth migrate`; no se mantienen copias manuales.

Google OAuth es el método principal de cuenta y solo se habilita cuando existen `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`. Email/password es la alternativa secundaria. La verificación de email queda deshabilitada temporalmente porque todavía no hay proveedor transaccional; debe endurecerse antes de producción. El callback local es `http://localhost:3000/api/auth/callback/google`.

El invitado es deliberadamente local: no crea usuario, sesión Better Auth ni registro PostgreSQL. `localStorage` guarda únicamente un identificador aleatorio seguro sin PII. No se envía automáticamente al servidor. La identidad puede resetearse explícitamente.

Mientras una cuenta se autentica, el guest ID no se elimina automáticamente. `getPendingGuestIdentity()` permite que una futura rutina de importación lo lea y `clearGuestIdentityAfterImport()` lo elimine únicamente después de una importación explícita y exitosa. Logout solo cierra la sesión Better Auth; no crea una identidad invitada nueva.

Los supermercados autenticados usan `/api/stores` y `/api/stores/:id`. Cada operación filtra por `owner_user_id` derivado de la sesión. Los supermercados se eliminan físicamente en F3; cuando exista historial se deberá evaluar archivo o baja lógica para preservar referencias.

Los productos autenticados usan `/api/products` y `/api/products/:id`, con búsqueda opcional `?q=`. El catálogo es personal, no global: cada operación filtra por `owner_user_id`. F7 puede referenciar un Product desde una sesión, pero conserva snapshot de nombre, marca, barcode y presentación; el Product no se puede eliminar mientras tenga referencias históricas.

Las sesiones autenticadas usan `/api/shopping-sessions`, `/active` y `/:id`. `store_id` es nullable y, cuando se informa, el servidor verifica que el Store pertenezca al mismo usuario. PostgreSQL aplica una FK `RESTRICT` y un índice único parcial para impedir más de una sesión `active` por propietario. F6 agrega presupuesto opcional como `NUMERIC(19,2)` nullable y `currency VARCHAR(3) NOT NULL DEFAULT 'ARS'`; la API lo transporta como string decimal y no acepta moneda del cliente. F7 agrega `/api/shopping-sessions/:id/items` para listar/agregar y `/api/shopping-items/:id` para editar/eliminar; F8 agrega precio unitario nullable y devuelve en la misma respuesta un resumen derivado confiable. Cada operación comprueba propietario y estado activo; una sesión completada conserva sus ítems de forma inmutable.

La eliminación de Store ahora se rechaza cuando existe una sesión asociada, incluso si está `completed`; esto conserva el contexto para el futuro historial sin introducir soft delete prematuramente.

Los helpers server-side obtienen la sesión desde los headers de la request con `auth.api.getSession`. Ningún recurso futuro puede autorizarse con un `userId` recibido del navegador: el propietario debe derivarse de la sesión validada en servidor.

## 6. Offline y sincronización futura

El diseño separa el estado editable de una compra del proceso de sincronización. En una evolución posterior, una cola local de operaciones con identificadores idempotentes podrá reintentar altas, cambios y eliminaciones cuando vuelva la conectividad. El servidor necesitará timestamps/versiones y reglas de conflicto.

F0 fijó el contrato conceptual; F2 añadió identidad, F3 supermercados, F4 catálogo personal de productos, F5 sesiones, F6 presupuesto y F7 ítems. No se implementa aún el service worker ni la sincronización completa.

## 7. Dinero, privacidad e imágenes

Los importes no se calculan con punto flotante binario. El presupuesto F6 usa `NUMERIC(19,2)` en PostgreSQL y se valida/transporta como string decimal canónico en servidor y repositorio guest. La conversión a `Number` solo ocurre en el límite de presentación de `Intl.NumberFormat`, nunca para persistir ni para calcular. La entrada usa punto decimal sin separadores de miles, rechaza cero, negativos, valores especiales y más de dos decimales; `ARS` es la moneda fija inicial y se muestra con locale `es-AR`.

No se almacenan fotografías permanentemente. Una futura captura seguirá `captura → procesamiento → extracción estructurada → descarte`. Si un flujo excepcional requiriera retener una imagen, deberá existir una razón explícita, consentimiento, política de retención y control de acceso.

## 8. Despliegue

Docker encapsulará la aplicación Next.js y, para desarrollo local, PostgreSQL. Producción deberá separar aplicación y base administrada o servicio equivalente cuando sea conveniente, con migraciones controladas, backups, logs sin datos sensibles y variables de entorno. La topología exacta se decidirá en F1/F18.

## 9. Escalabilidad deliberada

Módulos de dominio dentro del monolito (auth, stores, products, shopping, history, lists) permiten crecer sin convertir cada capacidad en un servicio independiente. Se podrá extraer un componente solo ante evidencia de carga, límites operativos o una integración que lo justifique.

## F8 — Precios y resumen de compra

`ShoppingItem.unitPrice` es nullable y se persiste como `NUMERIC(19,2)`. Las rutas autenticadas derivan subtotal, total, disponible y porcentaje mediante `lib/shopping-summary.ts`; la UI no persiste cálculos ni usa aritmética flotante para dinero. El repositorio guest reutiliza los mismos helpers. Un alta de catálogo con precio distinto al de la línea existente devuelve conflicto `409`; la edición explícita vía PATCH permite corregirlo. Las sesiones completadas exponen sus snapshots, cantidades y precios en modo lectura.

## F9 — Historial derivado

`GET /api/shopping-history` lista únicamente sesiones `completed` con `limit` (20 por defecto, máximo 50), `offset`, `sort=newest|oldest` y `storeId`. El servidor filtra siempre por el usuario autenticado, obtiene una página de sesiones y carga sus ítems en una segunda consulta acotada, evitando N+1. `GET /api/shopping-history/:id` devuelve el detalle readonly y usa los snapshots de `ShoppingItem`; una sesión activa o de otro propietario responde como no encontrada. Guest implementa la misma vista, filtro, orden, paginación y derivación desde localStorage sin backend.

## F10 — Comparaciones históricas derivadas

El detalle de `GET /api/shopping-history/:id` incluye la comparación contra la compra `completed` anterior más reciente, priorizando el mismo Store y usando una consulta de sesiones más una consulta batch de ítems. Si no hay una compra previa, la UI muestra datos insuficientes; monedas distintas no se comparan monetariamente y precios faltantes producen comparación parcial. Los porcentajes y diferencias monetarias usan los helpers exactos existentes.

El detalle también expone `productComparisons`, limitado a productos con `product_id` y snapshots de presentación compatibles. No se convierten unidades ni se usa el Product actual. `GET /api/shopping-history/overview` devuelve un resumen por Store derivado del historial propio, con gasto y ticket promedio solo para compras completas y de moneda compatible; no representa precios generales del supermercado. Guest replica estas reglas con datos locales.

F11 agrega `/api/shopping-lists` y sus rutas de ítems. Las cuentas se autorizan exclusivamente con `session.user.id`; los invitados usan repositorios `localStorage` versionados por guest ID. La importación de una lista reutiliza las reglas de alta de ShoppingItem.

F12 agrega `POST /api/guest-import`. El cliente construye un snapshot desde los repositorios guest; la API nunca lee `localStorage`, deriva el propietario de la sesión y procesa Stores, Products, ShoppingSessions, ShoppingItems, ShoppingLists e ítems en una única transacción. Una sesión activa guest en conflicto con otra activa de la cuenta aborta toda la operación y deja los datos locales intactos.

F13 agrega captura de barcode dentro de una ShoppingSession activa. `BarcodeDetector` y `getUserMedia` se usan solo en memoria; se solicita la cámara trasera con `facingMode: environment` y existe fallback manual. El barcode se valida como string decimal de 8–14 dígitos, sin convertirlo a número ni calcular checksum. El lookup exacto y el alta posterior reutilizan Product y ShoppingItem: producto conocido conserva su snapshot y producto nuevo exige nombre y precio antes de crear Product. La ausencia de sesión no inicia una compra automáticamente.

F14 agrega `price_observations` y está completada. La finalización autenticada actualiza sesión y crea las observaciones elegibles dentro de la misma transacción; el índice único parcial por `shopping_item_id` hace idempotentes los reintentos. Product y Store usan `RESTRICT`; sesión e ítem usan `SET NULL` para conservar el histórico si se elimina la entidad de compra. El endpoint `/api/products/:id/prices` filtra por owner y ordena descendente. Guest replica el historial en localStorage y F12 lo reconstruye server-side al importar sesiones completadas.

F15 agrega la comparación de una `ShoppingList` entre Stores propios. `lib/shopping-list-comparison.ts` es un calculador puro compartido por API autenticada y guest: toma el latest `PriceObservation` ARS por Product+Store, calcula subtotales y totales con dinero exacto, informa cobertura y excluye ítems manuales del total. La API carga el detalle con ownership, obtiene precios en batch y consulta únicamente Stores relevantes del propietario; no requiere migración ni acepta owner desde el cliente. Un ganador solo existe con al menos dos Stores completos y sin empate. Promociones y costos externos quedan para F16.

F16 agrega `promotions` mediante la migración append-only `0009`. La promoción siempre referencia Product y Store del propietario y no reemplaza el precio base observado. El calculador puro aplica una única promoción vigente (percentage, fixed_price o buy_n_pay_m), eligiendo el menor subtotal efectivo con dinero exacto; las cantidades decimales no activan N x M. Promociones bancarias, costos de viaje y offline quedan fuera de esta fase.
