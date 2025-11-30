```
  ____ _     ___ _     ___
 / ___| |__ |_ _| |   |_ _|
| |   | '_ \ | || |    | |
| |___| | | || || |___ | |
 \____|_| |_|___|_____|___|
```
**ChRIS Interactive Line Interface**

`chili` is both a powerful CLI application and a reusable library for interacting with the ChRIS ecosystem. It serves as the "Controller" layer in the ChRIS interface stack, bridging the gap between raw business logic (`salsa`) and user presentation.

## Abstract

This tool is designed for developers and power-users who want to script and control a ChRIS instance from the comfort of their terminal. It maintains a persistent local context, remembering your connection details and current location within the ChRIS filesystem.

## Architecture: The Sandwich Model 🥪

`chili` implements the controller layer of the stack:

1.  **`chili` (Library & CLI)**:
    *   **Commands (`src/commands`)**: Headless controllers that execute logic (via `salsa`) and return typed **Models**. These are consumable by other apps like `chell`.
    *   **Models (`src/models`)**: Explicit interfaces (e.g., `Plugin`, `Feed`, `ListingItem`) defining data structures.
    *   **Views (`src/views`)**: Pure functions that render Models into formatted strings/tables.
    *   **CLI (`src/chefs`, `src/index.ts`)**: The command-line entry point that orchestrates Commands and Views.
2.  **[`salsa`](../salsa/README.md) (Logic)**: The **S**hared **A**pplication **L**ogic and **S**ervice **A**ssets layer. It defines high-level "intents".
3.  **[`cumin`](../cumin/README.md) (Infrastructure)**: The state and operations layer. It manages authentication, persistent context, and low-level API interactions.

## Installation & Development (The Kitchen 👨‍🍳)

ChILI uses a "Cooking" metaphor for its development workflow. The `Makefile` in the `chili/` directory orchestrates the entire ecosystem (`cumin`, `salsa`, `chili`).

### The Full Meal 🥘
To set up the entire environment from scratch (Clone -> Install -> Build -> Test -> Link), simply run:

> **Note:** It is highly recommended to use [NVM (Node Version Manager)](https://github.com/nvm-sh/nvm) to manage your Node.js installation. This allows `make meal` to link packages globally without requiring `sudo`.

```bash
cd chili
make meal
```

### The Menu (Individual Commands)
You can also run individual steps:

*   **`make shop`**: Clones the `cumin` and `salsa` repositories if they are missing.
*   **`make prep`**: Installs NPM dependencies for all projects (`npm install`).
*   **`make cook`**: Builds (compiles) all projects (`npm run build`).
*   **`make taste`**: Runs the tests (`npm test`).
*   **`make serve`**: Links the packages globally so you can run `chili` anywhere.
*   **`make scrub`**: Cleans up build artifacts and `node_modules`.

## Core Features

-   **Context-Aware**: Remembers your active server, user, and working directory.
-   **Chefs Shell**: Familiar Unix-like commands (`chili chefs ls`, `cd`, `pwd`, `mkdir`, `touch`, `upload`) for browsing and managing the ChRIS filesystem.
-   **Library Mode**: Exports strict-typed commands and views for consumption by `chell`.
-   **Recursive Upload**: Robust directory uploading via `chili chefs upload`.

## Quick Start

1.  **Connect to ChRIS:**
    ```bash
    chili connect <URL> --user <USERNAME> --password <PASSWORD>
    ```

2.  **Explore with Chefs:**
    ```bash
    # List root directory
    chili chefs ls /

    # Create a folder
    chili chefs mkdir /home/user/new_project
    ```

3.  **Upload Data:**
    ```bash
    # Upload local directory recursively
    chili chefs upload ./local_data /home/user/study/
    ```

4.  **Plugins & Feeds:**
    ```bash
    chili plugins list
    chili feeds list
    ```

---
_-30-_