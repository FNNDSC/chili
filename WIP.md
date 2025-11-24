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

## RPN Naming Convention & Build Standardization (2025-11-24)

### Refactoring
-   **RPN Enforcement:** Rigorously renamed functions and methods across `cumin`, `salsa`, and `chili` to adhere to the `<object>_<verb>` (RPN) naming convention.
    -   `login_doLogin` -> `login_do`
    -   `logout_doLogout` -> `logout_do`
    -   `files_doLs` -> `files_ls`
    -   `plugins_doAdd` -> `plugins_add`
    -   Renamed search helpers to `*_search` and field getters to `*_fieldsGet`.
    -   Removed redundant `Command` suffix from setup functions (e.g., `connectCommand_setup` -> `connect_setup`).
    -   Renamed `cumin` core functions: `createObjContext` -> `objContext_create`, `initialize` -> `init`, getters like `fileBrowser` -> `fileBrowser_get`.
-   **Typing Fixes:** Removed `any` types in favor of specific interfaces or `unknown` with checking. Fixed missing type declarations.

### Build & Environment
-   **Makefile:** Reverted `chili` Makefile to use standard `npm link` to preserve the global linking pattern.
-   **Documentation:** Updated `doc/01_setup.adoc` and `README.md` to explicitly recommend **NVM** (Node Version Manager) to handle global package linking without root permissions (`EACCES` errors).
-   **Error Handling:** Improved error logging in `chili/src/index.ts` and `cumin` to prevent silent failures during handler initialization (the "files are GONE" regression).

### Testing
-   **Green Suite:** Verified all tests pass in all three repositories (80+ tests).
    -   Updated mocks in `salsa` and `chili` tests to match the new RPN function names and `cumin` API structure.
    -   Fixed broken test logic in `connect`, `fs`, `plugins`, and `feeds` suites.

## Next Steps / To-Do
1.  **Expand chili Test Coverage:** Add comprehensive integration tests for all `chili` commands and handlers, and unit tests for controllers and utility functions.
2.  **Review and Finalize:** Review all changes and prepare for the next phase of development.