# ChILI (ChRIS Interactive Line Interface) 🌶️

`chili` is a powerful, interactive command-line interface (CLI) for managing and interacting with a ChRIS instance. It provides a rich set of commands for navigating, managing, and transferring data between your local machine and a ChRIS system.

## Abstract

This tool is designed for developers and power-users who want to script and control a ChRIS instance from the comfort of their terminal. It maintains a local context, remembering your connection details and current location within the ChRIS filesystem, allowing for a fluid and efficient workflow.

## Architecture

`chili` is the user-facing frontend of a two-part system. It is responsible for parsing user commands and displaying output. For all core operations, it delegates to the [`cumin`](../cumin/README.md) library, which acts as its Node.js-based backend.

The CLI is built on a `noun verb` pattern using the `commander.js` library.

-   **Nouns** represent ChRIS resources. A distinction is made between plural nouns for collections (e.g., `feeds`) and singular nouns for specific members (e.g., `feed`).
-   **Verbs** are implemented as subcommands that perform an action on the noun (e.g., `list`, `create`, `delete`).

A `BaseGroupHandler` class provides common verbs (`list`, `delete`, `fieldslist`) to all collection nouns, keeping the command structure consistent and the code DRY.

### Coding Style

This project adheres to a specific set of TypeScript coding standards outlined in the main style guide. Before contributing, please review the [TypeScript Style Guide](TYPESCRIPT-STYLE-GUIDE.md).

## Quick Start

After building and linking the project, you can run `chili` directly from your terminal. This guide demonstrates a common workflow.

1.  **Connect to ChRIS:**
    First, connect to your ChRIS instance. This command stores your session details for future commands.
    ```bash
    chili connect <URL> --user <USERNAME> --password <PASSWORD>
    ```
    *Example:*
    ```bash
    chili connect https://cube.chrisproject.org/api/v1/ --user chris --password chris1234
    ```

2.  **Upload Data:**
    Next, upload some local data to the ChRIS filesystem. The `path upload` command takes a local path and a destination path within ChRIS.
    ```bash
    chili path upload <local/path/to/data> <chris/path/to/data>
    ```
    *Example:*
    ```bash
    chili path upload ~/data/project-x/scans /home/chris/project-x/scans
    ```

3.  **Create a Feed:**
    Now, create a new feed (an analysis) using the data you just uploaded as the root node.
    ```bash
    chili feed create --dirs <chris/path/to/data> --params "title:My First Analysis"
    ```
    *Example:*
    ```bash
    chili feed create --dirs "/home/chris/project-x/scans" --params "title:My First Analysis"
    ```

4.  **List Your Feeds:**
    You can see the feed you just created by using the `list` verb on the `feeds` noun.
    ```bash
    chili feeds list
    ```

---
_-30-_