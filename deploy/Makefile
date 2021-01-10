PROJECT := gcr.io/utility-vista-247019/
IMAGE_NAME := mercurymessenger
VERSION := $(shell git rev-parse HEAD)

.PHONY: image push

image:
	cd .. && quasar build -T spa
	docker build -f ./Dockerfile --no-cache .. -t $(PROJECT)$(IMAGE_NAME):latest
	docker tag $(PROJECT)$(IMAGE_NAME):latest $(PROJECT)$(IMAGE_NAME):$(VERSION)

push: image
	docker push $(PROJECT)$(IMAGE_NAME):$(VERSION)
	docker push $(PROJECT)$(IMAGE_NAME):latest

deploy: push
	kubectl patch deploy mercurymessenger -p '{"spec":{"template":{"spec":{"containers":[{"name":"mercurymessenger","image":"$(PROJECT)$(IMAGE_NAME):$(VERSION)"}]}}}}'
