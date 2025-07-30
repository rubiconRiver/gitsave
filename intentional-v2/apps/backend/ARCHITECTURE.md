# Intentional v2 Backend Architecture

## Overview
The backend runs within the Electron main process and communicates with the renderer via IPC. It's built with NestJS to provide a clean, modular architecture with proper separation of concerns. The key design principle is to abstract Git operations behind service layers so that non-developer team members can work on features without understanding Git implementation details.

**Important**: This is NOT a standalone REST API server. All communication happens through Electron IPC channels between the main process (backend) and renderer process (frontend).

## Core Architecture Principles

1. **Separation of Concerns**: Git operations are completely abstracted from business logic
2. **Modular Design**: Each feature is a separate NestJS module
3. **Real-time Updates**: WebSocket integration for live collaboration
4. **Queue-based Operations**: Git operations are queued to prevent conflicts
5. **Event-driven**: Changes propagate through the system via events

## Module Structure

### 1. Git Module (`/git`)
**Purpose**: Low-level Git operations abstraction

- **GitService**: Core Git operations (commit, push, pull, branch management)
- **GitQueue**: Manages Git operations queue to prevent conflicts
- **GitEventEmitter**: Emits events when Git state changes

Key abstractions:
```typescript
interface GitOperation {
  id: string;
  type: 'commit' | 'push' | 'pull' | 'checkout';
  payload: any;
  priority: number;
}
```

### 2. Collaboration Module (`/collaboration`)
**Purpose**: Manages the collaboration branch as a database

- **CollaborationService**: High-level API for collaboration features
- **CollaborationSync**: Handles syncing with the collaboration branch
- **CollaborationCache**: In-memory cache of collaboration data

Data Structure on collaboration branch:
```
collaboration/
├── [username]/
│   ├── profile.json
│   ├── branches.json
│   ├── tasks.json
│   ├── activity.json
│   └── messages/
│       └── outbox.json
```

### 3. Repository Module (`/repository`)
**Purpose**: Repository management and state

- **RepositoryService**: Current repository state and info
- **BranchService**: Branch management and ownership
- **FileWatcherService**: Monitors file changes

### 4. User Module (`/user`)
**Purpose**: User profiles and authentication

- **UserService**: User profile management
- **UserActivityService**: Track user activity
- **UserPreferencesService**: User settings

### 5. Task Module (`/tasks`)
**Purpose**: Task/Todo management

- **TaskService**: CRUD operations for tasks
- **TaskAssignmentService**: Handle task assignments
- **TaskSyncService**: Sync tasks to collaboration branch

### 6. Message Module (`/messages`)
**Purpose**: Inter-user messaging

- **MessageService**: Send/receive messages
- **MessageQueueService**: Queue outgoing messages
- **MessageNotificationService**: Handle notifications

### 7. WebSocket Module (`/websocket`)
**Purpose**: Real-time communication

- **GitGateway**: WebSocket gateway for Git events
- **CollaborationGateway**: Real-time collaboration updates
- **NotificationGateway**: Push notifications to clients

## Data Flow

### Writing to Collaboration Branch
1. Client makes API request (e.g., create task)
2. Request hits controller → service
3. Service updates in-memory state
4. Change is queued in GitQueue
5. GitQueue processes operation:
   - Switches to collaboration branch
   - Writes JSON file
   - Commits and pushes
   - Returns to original branch
6. Event emitted via WebSocket

### Reading from Collaboration Branch
1. CollaborationSync runs every 60 seconds
2. Fetches latest from origin
3. Reads files from collaboration branch WITHOUT checkout
4. Updates in-memory cache
5. Emits events for changes
6. WebSocket notifies connected clients

## IPC Communication Structure

### IPC Channels (Main ← → Renderer)
```typescript
// Tasks
'tasks:create'              → Create task
'tasks:list'                → List tasks  
'tasks:update'              → Update task
'tasks:delete'              → Delete task

// Messages
'messages:send'             → Send message
'messages:get-inbox'        → Get inbox
'messages:get-sent'         → Get sent messages

// Branches
'branches:list'             → List branches
'branches:claim'            → Claim branch ownership
'branches:release'          → Release branch

// Users
'users:list'                → List users
'users:get-profile'         → Get user profile
'users:update-profile'      → Update my profile

// Git Operations
'git:commit'                → Make a commit
'git:get-status'            → Get status
'git:get-log'               → Get commit log
```

### IPC Events (Main → Renderer)
```typescript
// Git Events
'git:status-changed'
'git:new-commit'
'git:branch-changed'

// Collaboration Events  
'collaboration:task-created'
'collaboration:task-updated'
'collaboration:message-received'
'collaboration:user-status-changed'
'collaboration:branch-ownership-changed'

// System Events
'sync:started'
'sync:completed'
'sync:error'
```

## Service Interfaces

### GitService
```typescript
interface IGitService {
  // Never exposed directly to controllers
  commit(message: string): Promise<void>;
  push(): Promise<void>;
  pull(): Promise<void>;
  
  // These return domain objects, not Git objects
  getStatus(): Promise<RepositoryStatus>;
  getCurrentBranch(): Promise<string>;
}
```

### CollaborationService
```typescript
interface ICollaborationService {
  // Developers use these simple methods
  saveUserData(dataType: string, data: any): Promise<void>;
  getUserData(username: string): Promise<UserData>;
  sync(): Promise<void>;
}
```

## Error Handling

1. **Git Errors**: Caught and translated to user-friendly messages
2. **Conflict Resolution**: Automatic retry with exponential backoff
3. **Queue Failures**: Dead letter queue for failed operations
4. **Network Issues**: Offline mode with local queue

## Security Considerations

1. **Branch Protection**: Only collaboration branch is modified programmatically
2. **User Isolation**: Each user can only modify their own data
3. **Validation**: All data is validated before writing
4. **Audit Trail**: All operations are logged

## Development Guidelines

### Adding New Features
1. Create new module in `/modules`
2. Define DTOs for validation
3. Implement service with interface
4. Add controller for REST endpoints
5. Add WebSocket events if real-time needed
6. Update CollaborationService if using collaboration branch
7. Add tests

### Example: Adding "Pictures" Feature
```typescript
// 1. Create PictureModule
@Module({
  imports: [CollaborationModule],
  providers: [PictureService],
  controllers: [PictureController],
  exports: [PictureService]
})
export class PictureModule {}

// 2. Create PictureService
@Injectable()
export class PictureService {
  constructor(
    private collaboration: CollaborationService
  ) {}
  
  async savePicture(picture: PictureDto): Promise<void> {
    // Just use the collaboration service!
    await this.collaboration.saveUserData('pictures', picture);
  }
}
```

## Testing Strategy

1. **Unit Tests**: Mock Git operations
2. **Integration Tests**: Use test Git repository
3. **E2E Tests**: Full flow with real Git
4. **Load Tests**: Queue performance under load

## Performance Optimizations

1. **Caching**: In-memory cache for collaboration data
2. **Debouncing**: Batch Git operations
3. **Lazy Loading**: Load user data on demand
4. **Compression**: Compress large JSON files

## Monitoring

1. **Git Queue Metrics**: Queue size, processing time
2. **Sync Performance**: Sync duration, failures
3. **WebSocket Connections**: Active connections, message rates
4. **API Latency**: Response times per endpoint