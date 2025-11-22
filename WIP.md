# Work In Progress: Integrate `cumin` and Prepare `chili` for Broader Usage

**Date:** 2025-11-21
**Goal:** Integrate the updated, async, and browser-ready `cumin` library into the `chili` CLI and prepare `chili` for potential broader usage (e.g., as a portable library for web UIs).

## Current State

### Integration Changes
-   **Async Initialization:** `src/index.ts` now instantiates `NodeStorageProvider` from `cumin` and initializes the global `chrisConnection` asynchronously before starting the CLI.
-   **API Updates:** Updated method calls to match the new RPN naming convention in `cumin` (e.g., `client_get()` instead of `getClient()`, `context_set()` instead of `setContext()`).
-   **Dependency:** Explicitly imports `NodeStorageProvider` from `@fnndsc/cumin`.

## Completed Tasks
-   [x] Update `src/index.ts` to use `chrisConnection_init` with `NodeStorageProvider`.
-   [x] Update `src/index.ts` to await `client_get()` and `context_set()` (via the global `chrisConnection`).
-   [x] Verify `chili` builds successfully with the refactored `cumin`.
-   [x] Update `chili` command files for RPN naming and `cumin` API changes (`contextCommand.ts`, `baseGroupHandler.ts`, `pathCommand.ts`, `pluginHandler.ts`).
-   [x] **Style Guide Alignment:** Applied RPN naming and JSDoc conventions to `chili`'s own source files (handlers, commands, screens).
-   [x] **Refactor Handlers:** Extracted business logic from handlers into controllers (`BaseController`, `FileController`, `FeedController`, `PluginController`, etc.).
-   [x] **Testing:** Added Jest test suite and basic tests for `connect`, `context`, `feed`, and `plugin` commands.

## Next Steps / To-Do
1.  **Expand chili Test Coverage:** Add comprehensive integration tests for all `chili` commands and handlers, and unit tests for controllers and utility functions.
2.  **Review and Finalize:** Review all changes and prepare for the next phase of development.
