# Intentional Backend Architecture

## Overview
Lean NestJS backend running in Electron's main process. No HTTP server - only IPC communication with the frontend.

## Core Services

### IpcService
- Registers all `@IpcHandle()` decorated methods as Electron IPC handlers
- Auto-discovers handlers across all services
- Manages communication between frontend and backend

### GitService
- Core git operations using isomorphic-git
- Methods: `getStatus()`, `save()`, `createBranch()`, `push()`, `pull()`
- Direct branch manipulation (no working directory changes)
- Handles all git commands without shell dependencies

### RepositoryService
- Manages current repository state
- Tracks which repo is loaded
- Provides repo metadata (path, name, remote URL)
- File watching for auto-refresh

### CollaborationService
- Manages the `.intentional` branch
- Writes to `users/[username]/` folder without checking out
- Reads other users' metadata from collaboration branch
- Handles sync operations (pull/push collaboration branch)

### BranchService  
- Branch creation and switching for user's working branch
- Branch ownership tracking and validation
- Protection against overwriting others' branches
- Manages branch metadata (owner, created date, last activity)

### IntentService
- Manages user intents (goals/tasks)
- CRUD operations for intents
- Tracks intent lifecycle (created, assigned, completed)
- Storage-agnostic (doesn't know about git/branches)

### ConfigService
- User preferences (git author info)
- App settings
- Persistent storage using electron-store

## Module Structure

```
app.module.ts
├── core.module.ts
│   ├── IpcService
│   ├── GitService
│   └── RepositoryService
├── collaboration.module.ts
│   ├── CollaborationService
│   └── BranchService
└── features.module.ts
    ├── IntentService
    └── ConfigService
```

## IPC Channels

- `git:status` - Get current git status
- `git:save` - Create a commit
- `git:branch:switch` - Switch branches
- `git:branch:create` - Create new branch
- `git:sync:pull` - Pull from remote
- `git:sync:push` - Push to remote
- `collaboration:sync` - Sync collaboration branch
- `intent:create` - Create new intent
- `intent:list` - Get all intents

## Data Flow

### Regular Save
1. Frontend calls `window.intentional.invoke('git:save')`
2. IpcService routes to `GitService.save()`
3. GitService commits to current branch and pushes
4. CollaborationService.updateMetadata() called
5. Writes metadata directly to collaboration branch (no checkout)
6. Returns success through IPC to frontend

### Reading Collaboration Data  
1. Frontend calls `window.intentional.invoke('collaboration:sync')`
2. CollaborationService fetches collaboration branch
3. Reads other users' folders from git objects (no checkout)
4. Returns parsed data to frontend
5. Frontend updates UI with team activity

Simple, direct, no HTTP overhead, no working directory changes.

## Service Responsibilities

- **GitService**: Only knows about git operations
- **CollaborationService**: Only knows about collaboration branch mechanics  
- **BranchService**: Only knows about user branches and ownership rules
- **IntentService**: Only knows about intent data, not how it's stored

Clean separation - each service has one job.