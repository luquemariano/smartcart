# SmartCart — Modelo de datos conceptual

## 1. Convenciones

- Cada entidad persistida tiene `id` estable, `created_at` y `updated_at` cuando corresponda.
- Fechas y horas se almacenan en UTC; la UI presenta la zona local de la persona.
- Los importes de líneas y observaciones futuras se reservan como `NUMERIC(19,4)` (o precisión equivalente acordada en su implementación), nunca como `float`. El presupuesto de `ShoppingSession` está definido en F6 como `NUMERIC(19,2)`. Cada importe persistido lleva código de moneda ISO 4217; inicialmente se usa `ARS`.
- Cantidades usan `NUMERIC(19,4)` para admitir fracciones futuras. `unit_code` identifica unidad (por ejemplo `unit`, `kg`, `g`, `l`, `ml`).
- Nombres ingresados manualmente son válidos aunque no exista código de barras.
- `deleted_at` puede usarse para bajas lógicas donde la sincronización futura necesite conservar operaciones.

## 2. Entidades mínimas

### Tablas de Better Auth

Better Auth crea y mantiene sus tablas estándar mediante su migración oficial: `user`, `session`, `account` y `verification`, además de cualquier campo o tabla que requiera la versión instalada. Estas tablas pertenecen exclusivamente a identidad/sesiones y no son entidades de negocio de SmartCart. No se crean versiones paralelas manuales.

El invitado local no tiene fila en estas tablas: su identificador vive en el navegador y no contiene PII. Las futuras entidades de negocio solo podrán asociarse a un usuario autenticado derivado server-side de `session`/`user`.

### User

Cuenta autenticada. Obligatorios: `id`, proveedor/identidad externa o email normalizado, estado y timestamps. Nullable: nombre visible, email verificado y preferencias. No contiene datos de otra cuenta.

### Store

Supermercado utilizado por la persona. En PostgreSQL F3: `id` texto, `owner_user_id` texto, `name`, `normalized_name`, `branch_name` nullable, `normalized_branch_name` nullable, `address` nullable, `latitude`/`longitude` `NUMERIC(9,6)` nullable y `created_at`/`updated_at` con zona horaria. La unicidad es por propietario, nombre normalizado y sucursal normalizada; se recortan y colapsan espacios y se compara en minúsculas con locale `es-AR`.

La tabla no replica ni referencia el esquema de Better Auth: el propietario se valida server-side y se filtra en cada operación. Una creación como invitado vive en `localStorage` bajo su guest ID y no se persiste en PostgreSQL. F3 usa hard delete; al existir historial se deberá evaluar `archived_at`/soft delete.

### Product

Producto reutilizable o creado manualmente. En PostgreSQL F4: `id`, `owner_user_id`, `name`, `normalized_name`, `duplicate_key` y timestamps. Nullable: `brand`/`normalized_brand`, `barcode`/`normalized_barcode`, `quantity_value NUMERIC(19,4)` y `quantity_unit`. La taxonomía inicial de unidades es `g`, `kg`, `ml`, `l` y `unit`, con etiquetas españolas en la UI.

El barcode se almacena como `text`, admite entre 8 y 14 dígitos, preserva ceros iniciales y es opcional. La unicidad del barcode es por propietario cuando existe. La unicidad manual usa nombre, marca, cantidad y unidad normalizados dentro del propietario; no existe catálogo global ni unicidad entre usuarios.

Cantidad y unidad se guardan separadas. La cantidad acepta hasta cuatro decimales y debe ser positiva cuando se informa; la unidad es obligatoria si hay cantidad y viceversa. Helpers puros convierten `kg → g`, `l → ml` y mantienen `unit` como conteo, sin comparar masa, volumen y conteo entre sí. No se persisten precios en F4.

### ShoppingSession

Compra concreta en curso o finalizada. En PostgreSQL F6: `id`, `owner_user_id`, `status`, `started_at`, `created_at`, `updated_at`, `budget_amount NUMERIC(19,2)` nullable y `currency VARCHAR(3) NOT NULL DEFAULT 'ARS'`; `status` es un enum pequeño con `active` y `completed`. Nullable: `store_id` y `finished_at`. Las fechas se almacenan como `timestamp with time zone` en UTC.

