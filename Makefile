up:
	docker-compose up -d redis postgres s3
	docker-compose run --rm outline bash -c "yarn && yarn sequelize db:migrate"
	docker-compose up outline

build:
	docker-compose build --pull outline

test:
	docker-compose run --rm outline yarn test

destroy:
	docker-compose stop
	docker-compose rm -f

.PHONY: up build destroy # let's go to reserve rules names
