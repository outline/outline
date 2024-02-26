up:
	docker compose up -d redis postgres
	yarn install-local-ssl
	yarn install --pure-lockfile
	yarn dev:watch

build:
	docker compose build --pull outline

test:
	docker compose up -d redis postgres
	NODE_ENV=test yarn sequelize db:drop
	NODE_ENV=test yarn sequelize db:create
	NODE_ENV=test yarn sequelize db:migrate
	yarn test

watch:
	docker compose up -d redis postgres
	NODE_ENV=test yarn sequelize db:drop
	NODE_ENV=test yarn sequelize db:create
	NODE_ENV=test yarn sequelize db:migrate
	yarn test:watch

destroy:
	docker compose stop
	docker compose rm -f

.PHONY: up build destroy test watch # let's go to reserve rules names
