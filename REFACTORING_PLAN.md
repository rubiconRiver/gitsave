# Intentional/GitSave Architecture Analysis & Refactoring Plan

## Current Architecture Issues

### 1. **No Separation of Concerns**
- **main.ts** (1229 lines) handles everything: Git operations, UI state, IPC handlers, file I/O, branch management
- Business logic mixed with Electron boilerplate
- UI components fetch data independently using different methods

### 2. **Multiple Data Sources & Inconsistent State**
- **Branch ownership** checked in 3 different places:
  - `renderer.js` calls `getBranchOwner` 
  - `main.ts` checks ownership during save
  - `branch-manager.html` uses data from `GitDataFetcher`
- **Git status** updated via:
  - Periodic polling (every 2 seconds)
  - Event-based updates after operations
  - Manual refreshes in different components

### 3. **Scattered State Management**
- **Main process state**: `currentRepo`, `timeTravelState`, scattered variables
- **Renderer state**: `isProcessing`, `hasChanges`, `currentBranch`, `isMyBranch`
- **Branch manager**: Own state for `expandedAuthors`, `teamBranches`
- No central state management or synchronization

### 4. **Poor Component Communication**
- 26 IPC handlers with no clear organization
- Windows communicate through IPC without consistent patterns
- Branch changes notify renderer but not branch manager

### 5. **UI Components Issues**
- **Branch visualizer** tries to do too much (timeline + graph + filtering)
- HTML files contain inline JavaScript (600+ lines in branch-manager.html)
- Collaboration system feels "tacked on" with its own separate data flow

## Proposed Refactoring Plan

### Phase 1: Core Architecture Refactoring

1. **Create Service Layer**
   - `GitService.ts` - All Git operations
   - `BranchService.ts` - Branch management & ownership
   - `FileService.ts` - File I/O operations
   - `AuthService.ts` - Authentication & user management

2. **Implement Central State Management**
   - `StateManager.ts` - Single source of truth
   - `AppState` interface with all app state
   - Event-based state updates
   - State synchronization across windows

3. **Reorganize IPC Communication**
   - `IPCRouter.ts` - Route handlers to services
   - Consistent request/response patterns
   - Type-safe IPC interfaces
   - Error handling middleware

### Phase 2: UI Component Refactoring

4. **Split UI Components**
   - Move inline JS to separate files
   - Create reusable components
   - Implement proper data binding
   - Remove duplicate data fetching

5. **Simplify Branch Manager**
   - Remove complex visualization
   - Focus on branch list functionality
   - Use shared state from StateManager
   - Real-time updates via state events

6. **Consolidate Data Flow**
   - All Git data through GitService
   - Subscribe to state changes
   - Remove polling where possible
   - Consistent update patterns

### Phase 3: Collaboration Features

7. **Integrate Collaboration Properly**
   - Move to core services
   - Share authentication state
   - Unified data persistence
   - Better team features integration

### File Structure After Refactoring

```
src/
├── main/
│   ├── index.ts          # Main entry, minimal
│   ├── ipc/
│   │   ├── router.ts     # IPC routing
│   │   └── handlers/     # Organized handlers
│   ├── services/
│   │   ├── GitService.ts
│   │   ├── BranchService.ts
│   │   ├── FileService.ts
│   │   └── AuthService.ts
│   └── state/
│       ├── StateManager.ts
│       └── AppState.ts
├── renderer/
│   ├── main/
│   │   ├── index.ts
│   │   └── components/
│   ├── branch-manager/
│   │   ├── index.ts
│   │   └── components/
│   └── shared/
│       ├── api.ts        # Typed IPC client
│       └── components/
└── common/
    ├── types.ts          # Shared types
    └── constants.ts
```

### Benefits of This Refactoring

1. **Better Collaboration**: Clear separation makes it easier for multiple developers
2. **Consistent Data Flow**: Single source of truth prevents sync issues
3. **Maintainable Code**: Each service has a single responsibility
4. **Easier Testing**: Services can be unit tested independently
5. **Better Performance**: Reduced redundant operations and polling

## Implementation Approach

### Stage 1: Core Services (Day 1)
- Extract Git operations to GitService
- Create StateManager with basic state
- Keep existing UI working with new services
- **Deliverable**: Working app with services layer

### Stage 2: IPC Refactoring (Day 2)  
- Create IPCRouter
- Organize handlers by domain
- Add TypeScript interfaces
- **Deliverable**: Clean IPC communication

### Stage 3: State Management (Day 3)
- Implement full StateManager
- Convert components to use central state
- Remove redundant data fetching
- **Deliverable**: Single source of truth

### Stage 4: UI Cleanup (Day 4)
- Extract inline JavaScript
- Simplify branch manager
- Create reusable components
- **Deliverable**: Clean, modular UI

### Stage 5: Polish & Testing (Day 5)
- Integration testing
- Performance optimization
- Documentation
- **Deliverable**: Production-ready refactored app

## Key Principles

1. **Incremental Changes**: Each stage leaves the app functional
2. **Clear Boundaries**: Services don't know about Electron/UI
3. **Type Safety**: Full TypeScript coverage
4. **Event-Driven**: State changes propagate automatically
5. **Testable**: Each component can be tested in isolation

## Success Metrics

- ✅ No file over 200 lines
- ✅ Clear separation between main/renderer
- ✅ Single source of truth for all data
- ✅ No duplicate code or data fetching
- ✅ Easy to understand for new developers