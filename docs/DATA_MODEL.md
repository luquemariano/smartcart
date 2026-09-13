# SmartCart — Modelo de datos conceptual

## 1. Convenciones

- Cada entidad persistida tiene `id` estable, `created_at` y `updated_at` cuando corresponda.
- Fechas y horas se almacenan en UTC; la UI presenta la zona local de la persona.
- Los importes se almacenan como `NUMERIC(19,4)` (o precisión equivalente acordada en implementación), nunca como `float`. Cada importe persistido lleva `currency_code` ISO 4217; inicialmente se espera `ARS`.
- Cantidades usan `NUMERIC(19,4)` para admitir fracciones futuras. `unit_code` identifica unidad (por ejemplo `unit`, `kg`, `g`, `l`, `ml`).
- Nombres ingresados manualmente son válidos aunque no exista código de barras.
- `deleted_at` puede usarse para bajas lógicas donde la sincronización futura necesite conservar operaciones.

## 2. Entidades mínimas

### User

Cuenta autenticada. Obligatorios: `id`, proveedor/identidad externa o email normalizado, estado y timestamps. Nullable: nombre visible, email verificado y preferencias. No contiene datos de otra cuenta.

### Store

Supermercado utilizado por la persona. Obligatorios: `id`, `owner_user_id` para registros privados, nombre y timestamps. Nullable: dirección, localidad, identificador externo y ubicación aproximada. Una creación como invitado vive localmente hasta migración; no se persiste en PostgreSQL como dato de usuario sin asociación autorizada.

### Product

Producto reutilizable o creado manualmente. Obligatorios: `id`, propietario si es privado, nombre normalizado/presentado y timestamps. Nullable: `barcode`, marca, categoría, unidad de referencia y notas. El código de barras, si existe, debe estar normalizado y no puede ser requisito de creación.

### ShoppingSession

Compra en curso o finalizada. Obligatorios: `id`, estado (`active`, `completed`, eventualmente `cancelled`), moneda, timestamps y origen (`guest`/`account`). Para usuario registrado: `owner_user_id`; para invitado: `local_session_id` fuera de la base o identificador de migración controlado. Nullable: `store_id`, `budget_amount`, `started_at`, `completed_at`, notas y total materializado.

### ShoppingItem

Línea de una compra. Obligatorios: `id`, `shopping_session_id`, nombre o referencia de producto, `quantity`, `unit_code`, `unit_price`, `currency_code` y subtotal calculable. Nullable: `product_id`, barcode capturado, marca, notas y posición. Se conserva el nombre/precio de la línea para que el histórico no cambie si luego se edita el producto maestro.

### PriceObservation

Observación histórica de un precio pagado o registrado. Obligatorios: `id`, propietario, producto o snapshot de nombre, supermercado o snapshot de contexto, importe, moneda, unidad y `observed_at`. Nullable: `shopping_item_id`, cantidad, fuente, notas, ubicación opcional y confianza. No referencia una fotografía persistida.

### ShoppingList

Lista reutilizable. Obligatorios: `id`, `owner_user_id`, nombre y timestamps. Nullable: descripción, estado de archivo y fecha de uso.

### ShoppingListItem

Producto esperado en una lista. Obligatorios: `id`, `shopping_list_id`, nombre o `product_id`, cantidad esperada y unidad. Nullable: notas, cantidad objetivo, orden y estado de completado. Al transformar una lista en compra se copian datos necesarios a la sesión, sin mutar silenciosamente el histórico.

## 3. Relaciones

`User 1—N Store`, `User 1—N Product`, `User 1—N ShoppingSession`, `ShoppingSession 1—N ShoppingItem`, `User 1—N PriceObservation`, `Store 1—N PriceObservation`, `Product 1—N PriceObservation`, `User 1—N ShoppingList` y `ShoppingList 1—N ShoppingListItem`. `ShoppingItem` y `ShoppingListItem` pueden apuntar a `Product`, pero deben conservar snapshot suficiente cuando el producto sea manual o cambie.

## 4. Integridad y cálculos

`subtotal = quantity × unit_price` se calcula con precisión decimal en servidor y se valida contra entradas. El total de sesión es la suma de subtotales; el presupuesto es opcional y no impide finalizar. No se deben almacenar importes derivados sin una estrategia de recalculación, aunque un total materializado puede optimizar lecturas si se valida transaccionalmente.

## 5. Extensibilidad y privacidad

Se evita acoplar el modelo a una moneda única, una cadena comercial o una fuente externa. La autorización se aplica por `owner_user_id` server-side. Ubicación, marca, categoría y fuentes externas son opcionales. Las imágenes quedan fuera del modelo persistente por defecto.
