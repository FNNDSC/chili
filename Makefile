# ChILI Development Makefile
#
# Facilitates the development, building, and testing of the ChILI ecosystem:
#   - chili (CLI)
#   - cumin (Core Library)
#   - salsa (Business Logic)
#
# Quick start:
#   make install   - Install dependencies for all projects
#   make build     - Build all projects in the correct order
#   make test      - Run tests for all projects
#   make clean     - Remove build artifacts and node_modules
#   make link      - Link local packages for development
#   make all       - Clean, install, link, build, and test
#
# The Big One:
#   make meal      - The full course: all + link (Setup everything from scratch)
#
# Component shortcuts (builds dependencies automatically):
#   make cumin     - Build cumin
#   make salsa     - Build salsa (and cumin)
#   make chili     - Build chili (and salsa, cumin)

# Directories
CUMIN_DIR := ../cumin
SALSA_DIR := ../salsa
CHILI_DIR := .

.PHONY: help install build test clean link all meal cumin salsa chili install-cumin install-salsa install-chili test-cumin test-salsa test-chili

help:
	@echo "ChILI Ecosystem Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make install    - Install dependencies for cumin, salsa, and chili"
	@echo "  make build      - Build cumin, salsa, and chili (in order)"
	@echo "  make test       - Run tests for all projects"
	@echo "  make clean      - Remove dist/, types/, and node_modules/ directories"
	@echo "  make link       - Link local packages (cumin -> salsa/chili, salsa -> chili)"
	@echo "  make all        - Full reset: clean, install, build, test"
	@echo "  make meal       - The full course: all + link (Setup everything globally)"
	@echo ""
	@echo "Component shortcuts (Builds):"
	@echo "  make cumin"
	@echo "  make salsa"
	@echo "  make chili"

# --- Installation ---

install: install-cumin install-salsa install-chili

install-cumin:
	@echo "Installing cumin dependencies..."
	cd $(CUMIN_DIR) && npm install

install-salsa:
	@echo "Installing salsa dependencies..."
	cd $(SALSA_DIR) && npm install

install-chili:
	@echo "Installing chili dependencies..."
	cd $(CHILI_DIR) && npm install --ignore-scripts

# --- Building (Shortcuts) ---

build: chili

cumin:
	@echo "Building cumin..."
	cd $(CUMIN_DIR) && npm run build

salsa: cumin
	@echo "Building salsa..."
	cd $(SALSA_DIR) && npm run build

chili: salsa
	@echo "Building chili..."
	cd $(CHILI_DIR) && npm run build

# --- Testing ---

test: test-cumin test-salsa test-chili

test-cumin:
	@echo "Testing cumin..."
	cd $(CUMIN_DIR) && npm test

test-salsa:
	@echo "Testing salsa..."
	cd $(SALSA_DIR) && npm test

test-chili:
	@echo "Testing chili..."
	cd $(CHILI_DIR) && npm test

# --- Cleaning ---

clean:
	@echo "Cleaning cumin..."
	cd $(CUMIN_DIR) && rm -rf dist types node_modules package-lock.json
	@echo "Cleaning salsa..."
	cd $(SALSA_DIR) && rm -rf dist types node_modules package-lock.json
	@echo "Cleaning chili..."
	cd $(CHILI_DIR) && rm -rf dist types node_modules package-lock.json
	@echo "Clean complete."

# --- Linking ---
# Useful if you want to develop simultaneously without repeated `npm install` of file: deps
link:
	@echo "Linking packages..."
	cd $(CUMIN_DIR) && npm link
	cd $(SALSA_DIR) && npm link @fnndsc/cumin && npm link
	cd $(CHILI_DIR) && npm link @fnndsc/cumin && npm link @fnndsc/salsa && npm link
	@echo "Linking complete."

all: clean install build test
	@echo "All tasks completed successfully."

meal: all link
	@echo "Order up! The full meal is served. 'chili' is now linked globally."