# Branch Summary

_Last updated: 2026-03-21_
_Last checked commit on main: d9f488c_

## Unmerged Branches (not yet merged into `main`)

### 1. `organize-project`
**Status:** 4 commits ahead of main
**Purpose:** Major refactoring of `src/main.ts` into a modular architecture.

Breaks the monolithic `main.ts` (1200+ lines removed) into organized modules:
- **IPC layer:** `src/main/ipc/IPCRouter.ts` + handler modules (app, collab, git, hooks, license, repo)
- **Services:** `BranchService`, `FileService`, `GitService`
- **State management:** `AppState`, `StateManager`
- **Types:** Shared type definitions in `src/main/types/`
- Includes a `REFACTORING_PLAN.md` documenting the approach

### 2. `start-colab-stuff`
**Status:** 8 commits ahead of main (includes organize-project commits)
**Purpose:** Adds collaboration infrastructure on top of the organize-project refactor.

Builds on `organize-project` and adds:
- **Collaboration system:** `CollaborationRepository`, `CollaborationStore` with table-based data model
- **Tables:** Activity, Branch, Message, Task, User tables with a `BaseTable` abstraction
- **Type definitions** for all collaboration entities (Activity, Branch, Message, Task, User)
- **IPC task handlers** for task management
- **Preload script** updates for new IPC channels
- Renderer changes for collaboration UI
- Adds a guide: `ADDING_FEATURES.md` for extending the collaboration system

### 3. `refactor-to-react`
**Status:** 10 commits ahead of main (includes organize-project + start-colab-stuff)
**Purpose:** Planning and prototyping a React-based UI rewrite.

Builds on `start-colab-stuff` and adds:
- **Design docs:** `GITSAVE_V2_SPEC.md`, `WIDGET_UI_DESIGN.md`
- **HTML mockups:** Multiple widget design prototypes (horizontal, refined, final)
- **`intentional-v2/` scaffold** with `package.json` for a new monorepo structure
- React presentation plan (`react-plan-presentation.html`)
- No actual React components yet — this is a design/planning branch

### 4. `intentionalv2`
**Status:** 14 commits ahead of main (includes all prior branch work)
**Purpose:** Full v2 implementation with React frontend, NestJS backend, and Electron shell.

The most advanced branch. Builds on everything above and adds:
- **`intentional-v2/` monorepo** with full implementation:
  - `apps/frontend/` — React + Vite app with `SaveWidget`, `Widget`, `WidgetBar` components, `GitSaveContext` provider, API service layer
  - `apps/backend/` — NestJS app with collaboration module (controller, repository, cache, sync services), git services (core, queue, collaboration-git), repository management, IPC module
  - `apps/electron/` — Electron wrapper with IPC handlers and preload
- **`intentional/` alternate scaffold** with a decorator-based IPC approach and its own architecture docs (V1, V2, V3)
- **Shared packages** with TypeScript type definitions
- `.idea/` JetBrains project files

### 5. `collaboration`
**Status:** 6 commits ahead of main (includes organize-project base)
**Purpose:** Active collaboration feature — user activity and task tracking via JSON files.

Builds on `organize-project` and adds:
- `garett/activity.json` — tracks user activity events (online status, branch changes, file edits)
- `garett/tasks.json` — task tracking with status, priority, and assignments
- Branch ownership tracking in `intentional.dev/branches/ownership.json`
- Renderer updates for collaboration UI

### 6. `test-feature-branch`
**Status:** 8 commits, **no common ancestor with main** (independent history)
**Purpose:** Standalone development branch with DMG build support, branch manager UI, and git graph visualization.

Contains an independent codebase with:
- `BUILD_DMG.md` — instructions for building macOS DMG installer
- `src/branch-manager.html` — branch management UI (521 lines)
- `src/real-git-graph.html` — git graph visualization
- Enhanced `main.ts` with additional Electron features
- Proprietary license file

---

## Merged / Up-to-date Branches

The following branches exist but are already merged into `main`:
- `add-branch-features`
- `afternewfeatures`
- `collaboration-tools`
- `commit-history-main-candidate`
- `even-even-more-git-visuals`
- `even-more-upgraded-git`
- `garetttestbranch`
- `testingdmg`
- `testingmorestuff`
- `upgrade-commit-history-view`

---

## Branch Lineage

```
main
├── organize-project (refactor main.ts into modules)
│   ├── start-colab-stuff (add collaboration system)
│   │   ├── refactor-to-react (React UI design/planning)
│   │   │   └── intentionalv2 (full v2 implementation)
│   │   └── collaboration (user activity & task tracking)
│   └── collaboration (also based on organize-project)
└── test-feature-branch (independent — no shared history)
```
