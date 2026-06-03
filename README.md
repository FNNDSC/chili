```
  ____ _     ___ _     ___
 / ___| |__ |_ _| |   |_ _|
| |   | '_ \ | || |    | |
| |___| | | || || |___ | |
 \____|_| |_|___|_____|___|
```
**ChILI handles Intelligent Line Interactions**

`chili` is both a standalone CLI and a reusable library for interacting with the ChRIS ecosystem. It serves as the controller layer in the ChRIS interface stack, bridging raw business logic (`salsa`) and user presentation.

## Abstract

Designed for developers and power-users who want to script and control a ChRIS instance from the terminal. Maintains a persistent local context: connection details, active user, and current ChRIS working directory survive across invocations.

## Architecture: The Sandwich Model

`chili` implements the controller layer:

1.  **`chili` (Library & CLI)**:
    *   **Commands (`src/commands`)**: Headless controllers that execute logic via `salsa` and return typed **Models**. Consumed directly by `chell`.
    *   **Models (`src/models`)**: Explicit interfaces (`Plugin`, `Feed`, `ListingItem`, etc.) defining data structures.
    *   **Views (`src/views`)**: Pure functions that render Models into formatted strings and tables.
    *   **CLI (`src/index.ts`)**: Commander.js entry point orchestrating Commands and Views.
2.  **[`salsa`](../salsa/README.md) (Logic)**: Shared Application Logic and Service Assets — high-level business intents.
3.  **[`cumin`](../cumin/README.md) (Infrastructure)**: State and connection layer — authentication, context persistence, low-level API.

## Installation & Development

### Full build (all layers)

```bash
cd chili
make meal
```

### Individual steps

| Target | Action |
|--------|--------|
| `make shop` | Clone `cumin` and `salsa` if missing |
| `make prep` | `npm install` across all packages |
| `make cook` | Build (compile TypeScript) all packages |
| `make taste` | Run tests |
| `make serve` | Link packages globally |
| `make scrub` | Clean build artifacts and `node_modules` |

> Use [NVM](https://github.com/nvm-sh/nvm) to avoid needing `sudo` for global links.

## Core Features

- **Context-Aware**: Remembers active server, user, and working directory between invocations.
- **Library Mode**: Exports strictly-typed commands and views consumed by `chell` and other frontends.
- **Resource Commands**: Full CRUD for plugins, feeds, files, links, pipelines, compute resources, groups, tags, and more.
- **Plugin Management**: Search, install (from peer store or Docker), and register plugins.
- **Feed Sub-resources**: Notes and comments on feeds (create, read, update, delete).

## Quick Start

**Connect to ChRIS:**
```bash
chili connect <URL> --user <USERNAME> --password <PASSWORD>
```

**Plugins:**
```bash
chili plugins list
chili plugins list --search "name:pl-dircopy"
chili plugin run pl-dircopy-v2.1.0 --args "..."
```

**Feeds:**
```bash
chili feeds list
chili feeds list --user rudolphpienaar
chili feed note 42
chili feed comments 42
```

**Store / plugin install:**
```bash
chili plugins add pl-fshack               # auto-discovers compute resources
chili plugins add pl-fshack --compute ares,argentum
```

**Files:**
```bash
chili files list --path /home/user/uploads
```

---
_-30-_
