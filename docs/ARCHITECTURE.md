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

Los productos autenticados usan `/api/products` y `/api/products/:id`, con búsqueda opcional `?q=`. El catálogo es personal, no global: cada operación filtra por `owner_user_id`. En F4 se evitó la relación con Store, ShoppingSession, ShoppingItem o PriceObservation.

Las sesiones autenticadas usan `/api/shopping-sessions`, `/active` y `/:id`. `store_id` es nullable y, cuando se informa, el servidor verifica que el Store pertenezca al mismo usuario. PostgreSQL aplica una FK `RESTRICT` y un índice único parcial para impedir más de una sesión `active` por propietario. F5 no relaciona todavía sesiones con productos ni precios.

La eliminación de Store ahora se rechaza cuando existe una sesión asociada, incluso si está `completed`; esto conserva el contexto para el futuro historial sin introducir soft delete prematuramente.

Los helpers server-side obtienen la sesión desde los headers de la request con `auth.api.getSession`. Ningún recurso futuro puede autorizarse con un `userId` recibido del navegador: el propietario debe derivarse de la sesión validada en servidor.

## 6. Offline y sincronización futura

El diseño separa el estado editable de una compra del proceso de sincronización. En una evolución posterior, una cola local de operaciones con identificadores idempotentes podrá reintentar altas, cambios y eliminaciones cuando vuelva la conectividad. El servidor necesitará timestamps/versiones y reglas de conflicto.

F0 fijó el contrato conceptual; F2 añadió identidad, F3 supermercados, F4 catálogo personal de productos y F5 sesiones vacías. No se implementa aún el service worker ni la sincronización completa.

## 7. Dinero, privacidad e imágenes

Los importes no se calculan con punto flotante binario. Se recomienda `NUMERIC`/`DECIMAL` en PostgreSQL con escala documentada, junto con código de moneda ISO 4217. La precisión exacta se definirá en DATA_MODEL y se respetará en UI y servidor.

No se almacenan fotografías permanentemente. Una futura captura seguirá `captura → procesamiento → extracción estructurada → descarte`. Si un flujo excepcional requiriera retener una imagen, deberá existir una razón explícita, consentimiento, política de retención y control de acceso.

## 8. Despliegue

Docker encapsulará la aplicación Next.js y, para desarrollo local, PostgreSQL. Producción deberá separar aplicación y base administrada o servicio equivalente cuando sea conveniente, con migraciones controladas, backups, logs sin datos sensibles y variables de entorno. La topología exacta se decidirá en F1/F15.

## 9. Escalabilidad deliberada

Módulos de dominio dentro del monolito (auth, stores, products, shopping, history, lists) permiten crecer sin convertir cada capacidad en un servicio independiente. Se podrá extraer un componente solo ante evidencia de carga, límites operativos o una integración que lo justifique.
