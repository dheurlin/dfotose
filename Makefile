up-prod:
	sudo docker-compose -f docker-compose.yml -f docker-compose-prod.yml up -d

up-dev:
	sudo docker-compose -f docker-compose.yml -f docker-compose-dev.yml up
