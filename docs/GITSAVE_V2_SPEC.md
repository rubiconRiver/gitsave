# GitSave V2 Specification

## Mission
Build GitSave V2 with a widget-based UI, NestJS backend, and zero Git CLI dependency.

## Core Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Electron
- **Backend**: NestJS (local server)
- **Git**: isomorphic-git (no CLI required!)
- **UI**: React-Grid-Layout for draggable widgets
- **State**: Zustand + React Query
- **Styling**: Tailwind CSS

### Project Structure
```
gitsave-v2/
├── apps/
│   ├── electron/        # Electron main process
│   ├── frontend/        # React app
│   └── backend/         # NestJS server
├── packages/
│   └── shared/          # Shared types
└── package.json         # Monorepo root
```

## Phase 1: MVP - 5 Core Widgets

### 1. Utils Widget (100px min width)
```typescript
interface UtilsWidget {
  buttons: [
    { icon: "📁", label: "Folder", action: "open-folder" },
    { icon: "🌐", label: "GitHub", action: "open-github" },
    { icon: "🤖", label: "Claude", action: "open-claude" },
    { icon: "⚡", label: "Terminal", action: "open-terminal" }
  ]
}
```

### 2. Intents Widget (200px min width) - THE STAR ⭐
```typescript
interface IntentsWidget {
  theme: "green" // #7ee787
  background: "#1c2128" // Darker for emphasis
  intents: Intent[]
}

interface Intent {
  id: string
  text: string
  priority: "high" | "medium" | "low"
  completed: boolean
}
```

### 3. Sync Widget (120px min width)
```typescript
interface SyncWidget {
  status: "synced" | "behind" | "ahead" | "diverged"
  count?: number
  action?: "fetch" | "pull" | "push"
}
```

### 4. Branch Widget (160px min width)
```typescript
interface BranchWidget {
  currentBranch: string
  actions: {
    new: () => void
    undo: () => void
  }
}
```

### 5. Save Widget (180px min width) - PRIMARY ACTION
```typescript
interface SaveWidget {
  fileCount: number
  enabled: boolean
  theme: "green" // #238636 background
}
```

## Backend Services (NestJS)

### Core Modules

```typescript
// 1. Git Module - Zero CLI dependency!
@Module({
  providers: [GitService]
})
export class GitModule {}

@Injectable()
export class GitService {
  async getStatus() // Using isomorphic-git
  async commit(message: string)
  async push(token: string)
  async getCurrentBranch()
  async getRemoteStatus() // ahead/behind calculation
}

// 2. Intents Module
@Module({
  providers: [IntentsService]
})
export class IntentsModule {}

@Injectable()
export class IntentsService {
  async getIntents()
  async createIntent(text: string, priority: Priority)
  async updateIntent(id: string, updates: Partial<Intent>)
  async deleteIntent(id: string)
}

// 3. Apps Module (for utils)
@Module({
  providers: [AppsService]
})
export class AppsModule {}

@Injectable()
export class AppsService {
  async openFolder(path: string)
  async openGitHub(repoUrl: string)
  async openClaude()
  async openTerminal(path: string)
}
```

### API Endpoints

```typescript
// Git operations
GET  /api/git/status
GET  /api/git/branch
POST /api/git/commit
POST /api/git/push
GET  /api/git/sync-status

// Intents
GET    /api/intents
POST   /api/intents
PATCH  /api/intents/:id
DELETE /api/intents/:id

// Utils
POST /api/apps/open-folder
POST /api/apps/open-github
POST /api/apps/open-claude
POST /api/apps/open-terminal
```

### WebSocket Events

```typescript
@WebSocketGateway()
export class GitGateway {
  @SubscribeMessage('watch-status')
  handleWatchStatus() {
    // Emit file changes in real-time
  }
}
```

## Frontend Architecture

### Widget Component Structure

```typescript
// Base widget wrapper
interface WidgetProps {
  id: string
  title: string
  minWidth: number
  children: React.ReactNode
}

// Widget Bar Container
<GridLayout
  className="widget-bar"
  layout={userLayout}
  onLayoutChange={saveLayout}
  draggableHandle=".widget-header"
>
  <div key="utils"><UtilsWidget /></div>
  <div key="intents"><IntentsWidget /></div>
  <div key="sync"><SyncWidget /></div>
  <div key="branch"><BranchWidget /></div>
  <div key="save"><SaveWidget /></div>
</GridLayout>
```

### State Management

```typescript
// Zustand stores
const useGitStore = create((set) => ({
  status: null,
  branch: 'main',
  syncStatus: 'synced'
}))

const useIntentsStore = create((set) => ({
  intents: [],
  addIntent: (intent) => set(state => ({
    intents: [...state.intents, intent]
  }))
}))
```

## Implementation Order

### Week 1: Foundation
1. Set up monorepo with nx/lerna
2. Create Electron app that starts NestJS
3. Basic React app with static widgets
4. Get drag-and-drop working

### Week 2: Git Integration  
1. Implement GitService with isomorphic-git
2. File watching with chokidar
3. Real-time status updates
4. Test without Git CLI installed!

### Week 3: Full Features
1. Intents persistence (SQLite)
2. All widget interactions working
3. GitHub push with token auth
4. Utils launching external apps

### Week 4: Polish
1. Widget persistence/layouts
2. Error handling
3. Auto-updater
4. Package for Mac/Windows

## Success Criteria
- [ ] All 5 widgets visible and draggable
- [ ] Can commit without Git installed
- [ ] Can push to GitHub with token
- [ ] Intents persist between sessions
- [ ] Utils open correct apps
- [ ] Real-time file change detection

## Future Phases
- **Phase 2**: GitHub OAuth (no token needed)
- **Phase 3**: AI agents for branch analysis
- **Phase 4**: Collaboration features
- **Phase 5**: Time travel UI

## Key Decisions
1. **NestJS**: Yes, for complex service orchestration
2. **isomorphic-git**: Yes, eliminates Git dependency
3. **Local server**: Yes, better than IPC for our needs
4. **React-Grid-Layout**: Yes, proven drag-and-drop
5. **Start simple**: 5 widgets first, then iterate