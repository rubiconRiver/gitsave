# Intentional Backend Architecture v2

## Overview
Domain-driven design with clear models, repositories, and services. Running in Electron's main process.

## Domain Models

### GitRepository
```typescript
interface GitRepository {
  path: string
  currentBranch: string
  remoteUrl?: string
  isClean: boolean
}
```

### Branch
```typescript
interface Branch {
  name: string
  owner?: string
  isProtected: boolean
  createdAt: Date
  lastActivity: Date
}
```

### Save
```typescript
interface Save {
  id: string
  message: string
  branch: string
  author: string
  timestamp: Date
  filesChanged: FileChange[]
}
```

### Intent
```typescript
interface Intent {
  id: string
  text: string
  priority: Priority
  author: string
  assignee?: string
  status: IntentStatus
}
```

## Core Layers

### 1. Repository Layer (Data Access)
- **GitDataRepository**: Low-level git operations via isomorphic-git
- **StorageRepository**: Abstract storage interface
- **CollaborationStorageRepository**: Reads/writes to collaboration branch

### 2. Domain Services (Business Logic)
- **SaveService**: Orchestrates the save flow
- **BranchManager**: Branch rules and ownership
- **IntentManager**: Intent lifecycle management

### 3. Application Services (Use Cases)
- **SaveWorkflow**: Execute a save (commit + collaboration update)
- **SyncWorkflow**: Sync collaboration data
- **BranchWorkflow**: Create/switch branches with ownership

### 4. Infrastructure
- **IpcAdapter**: Expose workflows to frontend via IPC
- **EventBus**: Internal event system
- **ConfigStore**: User preferences

## Key Flows

### Save Flow
```
1. Frontend → IpcAdapter.save()
2. SaveWorkflow orchestrates:
   - SaveService.createSave() → GitDataRepository.commit()
   - StorageRepository.store() → CollaborationStorageRepository.write()
   - EventBus.emit('save.completed')
3. Return save result to frontend
```

### The Magic: StorageRepository
```typescript
interface StorageRepository {
  store(key: string, data: any): Promise<void>
  retrieve(key: string): Promise<any>
  list(prefix: string): Promise<string[]>
}

// Implementation delegates to CollaborationStorageRepository
// But IntentManager doesn't know it's using git!
```

## Why This is Better

1. **Clear domain models** - We know what a Save, Branch, Intent looks like
2. **Layered architecture** - Repositories → Services → Workflows → IPC
3. **Storage abstraction** - Services use StorageRepository, don't know about git
4. **Single responsibility** - Each class does ONE thing
5. **Testable** - Can mock repositories, test services in isolation

## Module Structure
```
src/
├── domain/
│   ├── git/
│   │   ├── git-repository.model.ts
│   │   └── git-data.repository.ts
│   ├── branch/
│   │   ├── branch.model.ts
│   │   └── branch-manager.service.ts
│   ├── save/
│   │   ├── save.model.ts
│   │   └── save.service.ts
│   ├── intent/
│   │   ├── intent.model.ts
│   │   └── intent-manager.service.ts
│   └── collaboration/
│       └── collaboration-storage.repository.ts
├── infrastructure/
│   ├── storage/
│   │   └── storage.repository.ts
│   ├── ipc/
│   │   └── ipc.adapter.ts
│   └── events/
│       └── event-bus.ts
└── application/
    ├── workflows/
    │   ├── save.workflow.ts
    │   ├── sync.workflow.ts
    │   └── branch.workflow.ts
    └── app.module.ts
```

## The Key Insight
Services work with domain models and use repositories for storage. They don't know or care that we're using git as a database. The CollaborationStorageRepository is just an implementation detail of StorageRepository.