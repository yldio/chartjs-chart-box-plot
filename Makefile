NAME := $(lastword $(subst /, ,$(CURDIR)))
PORT=8080

bindir := $(shell yarn bin)

.PHONY: test
test:

XUNIT_DIR := ${CIRCLE_TEST_REPORTS}/tap-xunit
XUNIT := $(bindir)/tap-xunit
XUNIT_OUTPUT := >> ${CIRCLE_TEST_REPORTS}/tap-xunit/xunit-$(NAME)
.PHONY: test-ci
test-ci:
	mkdir -p $(XUNIT_DIR)
	# BABEL_DISABLE_CACHE=1 NODE_ENV=test $(NYC) $(AVA) test/*.js -t | $(XUNIT) $(XUNIT_OUTPUT).xml

.PHONY: install
install:
	yarn install --prefer-offline

.PHONY: install-production
install-production: install

.PHONY: compile
compile: install
	$(bindir)/babel src --out-dir dist --source-maps inline

.PHONY: clean
clean:
	@rm -rf node_modules

.PHONY: lint
lint:
	$(bindir)/eslint .

.PHONY: lint-ci
lint-ci:
	mkdir -p $(XUNIT_DIR)
	-$(bindir)/eslint . --format tap | $(XUNIT) $(XUNIT_OUTPUT)-lint.xml

.PHONY: publish
publish:
	VERSION=$(shell node -p "require('./package.json').version")
	docker build --build-arg VERSION=${VERSION} --build-arg NPM_TOKEN=${NPM_TOKEN} --build-arg CIRCLE_BUILD_NUM=${CIRCLE_BUILD_NUM} -f Dockerfile.build .
