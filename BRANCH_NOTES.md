# Branch Notes

> Last checked: 2026-03-21
> Base branch: `main` (latest commit: d9f488c, 2025-07-28)
> No new commits detected since previous check: N/A (first run)

## Branches with Unique Changes (Unmerged into main)

### `intentionalv2` — Full V2 rewrite with monorepo architecture
- **Last commit:** 2025-07-30 (f7fadeb "v3")
- **Size:** ~130 files changed, +33,839 / -1,292 lines
- **Summary:** Major rewrite of the entire application into a monorepo (`intentional-v2/`) with separate `apps/backend`, `apps/electron`, and `apps/frontend` directories. Backend uses NestJS with modules for collaboration, git, IPC, and repository management. Frontend appears to use React. Includes collaboration system with repositories, stores, and typed tables (Activity, Branch, Message, Task, User). Also contains widget design mockups (HTML prototypes for horizontal widget layouts) and design docs (`GITSAVE_V2_SPEC.md`, `WIDGET_UI_DESIGN.md`). This is the most advanced branch — it builds on top of organize-project, start-colab-stuff, and refactor-to-react.

### `collaboration` — Collaboration features with activity/task tracking
- **Last commit:** 2025-07-28 (7670857 "Update activity for garett")
- **Size:** 22 files changed, +2,067 / -1,168 lines
- **Summary:** Refactors `src/main.ts` into a modular architecture with IPC handlers (app, git, collab, hook, license, repo), services (BranchService, FileService, GitService), state management (AppState, StateManager), and typed interfaces. Adds collaboration JSON data for user "garett" (activity and tasks). Includes a `REFACTORING_PLAN.md`. Builds on organize-project.

### `organize-project` — Code organization and modular refactor
- **Last commit:** 2025-07-28 (bd3d5b6 "WIP")
- **Size:** 17 files changed, +1,923 / -1,157 lines
- **Summary:** The foundational refactoring branch. Breaks the monolithic `src/main.ts` into modular structure: IPC router + handlers, services (Git, Branch, File), state management, and type definitions. Core architectural improvement that other branches build upon.

### `refactor-to-react` — React migration with collaboration data layer
- **Last commit:** 2025-07-28 (63b22b0 "WIP")
- **Size:** ~50 files changed, +8,708 / -1,292 lines
- **Summary:** Extends start-colab-stuff with React migration prep. Adds collaboration data layer with typed tables (CollaborationRepository, CollaborationStore, ActivityTable, BranchTable, etc.). Includes widget design mockups (HTML) and documentation. Adds `preload.ts` for Electron IPC bridge.

### `start-colab-stuff` — Initial collaboration system
- **Last commit:** 2025-07-28 (370a4c6 "WIP")
- **Size:** ~41 files changed, +4,061 / -1,292 lines
- **Summary:** Builds on organize-project. Adds the collaboration module with typed tables, repository pattern, and store. Includes IPC handlers for collaboration features and updates to renderer. Beginning of the multi-user collaboration system.

## Branches Already Merged into main (No Diff)

These branches have no unique changes compared to `main` — their content has been merged or they are ancestors of `main`:

| Branch | Last Commit Date | Last Message |
|--------|-----------------|--------------|
| `add-branch-features` | 2025-07-27 | WIP |
| `afternewfeatures` | 2025-07-27 | WIP |
| `collaboration-tools` | 2025-07-28 | WIP |
| `commit-history-main-candidate` | 2025-07-27 | WIP |
| `even-even-more-git-visuals` | 2025-07-27 | WIP |
| `even-more-upgraded-git` | 2025-07-27 | WIP |
| `garetttestbranch` | 2025-07-27 | WIP |
| `test-feature-branch` | 2025-07-26 | WIP |
| `testingdmg` | 2025-07-27 | WIP |
| `testingmorestuff` | 2025-07-27 | WIP |
| `upgrade-commit-history-view` | 2025-07-27 | WIP |

## Other Claude Branches

| Branch | Purpose |
|--------|---------|
| `claude/branch-summary-01GhfkSFqepjBCWbABmdWepx` | Previous branch summary (1 file: BRANCH_SUMMARY.md) |
| `claude/branch-summary-01LbMkre5FoLkJJw2njN4mD8` | Previous branch summary (1 file: BRANCH_SUMMARY.md) |

## Branch Lineage

The unmerged branches form a progression:

```
main
 └── organize-project (modular refactor of main.ts)
      └── start-colab-stuff (adds collaboration tables/store)
           └── refactor-to-react (React prep + widget mockups)
                └── intentionalv2 (full monorepo rewrite, most advanced)
      └── collaboration (activity/task tracking for garett)
```

## Notes

- All commit messages are "WIP" except for collaboration activity updates and intentionalv2's "v3"
- `intentionalv2` is the most feature-complete branch and likely represents the target direction
- 11 branches have no diff from main and could potentially be cleaned up
- No activity on any branch since 2025-07-30
