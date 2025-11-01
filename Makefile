.PHONY: help install dev build preview clean deploy

# Default target
help:
	@echo "Available commands:"
	@echo "  make install  - Install dependencies"
	@echo "  make dev      - Start development server"
	@echo "  make build    - Build for production"
	@echo "  make preview  - Preview production build"
	@echo "  make clean    - Clean build artifacts"
	@echo "  make deploy   - Build and prepare for deployment"

# Install dependencies
install:
	npm install

# Start development server
dev:
	npm run dev

# Build for production
build:
	npm run build

# Preview production build
preview:
	npm run build
	npm run preview

# Clean build artifacts
clean:
	rm -rf dist
	rm -rf node_modules/.vite

# Build and prepare for deployment
deploy: clean build
	@echo "Build complete! Push to main branch to deploy to GitHub Pages."
