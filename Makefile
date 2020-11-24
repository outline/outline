up:
	docker-compose up -d redis postgres s3
	yarn install --pure-lockfile
	yarn sequelize db:migrate
	yarn dev

build:
	docker-compose build --pull outline

test:
	docker-compose up -d redis postgres s3
	yarn sequelize db:drop --env=test
	yarn sequelize db:create --env=test
	yarn sequelize db:migrate --env=test
	yarn test

watch:
	docker-compose up -d redis postgres s3
	yarn sequelize db:drop --env=test
	yarn sequelize db:create --env=test
	yarn sequelize db:migrate --env=test
	yarn test:watch

destroy:
	docker-compose stop
	docker-compose rm -f

.PHONY: up build destroy test watch # let's go to reserve rules names
