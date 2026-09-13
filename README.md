# SmartCart

SmartCart es un asistente personal de compras que busca ayudar a saber cuánto se lleva gastado antes de llegar a la caja. El proyecto se encuentra en **F15 — Comparación de listas entre supermercados** (completada y cerrada).

## Requisitos

- Node.js LTS compatible (el entorno verificado usa Node 24).
- npm.
- Docker y Docker Compose para el entorno completo.

## Ejecución local

```bash
npm install
npm run dev
```

Copiar `.env.example` a `.env.local` si se va a usar PostgreSQL local y generar un secret con `openssl rand -base64 32`. Abrir `http://localhost:3000`. La ruta técnica `http://localhost:3000/api/health` debe devolver `{"status":"ok"}`.

La pantalla permite continuar con Google cuando ambas credenciales existen, entrar/registrarse con email o usar un invitado local. Luego permite administrar supermercados, productos, listas reutilizables y sesiones de compra: las cuentas usan PostgreSQL mediante `/api/stores`, `/api/products`, `/api/shopping-lists` y `/api/shopping-sessions`; los invitados usan `localStorage` versionado aislado por guest ID. Las listas son plantillas y al importarse crean ítems independientes sin precios. Sin `BETTER_AUTH_SECRET`, el desarrollo usa un valor explícitamente no productivo; producción falla al iniciar para evitar una configuración insegura.

Durante una compra activa se puede agregar un producto por código de barras. Se prefiere `BarcodeDetector` nativo y la cámara trasera (`facingMode: environment`); si no están disponibles, se ingresa el código manualmente. El código se conserva como string de 8 a 14 dígitos, incluyendo ceros iniciales. No se suben ni persisten imágenes. Un producto desconocido requiere nombre y precio explícitos antes de crearse y agregarse a la compra.

Al finalizar una compra con Store, los ítems de catálogo que tienen precio generan `PriceObservation`, el historial normalizado Product + Store + fecha. Los ítems manuales, compras sin Store y precios faltantes se omiten. El backfill histórico es explícito y reejecutable con `npm run db:backfill-price-observations` después de aplicar la migración de dominio.

F14 — PriceObservation está completada y validada contra PostgreSQL real. F15 — Comparación de listas entre supermercados también está completada: usa únicamente PriceObservation conocidas, latest por Product+Store, dinero exacto, cobertura explícita, ownership y el mismo calculador para guest. La siguiente fase es F16 — Promociones / costo real opcional; todavía no fue iniciada.

## Ejecución con Docker

```bash
docker compose up --build
```

Esto levanta la aplicación y PostgreSQL en una red interna. Los valores predeterminados de Compose son exclusivamente de desarrollo local; para otros entornos deben proporcionarse variables seguras.

Con PostgreSQL levantado, aplicar el esquema estándar de Better Auth mediante `docker compose --profile tools run --rm migrate` y el dominio SmartCart mediante `docker compose --profile tools run --rm domain-migrate`. El servicio de migración mantiene PostgreSQL dentro de la red interna y no forma parte del runtime standalone de la aplicación.

## Comandos principales

```bash
npm run lint
npm run typecheck
npm run format
npm run format:check
npm run build
npm run start
npm test
npm run auth:migrate
npm run db:generate
npm run db:migrate
```

Los tests cubren identidad local, estados de acceso, formulario email, supermercados, productos guest, validación, barcode, conversiones exactas, dinero decimal, subtotales/resúmenes, comparación histórica exacta, historial derivado, sesiones guest con presupuesto, ítems guest y UI de listado/alta/búsqueda/selección/inicio/ítems/edición/finalización/detalle readonly. El CRUD autenticado, búsqueda, sesiones, presupuesto, ítems, snapshots, precios, historial, deduplicación segura, aislamiento entre usuarios y protección de Store/Product referenciados se verifican contra PostgreSQL en Docker. No se intenta probar OAuth real.

Para crear y aplicar migraciones del dominio: `npm run db:generate` y `npm run db:migrate`. En Docker, ejecutar `docker compose --profile tools run --rm domain-migrate`; PostgreSQL permanece en la red interna y no expone un puerto al host.

## Documentación

La definición de producto, arquitectura, modelo de datos, roadmap, estado actual y decisiones están en [`docs/`](./docs/).
