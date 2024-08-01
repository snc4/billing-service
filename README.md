# Quick start [dev]

```
cp app/src/local.config.example app/src/local.config.ts

docker compose up

docker compose exec app npm run migration:run

localhost:4001/api - Swagger
```

# One-off/cron scripts
Скрипты для выполнения из командной строки лежат в src/scripts/executables

Запуск скрипта:

```
dev:
docker compose exec app node dist/scripts send-active-subs

test:
docker compose -f docker-compose.test.yml exec app_test node dist/scripts send-active-subs

prod:
docker compose -f docker-compose.prod.yml exec app_prod node dist/scripts send-active-subs
```

# DB

## migrations:

```
status: docker compose exec app npm run migration:show`

create: docker compose exec app npm run migration:create -- src/db/migrations/*name*

run: docker compose exec app npm run migration:run`

revert: docker compose exec app npm run migration:revert
```

# deploy production

```
docker compose -f docker-compose.prod.yml build

docker compose -f docker-compose.prod.yml up -d

logs:
docker compose -f docker-compose.prod.yml logs --follow

migrations:
docker compose -f docker-compose.prod.yml exec app_prod npm run migration:run
```
