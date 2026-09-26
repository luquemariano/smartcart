# Testing y verificación

## Verificación local

```bash
npm ci
npm run verify
git diff --check
```

`npm run verify` corre secuencialmente `format:check`, `typecheck`, `lint`, `test` y `build`. La suite por defecto contiene pruebas unitarias/componentes; las pruebas que requieren PostgreSQL se saltan si falta `DATABASE_URL`.

## Integración PostgreSQL local

Se requiere Docker Desktop con el daemon activo. El Compose del proyecto expone la base solo dentro de la red interna y usa credenciales de desarrollo locales. No montar volúmenes persistentes para una verificación efímera.

```bash
docker run -d --name smartcart-test-db -e POSTGRES_DB=smartcart -e POSTGRES_USER=smartcart -e POSTGRES_PASSWORD=smartcart_local_only -p 127.0.0.1:54329:5432 postgres:17-alpine
$env:DATABASE_URL = 'postgresql://smartcart:smartcart_local_only@localhost:54329/smartcart'
$env:BETTER_AUTH_SECRET = 'smartcart-local-test-secret-not-for-production'
npm run auth:migrate
npm run db:migrate
npm test
docker rm -f smartcart-test-db
```

El ejemplo ejecuta solo PostgreSQL, sin Compose persistente ni puertos de la aplicación. Esperar a que el contenedor esté healthy antes de migrar. En PowerShell, limpiar variables al terminar con `$env:DATABASE_URL = $null` y `$env:BETTER_AUTH_SECRET = $null`; si un paso falla, retirar el contenedor con `docker rm -f smartcart-test-db`. No conectar pruebas a una base compartida, remota o productiva.

Los tests `*.integration.test.ts` habilitan PostgreSQL mediante `DATABASE_URL`; revisá el total de tests omitidos en Vitest y confirmá que las integraciones se ejecutaron. Las pruebas OAuth y el checklist de navegador/dispositivo offline siguen procesos manuales independientes.

## GitHub Actions

`.github/workflows/verify.yml` corre `npm run verify` en pull requests y pushes a `main`, con PostgreSQL 17 de servicio y migraciones locales antes de la suite para no omitir las integraciones. Los jobs solo tienen permiso de lectura del repositorio y no publican artefactos ni despliegan.
