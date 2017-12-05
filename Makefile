up:
	docker-compose up -d redis postgres s3
	docker-compose run --rm outline yarn sequelize db:migrate
	docker-compose up outline

build:
	docker-compose build --pull outline

destroy:
	docker-compose stop
	docker-compose rm -f

.PHONY: up build destroy # let's go to reserve rules names
