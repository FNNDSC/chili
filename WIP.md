# Work In Progress: ChILI Architectural Refinement & Library Evolution

**Date:** Today's date (November 28, 2025)
**Goal:** Establish ChILI as the single source of truth for ChRIS command logic and presentation, serving as a robust library for consumers like `chell`.

## Current State

### Architectural Changes
-   **Command/View/Model (CVM) Pattern:** Applied extensively to all major command groups:
    -   **Commands (`src/commands`)**: Decoupled core logic from presentation. Functions now return strongly-typed **Models**.
    -   **Models (`src/models`)**: Dedicated directory for explicit data interfaces (e.g., `ListingItem`, `Plugin`, `Feed`).
    -   **Views (`src/views`)**: Pure functions to render models into formatted string output (plain, table, CSV).
    -   **Handlers (`src/feeds`, `src/plugins`, etc.)**: Orchestrate calls to Commands and Views.
-   **Strict Typing & RPN Naming:** Enforced across all refactored components, minimizing `any` usage.
-   **Module Export:** `chili` is now fully consumable as a library by other applications.

### Implemented Features
-   **Comprehensive FS Operations (`chefs` commands):**
    -   `ls`: Advanced listing with `-l`, `-h` and generic output formats (`--table`, `--csv`).
    -   `mkdir`, `touch`, `cat`.
    -   `upload`: Recursive local directory upload to ChRIS.
-   **Connection Management:**
    -   `connect`, `logout` commands.
-   **Plugin Management:**
    -   `plugins list`, `plugin run`.
-   **Feed Management:**
    -   `feeds list` (with generic output formats), `feed create`.

## Resolved Issues
-   **`objContext_create` for Feeds:** Fixed `Unknown object context type: ChRISFeedGroup` error in `cumin` by correctly registering `ChRISFeedGroup`.
-   **`chili` Module Resolution:** Resolved `cannot find module` errors by aligning `tsconfig.json` (co-located types) and `package.json` `exports` mapping.
-   **Output Formatting:** Implemented generic output formatting for collection lists (default, `--table`, `--csv`) with correct field ordering.

## Next Steps / To-Do
1.  **Expand Command Refactoring:** Continue applying the CVM pattern to remaining `chili` command groups (e.g., `context`, `man`, `file`).
2.  **Audit `salsa` for Typing:** Introduce models in `salsa` to replace generic `FilteredResourceData` where possible, or add more specific type assertions.
3.  **Audit `chili` & `chell`:** Perform a final sweep for strict typing and RPN naming in areas not directly touched by this refactor.
