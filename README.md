# ChILI (ChRIS Interactive Line Interface) 🌶️

`chili` is a powerful, interactive command-line interface (CLI) for managing and interacting with a ChRIS instance. It provides a rich set of commands for navigating, managing, and transferring data between your local machine and a ChRIS system.

## Abstract

This tool is designed for developers and power-users who want to script and control a ChRIS instance from the comfort of their terminal. It maintains a persistent local context, remembering your connection details and current location within the ChRIS filesystem, allowing for a fluid and efficient workflow.

## Architecture: The Sandwich Model 🥪

`chili` is the top layer of a robust "Sandwich" architecture designed for modularity and reusability:

1.  **`chili` (Presentation)**: The user-facing CLI. It parses commands, formats output (tables, grids), and manages user interaction. It contains the **`chefs`** module, which provides a familiar Unix-like shell experience (`ls`, `cd`, `pwd`).
2.  **[`salsa`](../salsa/README.md) (Logic)**: The shared application logic layer. It defines high-level "intents" (e.g., `feed_create`, `files_touch`) that are independent of the specific frontend.
3.  **[`cumin`](../cumin/README.md) (Infrastructure)**: The state and operations layer. It manages authentication, persistent context, and low-level API interactions.

This design ensures that the core logic in `salsa` can be reused in future web or mobile interfaces.

## Core Features

-   **Context-Aware**: Remembers your active server, user, and working directory. You can "cd" into a ChRIS folder and stay there.
-   **Searchable**: Powerful query syntax (`name:demo, version:2.0`) for finding resources without memorizing IDs.
-   **Chefs Shell**: Familiar Unix-like commands (`chili chefs ls`, `cd`, `pwd`, `touch`) for browsing the ChRIS filesystem intuitively.
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

    # Change working directory
    chili chefs cd /home/user/uploads

    # Confirm location
    chili chefs pwd
    ```

3.  **Upload Data:**
    Upload local data to your current ChRIS location.
    ```bash
    chili path upload ~/data/project-x/scans
    ```

4.  **Create a Feed:**
    Create a new analysis feed using the data you just uploaded.
    ```bash
    chili feed create --dirs "/home/user/project-x/scans" --params "title:My Analysis"
    ```

---
_-30-_
