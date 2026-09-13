# SmartCart

SmartCart es un asistente personal de compras que busca ayudar a saber cuánto se lleva gastado antes de llegar a la caja. El proyecto se encuentra en **F1 — Bootstrap técnico**; todavía no contiene funcionalidades de negocio.

## Requisitos

- Node.js LTS compatible (el entorno verificado usa Node 24).
- npm.
- Docker y Docker Compose para el entorno completo.

## Ejecución local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`. La ruta técnica `http://localhost:3000/api/health` debe devolver `{"status":"ok"}`.

## Ejecución con Docker

```bash
docker compose up --build
```

Esto levanta la aplicación y PostgreSQL en una red interna. Los valores predeterminados de Compose son exclusivamente de desarrollo local; para otros entornos deben proporcionarse variables seguras.

## Comandos principales

```bash
npm run lint
npm run typecheck
npm run format
npm run format:check
npm run build
npm run start
```

F1 no agrega una suite de tests: el roadmap no la exige aún y no hay lógica de negocio que probar. La infraestructura de testing se evaluará junto con los primeros flujos en fases posteriores.

## Documentación

La definición de producto, arquitectura, modelo de datos, roadmap, estado actual y decisiones están en [`docs/`](./docs/).
