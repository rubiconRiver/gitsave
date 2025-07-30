# Collaboration Branch Implementation Plan

## Core Concept
The collaboration branch acts as a distributed database where team members share data through JSON files. This branch is **never** checked out during normal operations - we only read from and write to it using Git commands.

## Implementation Phases

### Phase 1: Core Git Abstraction Layer (Week 1)

#### 1.1 Create Low-Level Git Service
```typescript
// src/modules/git/services/git-core.service.ts
class GitCoreService {
  // Wraps isomorphic-git with our abstractions
  async readFileFromBranch(branch: string, filePath: string): Promise<string>
  async writeFileToBranch(branch: string, filePath: string, content: string): Promise<void>
  async listFilesInBranch(branch: string, directory?: string): Promise<string[]>
  async commitAndPush(branch: string, message: string): Promise<void>
}
```

#### 1.2 Create Collaboration Git Service
```typescript
// src/modules/git/services/collaboration-git.service.ts
class CollaborationGitService {
  private readonly COLLAB_BRANCH = 'collaboration';
  
  // Never switches branches - uses git commands to read/write
  async readJsonFile(path: string): Promise<any>
  async writeJsonFile(path: string, data: any): Promise<void>
  async listUserDirectories(): Promise<string[]>
  async ensureCollaborationBranch(): Promise<void>
}
```

#### 1.3 Create Operation Queue
```typescript
// src/modules/git/services/git-queue.service.ts
class GitQueueService {
  // Ensures Git operations don't conflict
  private queue: GitOperation[] = [];
  
  async enqueue(operation: GitOperation): Promise<void>
  async processQueue(): Promise<void>
  async waitForOperation(id: string): Promise<OperationResult>
}
```

### Phase 2: Collaboration Data Layer (Week 2)

#### 2.1 Define Data Schemas
```typescript
// src/modules/collaboration/schemas/
- user-profile.schema.ts
- branch-ownership.schema.ts  
- task.schema.ts
- message.schema.ts
- activity.schema.ts
```

#### 2.2 Create Collaboration Repository
```typescript
// src/modules/collaboration/repositories/collaboration.repository.ts
class CollaborationRepository {
  constructor(
    private gitService: CollaborationGitService,
    private queue: GitQueueService
  ) {}
  
  // High-level methods that handle queuing and error recovery
  async saveUserData(username: string, dataType: string, data: any): Promise<void>
  async getUserData(username: string, dataType?: string): Promise<any>
  async getAllUsersData(dataType: string): Promise<Record<string, any>>
}
```

#### 2.3 Create Data Cache Layer
```typescript
// src/modules/collaboration/services/collaboration-cache.service.ts
class CollaborationCacheService {
  private cache: Map<string, CachedData> = new Map();
  
  async get(key: string): Promise<any>
  async set(key: string, data: any): Promise<void>
  async invalidate(pattern: string): Promise<void>
  async syncFromBranch(): Promise<void>
}
```

### Phase 3: Feature Modules (Week 3)

#### 3.1 Branch Ownership Module
```typescript
// src/modules/branches/
├── branches.module.ts
├── controllers/
│   └── branches.controller.ts
├── services/
│   ├── branch-ownership.service.ts
│   └── branch-sync.service.ts
└── dto/
    └── claim-branch.dto.ts
```

Key Features:
- Claim/release branch ownership
- Query who owns which branches
- Prevent conflicts by checking ownership
- Auto-sync with collaboration branch

#### 3.2 Task Management Module
```typescript
// src/modules/tasks/
├── tasks.module.ts
├── controllers/
│   └── tasks.controller.ts
├── services/
│   ├── task.service.ts
│   ├── task-assignment.service.ts
│   └── task-sync.service.ts
└── dto/
    ├── create-task.dto.ts
    └── update-task.dto.ts
```

Key Features:
- Create/update/delete tasks
- Assign tasks to team members
- Track task status
- Priority management

#### 3.3 Messaging Module
```typescript
// src/modules/messages/
├── messages.module.ts
├── controllers/
│   └── messages.controller.ts
├── services/
│   ├── message.service.ts
│   ├── message-delivery.service.ts
│   └── message-notification.service.ts
└── dto/
    └── send-message.dto.ts
```

### Phase 4: Real-time Sync (Week 4)

#### 4.1 WebSocket Gateway
```typescript
// src/modules/websocket/gateways/collaboration.gateway.ts
@WebSocketGateway()
class CollaborationGateway {
  @SubscribeMessage('join-collaboration')
  handleJoinCollaboration(client: Socket, username: string)
  
  @SubscribeMessage('collaboration-update')
  handleCollaborationUpdate(client: Socket, update: any)
  
  // Broadcast changes to all connected clients
  broadcastDataChange(dataType: string, data: any)
}
```

#### 4.2 Sync Service
```typescript
// src/modules/collaboration/services/sync.service.ts
class SyncService {
  // Runs every 60 seconds
  @Cron('0 * * * * *')
  async syncCollaborationData(): Promise<void>
  
  // Intelligent sync - only fetches changed data
  async detectChanges(): Promise<ChangeSet>
  async applyChanges(changes: ChangeSet): Promise<void>
}
```