`store_id` tiene FK a `stores.id` con `ON DELETE RESTRICT`. La aplicación valida además que el Store pertenezca al mismo `owner_user_id`; no es válido asociar una sesión de A a un Store de B. Un índice único parcial sobre `owner_user_id WHERE status = 'active'` garantiza como máximo una sesión activa por usuario. Una segunda solicitud de inicio devuelve conflicto 409. No existe todavía relación con Product ni ShoppingItem.

El presupuesto es opcional: campo ausente, `null` o entrada vacía significan “sin presupuesto”. Si se informa, debe ser mayor que cero, admitir como máximo dos decimales y no superar el límite representable razonable (`9999999999999999.99`). La API recibe y devuelve strings decimales canónicos, por ejemplo `"100000.50"`; no acepta separadores de miles, coma decimal, valores negativos, cero, `NaN`, `Infinity` ni más de dos decimales. La UI acepta el mismo formato y presenta con `Intl.NumberFormat('es-AR')`. F6 usa `ARS` sin selector de moneda. Una sesión `completed` conserva su presupuesto y no permite modificarlo.

Para invitados, la sesión se guarda en `localStorage` bajo `smartcart_guest_shopping_sessions_v1:<guestId>`, con el mismo estado y fechas ISO UTC. El repositorio permite una sesión activa, finalización idempotente, historial básico y futura limpieza explícita; no crea filas PostgreSQL.

### ShoppingItem

Línea de una compra. Obligatorios: `id`, `shopping_session_id`, nombre o referencia de producto, `quantity`, `unit_code`, `unit_price`, `currency_code` y subtotal calculable. Nullable: `product_id`, barcode capturado, marca, notas y posición. Se conserva el nombre/precio de la línea para que el histórico no cambie si luego se edita el producto maestro.

### PriceObservation

Observación histórica de un precio pagado o registrado. Obligatorios: `id`, propietario, producto o snapshot de nombre, supermercado o snapshot de contexto, importe, moneda, unidad y `observed_at`. Nullable: `shopping_item_id`, cantidad, fuente, notas, ubicación opcional y confianza. No referencia una fotografía persistida.

### ShoppingList

Lista reutilizable. Obligatorios: `id`, `owner_user_id`, nombre y timestamps. Nullable: descripción, estado de archivo y fecha de uso.

### ShoppingListItem

Producto esperado en una lista. Obligatorios: `id`, `shopping_list_id`, nombre o `product_id`, cantidad esperada y unidad. Nullable: notas, cantidad objetivo, orden y estado de completado. Al transformar una lista en compra se copian datos necesarios a la sesión, sin mutar silenciosamente el histórico.

## 3. Relaciones

`User 1—N Store`, `User 1—N Product`, `User 1—N ShoppingSession`, `Store 1—N ShoppingSession`, `ShoppingSession 1—N ShoppingItem`, `User 1—N PriceObservation`, `Store 1—N PriceObservation`, `Product 1—N PriceObservation`, `User 1—N ShoppingList` y `ShoppingList 1—N ShoppingListItem`. `ShoppingItem` y `ShoppingListItem` pueden apuntar a `Product`, pero deben conservar snapshot suficiente cuando el producto sea manual o cambie.

## 4. Integridad y cálculos

`subtotal = quantity × unit_price` se calcula con precisión decimal en servidor y se valida contra entradas. El total de sesión es la suma de subtotales; el presupuesto es opcional y no impide finalizar. No se deben almacenar importes derivados sin una estrategia de recalculación, aunque un total materializado puede optimizar lecturas si se valida transaccionalmente.

## 5. Extensibilidad y privacidad

Se evita acoplar el modelo a una moneda única, una cadena comercial o una fuente externa. La autorización se aplica por `owner_user_id` server-side. Ubicación, marca, categoría y fuentes externas son opcionales. Las imágenes quedan fuera del modelo persistente por defecto.
