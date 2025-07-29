# GitSave Widget UI Design Documentation

## Overview
GitSave is being redesigned with a flexible widget-based UI that starts as a compact bar but can be customized by users. This modular approach allows users to arrange widgets however they prefer - horizontal bar, grid layout, or any configuration that fits their workflow.

## Design Philosophy
- **Compact by Default**: Starts as minimal height (80px) bar to preserve screen space
- **Fully Configurable**: Users can resize, rearrange, and stack widgets as needed
- **Action-First**: Large, prominent Save button always visible
- **Modular**: Each feature is a self-contained widget that can be moved independently
- **No Wasted Space**: Window adapts to content, no empty areas

## Core Layout

### Default Widget Order (Compact Bar)
1. **Utils** - Quick access tools
2. **Intents** - Project goals and organization  
3. **Sync** - Repository sync status
4. **Branch** - Branch management
5. **Save** - Primary action (default: rightmost)

### Layout Flexibility
- **Default**: Horizontal bar (all widgets in a row)
- **Expanded**: Users can drag widgets into multiple rows
- **Grid**: Widgets can be arranged in a grid pattern
- **Stacked**: Vertical arrangements for narrow windows
- **Custom**: Any arrangement the user prefers

### Widget Specifications

#### Utils Widget
- **Width**: 100px minimum
- **Purpose**: Quick access to external tools
- **Features**:
  - 2x2 grid of utility buttons
  - Icons: Folder (📁), GitHub (🌐), Claude (🤖), Terminal (⚡)
  - Each button opens respective external application

#### Intents Widget (Special Highlight)
- **Width**: 200px minimum
- **Purpose**: Project goal tracking and organization
- **Visual Style**: Green theme (#7ee787) to emphasize importance
- **Features**:
  - Lists project goals/intents with priority dots
  - Priority indicators: High (red), Medium (orange), Low (blue)
  - Shows count in header
  - "+ Add intent" button at bottom
  - Darker background (#1c2128) for visual distinction

#### Sync Widget
- **Width**: 120px minimum
- **Purpose**: Repository sync status and actions
- **Features**:
  - Status indicator (green=synced, orange=behind, blue=ahead)
  - Status text (e.g., "2 behind", "Up to date")
  - Single action button (Fetch, Pull & Merge, or Push)

#### Branch Widget
- **Width**: 160px minimum
- **Purpose**: Branch display and management
- **Features**:
  - Current branch name with dropdown indicator
  - Two action buttons: "+ New" and "↺ Undo"
  - Hover state on branch selector

#### Save Widget (Primary Action)
- **Width**: 180px minimum
- **Purpose**: Commit changes
- **Visual Style**: Green background (#238636) for prominence
- **Features**:
  - Large button with file count
  - Disabled state when no changes
  - Clear visual hierarchy as primary action

## Visual Design Details

### Colors
- **Background**: #0d1117 (main), #161b22 (widgets)
- **Borders**: #30363d (default), #58a6ff (hover)
- **Save Button**: #238636 (bg), #2ea043 (hover)
- **Intents**: #7ee787 (theme color), #1c2128 (background)
- **Text**: #c9d1d9 (primary), #8b949e (secondary)

### Typography
- **Font**: System font stack (-apple-system, BlinkMacSystemFont, etc.)
- **Widget Headers**: 11px, font-weight 500
- **Button Text**: 16px for Save, 11px for mini buttons
- **Content**: 12px standard

### Spacing
- **Widget Gap**: 10px
- **Bar Padding**: 10px
- **Widget Content Padding**: 10px
- **Header Padding**: 6px 10px

## Interaction States

### Hover Effects
- Widget borders change to #58a6ff
- Subtle shadow appears (0 4px 12px rgba(88, 166, 255, 0.15))
- Save button brightens and lifts slightly

### Active States
- Buttons depress on click
- Visual feedback for all interactive elements

## Future Considerations

### When Changes Are Present
- A "Status" widget appears showing changed files
- Can expand to show all files with scroll
- File indicators: + (green), M (orange), - (red)

### Widget States
- **Collapsed**: Widgets shrink to just icons (50px width)
- **Expanded**: Widgets can grow to show more content
- **Stacked**: Multiple widgets can occupy the same column
- **Detached**: Possibility for floating widget panels

### Layout Persistence
- User arrangements are saved to preferences
- Different layouts for different screen sizes
- Quick preset buttons (Compact, Standard, Expanded)
- Reset to default option

### Responsiveness
- Widgets reflow based on window size
- Minimum widget sizes are preserved
- Smart stacking on narrow windows
- Touch-friendly sizing for potential tablet use

## Implementation Notes

1. **React Components**: Each widget should be a separate React component
2. **State Management**: Use React Context or Zustand for global state
3. **Layout System**: 
   - Implement CSS Grid for flexible positioning
   - React-Grid-Layout or similar for drag-and-drop
   - Save layouts to electron-store
4. **Widget Features**:
   - Draggable (drag to reorder/reposition)
   - Resizable (within min/max constraints)
   - Collapsible (to icon-only mode)
   - Configurable (settings per widget)
5. **Electron Integration**: 
   - Window dynamically resizes to fit content
   - Remember window position/size
   - Support for always-on-top option

## File Structure for New Implementation
```
src/
├── renderer/
│   ├── components/
│   │   ├── widgets/
│   │   │   ├── SaveWidget.tsx
│   │   │   ├── BranchWidget.tsx
│   │   │   ├── SyncWidget.tsx
│   │   │   ├── IntentsWidget.tsx
│   │   │   ├── UtilsWidget.tsx
│   │   │   └── StatusWidget.tsx
│   │   ├── WidgetBar.tsx
│   │   └── Widget.tsx (base component)
│   ├── hooks/
│   │   ├── useGitStatus.ts
│   │   ├── useBranch.ts
│   │   └── useIntents.ts
│   └── App.tsx
```

This design prioritizes clarity, efficiency, and flexibility. The widget system starts compact but grows with user needs, and the new Intents feature provides a powerful way to organize work and track project goals.