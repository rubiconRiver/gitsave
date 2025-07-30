# Intentional Backend Architecture v3 (Simplified)

## Core Concept
Git is our database. The collaboration branch is our shared database. That's it.

## Business Domains

### ActiveWorkspace
What the user is working on right now
- Current branch
- Current changes
- Save history

### Utils  
Basic functions 
Saving
- Create a save (commit)
- Add a message
- emit an event when done (to trigger update to collaboration branch)


### Project
-Goals (set by whole team)
-Tasks (by yourself or from the team)
-Notes (for yourself or the team)

### Branches
See what everyone's doing
- Who owns which branches
- Recent saves by team
- your own branches
- checkout any branch


## Infrastructure (The Git Database)

### GitDB
Our "database" layer that happens to use Git
```typescript
interface Database {
  // Standard database operations
  save(collection: string, id: string, data: any): Promise<void>
  read(collection: string, id: string): Promise<any>
  list(collection: string, query?: any): Promise<any[]>
  delete(collection: string, id: string): Promise<void>
}

class GitDB implements Database {
  // Implementation uses git, but interface is generic
  // Internally handles commits, pushes, collaboration branch
  // Can cache in memory for performance
}
```

## Simple Architecture

```
src/
├── domains/
│   ├── workspace/
│   │   └── workspace.service.ts    (getCurrentBranch, getChanges)
│   ├── save/
│   │   └── save.service.ts         (createSave)
│   ├── intent/
│   │   └── intent.service.ts       (CRUD intents)
│   └── team/
│       └── team.service.ts         (getTeamActivity)
├── infrastructure/
│   ├── git-db.ts                   (Git as a database)
│   └── ipc-adapter.ts              (Frontend communication)
└── app.module.ts
```

## How It Works

When user hits Save:
```typescript
// save.service.ts
async createSave(message: string) {
  // Just save to the "database"
  await this.db.save('saves', saveId, {
    message,
    timestamp: new Date(),
    branch: currentBranch,
    author: username,
    files: changedFiles
  })
  
  // GitDB handles the actual git commit + collaboration branch internally
}

// team.service.ts  
async getTeamActivity() {
  // Just read from the "database"
  const saves = await this.db.list('saves', { 
    where: { timestamp: { $gt: yesterday } }
  })
  return saves
}
```

## Why This Works

1. **Git = Database** (hidden implementation detail)
2. **Domains = What users do** (save, track intents, see team)
3. **Services use standard database interface**
4. **No git knowledge needed in domains**

The collaboration branch is just an implementation detail of how our "database" syncs between users. Services don't need to know.

## Collections (Database Tables)
- `saves` - All saves across all users
- `intents` - All intents 
- `branches` - Branch ownership info
- `users` - User preferences

GitDB maps these to git operations internally, but we could swap to MongoDB tomorrow and nothing changes.