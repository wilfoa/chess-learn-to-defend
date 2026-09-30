# On Guard! - Makefile

.PHONY: build test serve clean help

# Build the standalone HTML file
build:
	@echo "🔨 Building standalone HTML file..."
	@node build-standalone.js

# Run tests
test:
	@echo "🧪 Running tests..."
	@npm run test

# Run tests with UI
test-ui:
	@echo "🧪 Running tests with UI..."
	@npm run test:ui

# Serve the application locally
serve:
	@echo "🚀 Starting local server..."
	@npm run serve

# Clean generated files
clean:
	@echo "🧹 Cleaning generated files..."
	@rm -f chess-game-standalone.html

# Show help
help:
	@echo "On Guard! - Available commands:"
	@echo ""
	@echo "  make build     - Build standalone HTML file"
	@echo "  make test      - Run automated tests"
	@echo "  make test-ui   - Run tests with UI"
	@echo "  make serve     - Start local development server"
	@echo "  make clean     - Remove generated files"
	@echo "  make help      - Show this help message"
	@echo ""
	@echo "Files:"
	@echo "  index.html                    - Main game file (separate files)"
	@echo "  chess-game-standalone.html    - Standalone version (generated)"
	@echo ""

# Default target
all: build