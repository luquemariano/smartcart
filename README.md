# SmartCart

SmartCart es un asistente personal de compras que busca ayudar a saber cuánto se lleva gastado antes de llegar a la caja. El proyecto se encuentra en **F2.1 — Identidad**; todavía no contiene funcionalidades de compra.

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

La pantalla permite continuar con Google cuando ambas credenciales existen, entrar/registrarse con email o usar un invitado local. El proyecto está en **F2.2 — Experiencia de identidad y acceso**. Sin `BETTER_AUTH_SECRET`, el desarrollo usa un valor explícitamente no productivo; producción falla al iniciar para evitar una configuración insegura.

## Ejecución con Docker

```bash
docker compose up --build
```

Esto levanta la aplicación y PostgreSQL en una red interna. Los valores predeterminados de Compose son exclusivamente de desarrollo local; para otros entornos deben proporcionarse variables seguras.

Con PostgreSQL levantado, aplicar el esquema estándar de Better Auth mediante `docker compose --profile tools run --rm migrate`. El servicio de migración mantiene PostgreSQL dentro de la red interna y no forma parte del runtime standalone de la aplicación. F2.1 no crea tablas de negocio.

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
```

Los tests actuales cubren identidad local, estados de acceso y formulario email. No intentan probar OAuth real.

## Documentación

La definición de producto, arquitectura, modelo de datos, roadmap, estado actual y decisiones están en [`docs/`](./docs/).
