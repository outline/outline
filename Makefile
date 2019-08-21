up:
	docker-compose up -d redis postgres s3
	docker-compose run --rm outline /bin/sh -c "yarn && yarn sequelize db:migrate"
	docker-compose up outline

build:
	docker-compose build --pull outline

test:
	docker-compose run --rm outline yarn test

watch:
	docker-compose run --rm outline yarn test:watch

destroy:
	docker-compose stop
	docker-compose rm -f

.PHONY: up build destroy test watch # let's go to reserve rules names
