include Makefile.variables
include Makefile.precommit
include Makefile.docker
include example.env

SERVICE = bborbe/node-skeleton

.PHONY: all
all: precommit

.PHONY: install
# Install dependencies from the lockfile
install:
	@npm ci

.PHONY: run
# Run the application
run:
	node src/index.ts

.PHONY: clean-local
# Clean build artifacts (local)
clean-local:
	rm -rf node_modules coverage
