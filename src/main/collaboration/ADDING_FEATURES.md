# How to Add New Collaboration Features

This guide explains how to add new features to the collaboration system.
For example, if your partner says "add a picture space", here's how to do it.

## Example: Adding a Picture Space Feature

### Step 1: Create the Type Definition
Create `src/main/collaboration/types/Picture.ts`:

```typescript
import { BaseRecord, UserSpecific } from './Base';

export interface Picture extends BaseRecord, UserSpecific {
  filename: string;
  caption?: string;
  url?: string;        // If stored externally
  data?: string;       // Base64 encoded if stored in Git
  tags: string[];
  sharedWith: string[]; // Usernames who can see this
  linkedTo?: {
    branch?: string;
    task?: string;
    message?: string;
  };
}
```

### Step 2: Create the Table Class
Create `src/main/collaboration/tables/PictureTable.ts`:

```typescript
import { BaseTable } from './BaseTable';
import { Picture } from '../types/Picture';

export class PictureTable extends BaseTable<Picture> {
  
  /**
   * Add a picture
   */
  async add(
    filename: string,
    data: string,
    caption?: string
  ): Promise<Picture> {
    const picture: Picture = {
      id: this.generateId(),
      userId: this.store.getCurrentUsername(),
      filename,
      data,
      caption,
      tags: [],
      sharedWith: ['all'], // Share with everyone by default
      createdAt: this.now(),
      updatedAt: this.now()
    };
    
    const pictures = this.getMyItems('pictures');
    pictures.push(picture);
    
    await this.save('pictures', pictures);
    return picture;
  }
  
  /**
   * Get pictures shared with me
   */
  async getSharedWithMe(): Promise<Picture[]> {
    const myUsername = this.store.getCurrentUsername();
    const allPictures = this.getAllUsersItems('pictures');
    
    return allPictures.filter(pic => 
      pic.sharedWith.includes('all') || 
      pic.sharedWith.includes(myUsername)
    );
  }
}
```

### Step 3: Update the CollaborationData Interface
In `CollaborationRepository.ts`, add:

```typescript
export interface CollaborationData {
  [username: string]: {
    // ... existing properties ...
    pictures?: any[];  // NEW: Picture storage
  };
}
```

### Step 4: Add to CollaborationStore
In `CollaborationStore.ts`:

```typescript
import { PictureTable } from './tables/PictureTable';

export class CollaborationStore {
  // ... existing code ...
  public pictures: PictureTable;  // NEW
  
  constructor() {
    // ... existing code ...
    this.pictures = new PictureTable(this);  // NEW
  }
}
```

### Step 5: Create UI Handler
In `src/main/ipc/handlers/collabHandlers.ts`, add:

```typescript
'collab:addPicture': async function(this: IPCContext, _, imageData: string, caption?: string) {
  const store = CollaborationStore.getInstance();
  const picture = await store.pictures.add('screenshot.png', imageData, caption);
  return { success: true, picture };
},

'collab:getPictures': async function(this: IPCContext) {
  const store = CollaborationStore.getInstance();
  const pictures = await store.pictures.getSharedWithMe();
  return { success: true, pictures };
}
```

## That's It!

Now when your partner says "add a picture space", you have:
- A place to store pictures (in each user's folder)
- Methods to add and retrieve pictures
- Automatic Git syncing
- No conflicts (each user owns their pictures)

## Common Feature Requests and How to Implement:

### "Add a notes section"
- Type: `Note` with `title`, `content`, `tags`
- Table: `NoteTable` with `create()`, `search()`, `getByTag()`

### "Add a code review system"
- Type: `CodeReview` with `branch`, `files`, `comments`, `status`
- Table: `CodeReviewTable` with `request()`, `comment()`, `approve()`

### "Add time tracking"
- Type: `TimeEntry` with `task`, `duration`, `date`, `description`
- Table: `TimeTable` with `startTimer()`, `stopTimer()`, `getReport()`

### "Add a shared calendar"
- Type: `CalendarEvent` with `title`, `date`, `attendees`, `description`
- Table: `CalendarTable` with `schedule()`, `getUpcoming()`, `getByDate()`

## Remember:
- Each user owns their data (no conflicts)
- Everything syncs automatically via Git
- The store hides all the complexity
- Tables provide the easy-to-use methods