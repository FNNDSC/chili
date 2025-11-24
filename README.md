# ChILI (ChRIS Interactive Line Interface) 🌶️

`chili` is a powerful, interactive command-line interface (CLI) for managing and interacting with a ChRIS instance. It provides a rich set of commands for navigating, managing, and transferring data between your local machine and a ChRIS system.

## Abstract

This tool is designed for developers and power-users who want to script and control a ChRIS instance from the comfort of their terminal. It maintains a persistent local context, remembering your connection details and current location within the ChRIS filesystem, allowing for a fluid and efficient workflow.

## Architecture: The Sandwich Model 🥪

`chili` is the top layer of a robust "Sandwich" architecture designed for modularity and reusability:

1.  **`chili` (Presentation)**: The user-facing CLI. It parses commands, formats output (tables, grids), and manages user interaction. It contains the **`chefs`** module, which provides a familiar Unix-like shell experience (`ls`, `cd`, `pwd`, `mkdir`).
2.  **[`salsa`](../salsa/README.md) (Logic)**: The **S**hared **A**pplication **L**ogic and **S**ervice **A**ssets layer. It defines high-level "intents" (e.g., `feed_create`, `files_touch`) that are independent of the specific frontend.
3.  **[`cumin`](../cumin/README.md) (Infrastructure)**: The state and operations layer. It manages authentication, persistent context, and low-level API interactions.

This design ensures that the core logic in `salsa` can be reused in future web or mobile interfaces.

## Installation & Development (The Kitchen 👨‍🍳)

ChILI uses a "Cooking" metaphor for its development workflow. The `Makefile` in the `chili/` directory orchestrates the entire ecosystem (`cumin`, `salsa`, `chili`).

### The Full Meal 🥘
To set up the entire environment from scratch (Clone -> Install -> Build -> Test -> Link), simply run:

> **Note:** It is highly recommended to use [NVM (Node Version Manager)](https://github.com/nvm-sh/nvm) to manage your Node.js installation. This allows `make meal` to link packages globally without requiring `sudo` or running into `EACCES` permission errors.

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

Standard aliases are also available:
*   `make install` -> `make prep`
*   `make build`   -> `make cook`
*   `make test`    -> `make taste`
*   `make clean`   -> `make scrub`

## Core Features

-   **Context-Aware**: Remembers your active server, user, and working directory. You can "cd" into a ChRIS folder and stay there.
-   **Searchable**: Powerful query syntax (`name:demo, version:2.0`) for finding resources without memorizing IDs.
-   **Chefs Shell**: Familiar Unix-like commands (`chili chefs ls`, `cd`, `pwd`, `mkdir`, `touch`) for browsing and managing the ChRIS filesystem intuitively.
-   **Advanced File Ops**: Create files with content (`chili file create`), view remote files (`chili file view`), and upload data seamlessly.
-   **Scriptable**: Clean, predictable command structure for automation.

## Quick Start

After building and linking the project (`make meal`), you can run `chili` directly from your terminal.

1.  **Connect to ChRIS:**
    First, connect to your ChRIS instance. This command stores your session details for future commands.
    ```bash
    chili connect <URL> --user <USERNAME> --password <PASSWORD>
    ```

2.  **Explore with Chefs:**
    Use the shell-like interface to look around.
    ```bash
    # List root directory
    chili chefs ls /

    # Create a folder
    chili chefs mkdir /home/user/new_project

    # Change working directory
    chili chefs cd /home/user/new_project
    ```

3.  **Create & Upload Data:**
    Create files directly or upload them.
    ```bash
    # Create a text file
    chili file create notes.txt --content "Research data for Project X"

    # Upload local data
    chili file create data.csv --from-file ./local/data.csv
    ```

4.  **Create a Feed:**
    Create a new analysis feed using the data you just created.
    ```bash
    chili feed create --dirs "/home/user/new_project" --params "title:My Analysis"
    ```

---
_-30-_
