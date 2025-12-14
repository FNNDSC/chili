# ChILI Development Makefile
#
# Facilitates the development of the ChILI ecosystem using a "Cooking" metaphor.
#
# Menu (Main Commands):
#   make shop    - Clone the necessary ingredients (repositories)
#   make prep    - Install dependencies (npm install)
#   make cook    - Build the code (compile TypeScript)
#   make taste   - Run the tests (jest)
#   make serve   - Link the packages globally for use
#   make scrub   - Clean up the kitchen (remove build artifacts)
#
# The Full Course:
#   make meal    - The Chef's Special: scrub, shop, prep, cook, taste, serve
#
# Standard Aliases (for muscle memory):
#   make install -> make prep
#   make build   -> make cook
#   make test    -> make taste
#   make clean   -> make scrub

# Directories
CUMIN_DIR := ../cumin
SALSA_DIR := ../salsa
CHILI_DIR := .

# Repository URLs
CUMIN_REPO := https://github.com/FNNDSC/cumin.git
SALSA_REPO := https://github.com/FNNDSC/salsa.git

.PHONY: help shop prep cook taste taste-flight serve scrub meal install build test clean link all

help:
	@echo "ChILI Kitchen Makefile 🌶️"
	@echo ""
	@echo "The Menu:"
	@echo "  make shop    - Clone 'cumin' and 'salsa' repositories"
	@echo "  make prep    - Install NPM dependencies for all components"
	@echo "  make cook    - Build (compile) all components in order"
	@echo "  make taste   - Run tests for all components"
	@echo "  make taste-flight - Run tests with coverage (v8 provider) for all components"
	@echo "  make serve   - Link 'chili' globally (npm link)"
	@echo "  make scrub   - Clean build artifacts and node_modules"
	@echo ""
	@echo "The Special:"
	@echo "  make meal    - Full setup: scrub, shop, prep, cook, taste, serve"
	@echo ""
	@echo "Standard Aliases:"
	@echo "  make install, make build, make test, make clean"

# --- Shopping (Cloning) ---

shop: shop-cumin shop-salsa

shop-cumin:
	@if [ ! -d "$(CUMIN_DIR)" ]; then \
		echo "🛒 Shopping for cumin..."; \
		git clone $(CUMIN_REPO) $(CUMIN_DIR); \
	else \
		echo "🔄 Updating cumin..."; \
		(cd $(CUMIN_DIR) && git pull) || echo "⚠️ Failed to update cumin. Please resolve manually."; \
	fi

shop-salsa:
	@if [ ! -d "$(SALSA_DIR)" ]; then \
		echo "🛒 Shopping for salsa..."; \
		git clone $(SALSA_REPO) $(SALSA_DIR); \
	else \
		echo "🔄 Updating salsa..."; \
		(cd $(SALSA_DIR) && git pull) || echo "⚠️ Failed to update salsa. Please resolve manually."; \
	fi

# --- Prep (Install Dependencies) ---

prep: shop prep-cumin prep-salsa prep-chili

prep-cumin:
	@echo "🔪 Prepping cumin (installing deps)..."
	cd $(CUMIN_DIR) && npm install

prep-salsa:
	@echo "🔪 Prepping salsa (installing deps)..."
	cd $(SALSA_DIR) && npm install

prep-chili:
	@echo "🔪 Prepping chili (installing deps)..."
	cd $(CHILI_DIR) && npm install --ignore-scripts

# --- Cook (Build) ---

cook: prep cook-cumin cook-salsa cook-chili

cook-cumin:
	@echo "🍳 Cooking cumin..."
	cd $(CUMIN_DIR) && npm run build

cook-salsa: cook-cumin
	@echo "🍳 Cooking salsa..."
	cd $(SALSA_DIR) && npm run build

cook-chili: cook-salsa
	@echo "🍳 Cooking chili..."
	cd $(CHILI_DIR) && npm run build

# --- Taste (Test) ---

taste: cook taste-cumin taste-salsa taste-chili

taste-cumin:
	@echo "👅 Tasting cumin..."
	cd $(CUMIN_DIR) && npm test

taste-salsa:
	@echo "👅 Tasting salsa..."
	cd $(SALSA_DIR) && npm test

taste-chili:
	@echo "👅 Tasting chili..."
	cd $(CHILI_DIR) && npm test

# Coverage (not part of meal)
taste-flight:
	@echo "👅 Tasting flight (with coverage) cumin..."
	cd $(CUMIN_DIR) && npm test -- --coverage --coverageProvider=v8
	@echo "👅 Tasting flight (with coverage) salsa..."
	cd $(SALSA_DIR) && npm test -- --coverage --coverageProvider=v8
	@echo "👅 Tasting flight (with coverage) chili..."
	cd $(CHILI_DIR) && npm test -- --coverage --coverageProvider=v8

# --- Serve (Link) ---

serve:
	@echo "🍽️  Serving the meal (linking)..."
	cd $(CUMIN_DIR) && npm link
	cd $(SALSA_DIR) && npm link @fnndsc/cumin && npm link
	cd $(CHILI_DIR) && npm link @fnndsc/cumin && npm link @fnndsc/salsa && npm link
	@echo "👨‍🍳 Bon Appétit! 'chili' is ready."

# --- Scrub (Clean) ---

scrub:
	@echo "🧽 Scrubbing the kitchen..."
	@if [ -d "$(CUMIN_DIR)" ]; then \
		echo "  - Scrubbing cumin..."; \
		cd $(CUMIN_DIR) && rm -rf dist types node_modules package-lock.json; \
	else \
		echo "  - Cumin dir not found, skipping scrub."; \
	fi
	@if [ -d "$(SALSA_DIR)" ]; then \
		echo "  - Scrubbing salsa..."; \
		cd $(SALSA_DIR) && rm -rf dist types node_modules package-lock.json; \
	else \
		echo "  - Salsa dir not found, skipping scrub."; \
	fi
	cd $(CHILI_DIR) && rm -rf dist types node_modules package-lock.json
	@echo "✨ Kitchen is clean."

# --- The Big One ---

meal: scrub shop prep cook taste serve

# --- Standard Aliases ---

install: prep
build: cook
test: taste
clean: scrub
link: serve
all: meal
