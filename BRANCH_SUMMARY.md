# Unmerged Branch Summary

_Last updated: 2026-03-21_
_Last checked commit (main): see `git log origin/main -1`_

## Branches Not Yet Merged into `main`

### 1. `collaboration`
**Commits ahead of main:** 12
**Key changes:** 22 files changed (+2,067 / -1,168)

Builds on the `organize-project` and `start-colab-stuff` work. Adds a collaboration system with user activity tracking (activity.json, tasks.json for "garett"). Refactors `src/main.ts` into a modular architecture with an IPC router, separated handler modules (app, git, collab, hooks, license, repo), and new services layer (BranchService, FileService, GitService). Introduces state management (AppState, StateManager). Includes a `REFACTORING_PLAN.md`.

---

### 2. `intentionalv2`
**Commits ahead of main:** 14
**Key changes:** 130 files changed (+33,839 / -1,292)

The largest branch — a major v2 rewrite. Contains everything from `organize-project`, `start-colab-stuff`, and `refactor-to-react`, plus:
- A full **monorepo** structure under `intentional-v2/` with separate `apps/backend` (NestJS-style with modules for collaboration, git, IPC, repository), `apps/electron`, and `apps/frontend` (React + Vite).
- A second monorepo scaffold under `intentional/` with shared packages.
- Collaboration system with typed tables (Activity, Branch, Message, Task, User), a CollaborationRepository, and CollaborationStore.
- UI design docs and mockups (widget designs, horizontal layouts, final mockups).
- React frontend with GitSaveContext, SaveWidget, Widget, and WidgetBar components.
- `.idea/` IDE config files (should likely be gitignored).

---

### 3. `organize-project`
**Commits ahead of main:** 4
**Key changes:** 17 files changed (+1,923 / -1,157)

Refactors the monolithic `src/main.ts` into a modular structure: IPC router with handler modules (app, collab, git, hooks, license, repo), service layer (BranchService, FileService, GitService), and state management (AppState, StateManager). Adds a `REFACTORING_PLAN.md`. This is the foundational refactor that other branches build on.

---

### 4. `refactor-to-react`
**Commits ahead of main:** 10
**Key changes:** 50 files changed (+8,708 / -1,292)

Extends `organize-project` and `start-colab-stuff` with:
- UI design exploration: widget mockups, horizontal designs, final mockups (HTML files).
- Documentation: `GITSAVE_V2_SPEC.md`, `WIDGET_UI_DESIGN.md`.
- Initial `intentional-v2/` monorepo scaffold (package.json only).
- Full collaboration system (CollaborationRepository, CollaborationStore, typed tables).
- Task management IPC handlers.
- Updated renderer with collaboration CSS.

---

### 5. `start-colab-stuff`
**Commits ahead of main:** 7
**Key changes:** 41 files changed (+4,061 / -1,292)

Extends `organize-project` with:
- Collaboration system: CollaborationRepository, CollaborationStore, typed table classes (Activity, Branch, Message, Task, User) with full CRUD operations.
- Task management IPC handlers.
- Updated preload script and renderer for collaboration features.
- Collaboration CSS styles.
- Documentation on adding new collaboration features (`ADDING_FEATURES.md`).

---

### 6. `test-feature-branch`
**Commits ahead of main:** 8
**Key changes:** 30 files changed (+274 / -5,151)

A **cleanup/simplification** branch. Removes significant amounts of code and files:
- Removes collaboration UI, branch manager, changes preview, git data fetcher, hooks, and agent config.
- Removes macOS signing/notarization files and menubar design docs.
- Strips down `src/main.ts`, `src/renderer.js`, `src/index.html`, and `src/branch-manager.html` substantially.
- Adds a proprietary license and marks the package as private.
- Simplifies the overall project footprint.

---

## Branch Lineage

```
main
├── organize-project (base refactor)
│   ├── start-colab-stuff (+ collaboration system)
│   │   ├── refactor-to-react (+ UI designs, v2 scaffold)
│   │   │   └── intentionalv2 (full v2 rewrite with monorepo)
│   │   └── collaboration (+ user activity tracking)
│   └── (shared refactored architecture)
└── test-feature-branch (independent cleanup/simplification)
```
