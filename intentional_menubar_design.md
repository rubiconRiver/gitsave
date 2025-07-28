# Intentional Menubar - Design Document
*Effortless version control for everyone*

## Vision
Make version control as natural as saving a document. Remove the technical barriers between creating and preserving work.

## Core Philosophy
- **Automatic safety**: Never lose work
- **Intentional milestones**: Mark meaningful progress
- **Visual understanding**: See your project's story
- **Team awareness**: Know who's working on what

## Terminology

### Commit Types
- **Snapshot**: Automatic save (WIP commit)
  - Triggered by one-click save
  - Default message: "WIP"
  - Meant for safety, not history
  - Hidden from timeline (except branch tips)

- **Milestone**: Intentional commit
  - Has a meaningful message
  - Represents completed work
  - Shows in timeline
  - Part of project story

### Views
- **Snapshot List**: Branch and team overview
  - Shows all branches grouped by owner
  - Expandable sections (3 branches → all)
  - Team branches at top
  - Exact time display ("2 hours 15 minutes ago")

- **Snapshot Timeline**: Visual commit history
  - 24-hour default view
  - Scrollable through time
  - Only shows milestones (not snapshots)
  - Branch tips always visible

## User Experience

### Main Window
- Project name and current branch
- Branch ownership indicator
- One-click snapshot button (💾)
- Optional commit message field
- File change status
- Action buttons: Sync, Push, Branch
- Quick links: Open Folder, View on GitHub

### Branch Ownership
- Automatic tracking of who created each branch
- Visual warnings when working on someone else's branch
- Option to create your own branch
- Team branches (main, release/*) shared by all

### Time Display
- Precise elapsed time for recent changes
- Format: "X hours Y minutes ago"
- No vague terms like "Today" or "Yesterday"
- Helps understand work patterns

## Features

### Core Functionality
1. **One-Click Snapshots**
   - Big green button
   - Saves all changes instantly
   - No commit message required
   - Automatic push attempt

2. **Branch Management**
   - See all branches at a glance
   - Know who owns what
   - Easy branch creation
   - Protected team branches

3. **Visual Timeline**
   - See project evolution
   - Time travel to any point
   - Understand team activity
   - Focus on meaningful changes

### Quality of Life
- Open project folder in Finder
- Jump to GitHub repository
- Change tracking indicator
- Keyboard shortcuts (Cmd+S)
- Automatic fetch in background

## Technical Details

### Data Storage
- `/intentional.dev/branches/ownership.json` - Branch ownership
- `/intentional.dev/branches/team-branches.json` - Team branch config
- Electron Store for preferences

### Filtering Logic
- GitDataFetcher filters WIP commits
- Preserves branch tips even if WIP
- Reconnects parent relationships
- Maintains graph integrity

### Architecture
- Electron menubar app
- TypeScript + Simple Git
- Cytoscape.js for visualization
- IPC for window communication

## Design Principles

### For Non-Technical Users
- No git terminology in UI
- Visual feedback for all actions
- Clear error messages with guidance
- Protect from accidental mistakes

### For Developers
- Respect git conventions
- Don't hide power features
- Allow escape hatches
- Maintain git compatibility

## Future Enhancements
- Conflict resolution UI
- File-level rollback
- Team presence indicators
- Activity notifications
- Integration with Intentional platform

## Success Metrics
- Zero lost work incidents
- Reduced "git anxiety"
- Increased commit frequency
- Better team coordination
- Natural version control habits