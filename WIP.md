# Work In Progress: Browser Compatibility Integration

**Date:** 2025-11-21
**Goal:** Integrate the updated, async, and browser-ready `cumin` library into the `chili` CLI.

## Current State

### Integration Changes
-   **Async Initialization:** `src/index.ts` now instantiates `NodeStorageProvider` from `cumin` and initializes the global `chrisConnection` asynchronously before starting the CLI.
-   **API Updates:** Updated method calls to match the new RPN naming convention in `cumin` (e.g., `client_get()` instead of `getClient()`, `context_set()` instead of `setContext()`).
-   **Dependency:** Explicitly imports `NodeStorageProvider` from `@fnndsc/cumin` (which now exports it).

## Completed Tasks
-   [x] Update `src/index.ts` to use `initializeChrisConnection` with `NodeStorageProvider`.
-   [x] Update `src/index.ts` to await `client_get()` and `context_set()`.
-   [x] Verify `chili` builds successfully with the refactored `cumin`.

## Next Steps / To-Do
1.  **Style Guide Alignment:** Apply RPN naming and JSDoc conventions to `chili`'s own source files (handlers, commands, screens) as they currently mix conventions.
2.  **Refactor Handlers:** Extract core business logic from `GroupHandler` classes into reusable, UI-agnostic components (controllers/presenters) that can be shared with a browser UI.
3.  **Testing:** Add tests for `chili` commands to verify the integration with the new async `cumin`.
