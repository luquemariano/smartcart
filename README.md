# SmartCart

SmartCart es un asistente personal de compras que busca ayudar a saber cuánto se lleva gastado antes de llegar a la caja. El proyecto se encuentra en **F4 — Productos**; todavía no contiene precios, carrito ni sesión de compra.

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

La pantalla permite continuar con Google cuando ambas credenciales existen, entrar/registrarse con email o usar un invitado local. Luego permite administrar supermercados y un catálogo personal de productos: las cuentas usan PostgreSQL mediante `/api/stores` y `/api/products`, y los invitados usan `localStorage` versionado aislado por guest ID. Sin `BETTER_AUTH_SECRET`, el desarrollo usa un valor explícitamente no productivo; producción falla al iniciar para evitar una configuración insegura.

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

Los tests cubren identidad local, estados de acceso, formulario email, supermercados, productos guest, validación, barcode, conversiones exactas y UI de listado/alta/búsqueda/selección. El CRUD autenticado, búsqueda y aislamiento entre usuarios se verifican contra PostgreSQL en Docker. No se intenta probar OAuth real.

Para crear y aplicar migraciones del dominio: `npm run db:generate` y `npm run db:migrate`. En Docker, ejecutar `docker compose --profile tools run --rm domain-migrate`; PostgreSQL permanece en la red interna y no expone un puerto al host.

## Documentación

La definición de producto, arquitectura, modelo de datos, roadmap, estado actual y decisiones están en [`docs/`](./docs/).