### Phase 5: Developer Experience (Week 5)

#### 5.1 Abstract Service Layer
```typescript
// src/modules/collaboration/services/collaboration-facade.service.ts
@Injectable()
export class CollaborationFacade {
  // Simple API for other developers
  async saveMyData(dataType: string, data: any): Promise<void>
  async getTeammateData(username: string, dataType: string): Promise<any>
  async broadcastToTeam(event: string, data: any): Promise<void>
  
  // Handles all the Git complexity internally
}
```

#### 5.2 Developer Documentation
- Quick start guide
- API reference
- Example: "How to add a new feature"
- Common patterns and best practices

## Implementation Details

### Reading from Collaboration Branch
```typescript
// Never checkout the branch! Use git show command
async readUserData(username: string): Promise<UserData> {
  const files = await this.git.raw([
    'ls-tree', '-r', '--name-only', 
    `origin/collaboration:${username}/`
  ]);
  
  const data: UserData = {};
  for (const file of files.split('\n')) {
    const content = await this.git.show([
      `origin/collaboration:${username}/${file}`
    ]);
    data[file.replace('.json', '')] = JSON.parse(content);
  }
  
  return data;
}
```

### Writing to Collaboration Branch
```typescript
// Use a temporary worktree or sparse checkout
async writeUserData(username: string, dataType: string, data: any): Promise<void> {
  // Queue the operation
  const operation = await this.queue.enqueue({
    type: 'write-collaboration',
    payload: { username, dataType, data }
  });
  
  // Process in queue to avoid conflicts
  await this.processWriteOperation(operation);
}

private async processWriteOperation(op: GitOperation): Promise<void> {
  // Create temporary directory
  const tempDir = await this.createTempWorkspace();
  
  try {
    // Sparse checkout only collaboration branch
    await this.git.raw(['sparse-checkout', 'set', 'collaboration']);
    await this.git.checkout('collaboration');
    
    // Write file
    const filePath = `${op.payload.username}/${op.payload.dataType}.json`;
    await fs.writeFile(
      path.join(tempDir, filePath),
      JSON.stringify(op.payload.data, null, 2)
    );
    
    // Commit and push
    await this.git.add(filePath);
    await this.git.commit(`Update ${op.payload.dataType} for ${op.payload.username}`);
    await this.git.push('origin', 'collaboration');
    
  } finally {
    // Clean up and return to original branch
    await this.cleanupTempWorkspace(tempDir);
  }
}
```

### Conflict Resolution
```typescript
class ConflictResolver {
  async resolveCollaborationConflict(conflict: GitConflict): Promise<void> {
    // Strategy: Last write wins for user's own data
    // Never modify other users' data
    
    if (conflict.file.startsWith(this.currentUser)) {
      // Accept local changes for own data
      await this.git.checkout('--ours', conflict.file);
    } else {
      // Accept remote changes for others' data
      await this.git.checkout('--theirs', conflict.file);
    }
  }
}
```

## Testing Strategy

### 1. Unit Tests
- Mock isomorphic-git operations
- Test queue processing logic
- Test conflict resolution

### 2. Integration Tests
- Use test Git repository
- Test full read/write cycle
- Test concurrent operations

### 3. E2E Tests
- Multiple "users" writing simultaneously
- Network failure scenarios
- Large data sets

## Monitoring & Debugging

### Metrics to Track
- Queue size and processing time
- Sync frequency and duration
- Cache hit rate
- Conflict frequency
- Failed operations

### Debug Tools
```typescript
// src/modules/collaboration/tools/debug.controller.ts
@Controller('debug/collaboration')
export class CollaborationDebugController {
  @Get('branch-state')
  async getBranchState(): Promise<BranchState>
  
  @Get('queue-status')
  async getQueueStatus(): Promise<QueueStatus>
  
  @Post('force-sync')
  async forceSync(): Promise<SyncResult>
}
```

## Migration from V1

1. **Data Migration Script**
   - Read existing collaboration branch
   - Validate data structure
   - Report any issues

2. **Backward Compatibility**
   - V2 can read V1 data format
   - V2 writes in V1 format initially
   - Gradual migration to new format

3. **Rollback Plan**
   - Keep V1 running in parallel initially
   - Feature flag for V2 backend
   - Easy switch back if issues

## Success Metrics

1. **Performance**
   - Sync completes in < 5 seconds
   - Write operations complete in < 2 seconds
   - Queue processing < 100ms per operation

2. **Reliability**
   - 99.9% uptime for collaboration features
   - Zero data loss
   - Automatic recovery from conflicts

3. **Developer Experience**
   - New feature implementation in < 1 day
   - No Git knowledge required
   - Clear error messages

## Next Steps

1. Set up NestJS project structure ✓
2. Implement GitCoreService with isomorphic-git
3. Create CollaborationGitService 
4. Build operation queue
5. Implement first feature module (Branch Ownership)
6. Add WebSocket support
7. Create developer documentation