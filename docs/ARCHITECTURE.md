# SmartCart — Arquitectura propuesta

## 1. Principios

Se propone un monolito modular simple, mobile-first y preparado para evolucionar. No se introducen microservicios ni FastAPI por defecto: el costo operativo y de coordinación no se justifica para el MVP.

## 2. Capas

- **Frontend:** Next.js con App Router, TypeScript y Tailwind CSS. Las pantallas deben separar presentación, estado de sesión y acceso a datos.
- **Backend:** capacidades dentro de Next.js mediante Server Actions y Route Handlers según el caso. La lógica de dominio y autorización debe estar en el servidor, no en componentes cliente.
- **Persistencia:** PostgreSQL como fuente de verdad de usuarios registrados, compras finalizadas, listas, productos, supermercados y observaciones.
- **Contratos:** tipos compartidos y validación de entradas en los límites del servidor. La implementación concreta se decidirá en F1, evitando código especulativo en F0.

## 3. PWA y almacenamiento local

La aplicación web deberá evolucionar a PWA instalable con manifest, service worker, iconos y estrategia de caché apropiada. El modo invitado utiliza almacenamiento local del dispositivo; IndexedDB es la opción recomendada para sesiones, ítems y metadatos de recuperación, evitando depender de `localStorage` para estructuras complejas.

El almacenamiento local no debe considerarse automáticamente confiable, permanente ni multi-dispositivo. La UI debe permitir continuar y recuperar una sesión mientras el navegador conserve sus datos.

## 4. Separación invitado/registrado

Una sesión invitada tiene un identificador local y no un `user_id` confiable. No se envía a la nube como historial hasta que la persona autentica y confirma la migración. Una cuenta registrada se identifica server-side desde la sesión autenticada; todas las consultas y mutaciones filtran por el usuario autenticado.

La migración deberá ser idempotente: crear una única representación de la compra, conservar su origen y marcar el estado de sincronización. Los conflictos futuros deben resolverse con una política explícita, no con sobrescrituras silenciosas.

## 5. Autenticación

Se requiere un proveedor compatible con Google OAuth y credenciales/email. La sesión debe usar cookies seguras, expiración y protección contra CSRF según el mecanismo elegido. El proveedor exacto y el esquema de verificación de email quedan para F1; las credenciales y secretos se configuran mediante variables de entorno y nunca se versionan.

## 6. Offline y sincronización futura

El diseño separa el estado editable de una compra del proceso de sincronización. En una evolución posterior, una cola local de operaciones con identificadores idempotentes podrá reintentar altas, cambios y eliminaciones cuando vuelva la conectividad. El servidor necesitará timestamps/versiones y reglas de conflicto.

F0 solo fija el contrato conceptual: lectura/escritura local para continuidad, fuente de verdad remota para cuentas y reconciliación explícita. No se implementa aún el service worker ni la sincronización completa.

## 7. Dinero, privacidad e imágenes

Los importes no se calculan con punto flotante binario. Se recomienda `NUMERIC`/`DECIMAL` en PostgreSQL con escala documentada, junto con código de moneda ISO 4217. La precisión exacta se definirá en DATA_MODEL y se respetará en UI y servidor.

No se almacenan fotografías permanentemente. Una futura captura seguirá `captura → procesamiento → extracción estructurada → descarte`. Si un flujo excepcional requiriera retener una imagen, deberá existir una razón explícita, consentimiento, política de retención y control de acceso.

## 8. Despliegue

Docker encapsulará la aplicación Next.js y, para desarrollo local, PostgreSQL. Producción deberá separar aplicación y base administrada o servicio equivalente cuando sea conveniente, con migraciones controladas, backups, logs sin datos sensibles y variables de entorno. La topología exacta se decidirá en F1/F15.

## 9. Escalabilidad deliberada

Módulos de dominio dentro del monolito (auth, stores, products, shopping, history, lists) permiten crecer sin convertir cada capacidad en un servicio independiente. Se podrá extraer un componente solo ante evidencia de carga, límites operativos o una integración que lo justifique.
