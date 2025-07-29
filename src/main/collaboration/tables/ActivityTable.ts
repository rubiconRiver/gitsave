import { BaseTable } from './BaseTable';
import { Activity, ActivityType } from '../types/Activity';

/**
 * ACTIVITY TABLE - Team activity feed
 * 
 * This tracks what everyone is doing in the project.
 * Think of it like a team Twitter feed for your code.
 * 
 * USAGE:
 * - Log activity: await activity.log('commit', 'Fixed the bug')
 * - Get feed: const feed = await activity.getFeed()
 * - Get user activity: const actions = await activity.getByUser('partner')
 * 
 * AUTOMATIC TRACKING:
 * The app automatically logs activities like:
 * - Commits
 * - Branch creation/merges
 * - Task updates
 * - Messages sent
 */
export class ActivityTable extends BaseTable<Activity> {
  
  /**
   * Log an activity
   */
  async log(
    type: ActivityType,
    title: string,
    metadata: Record<string, any> = {}
  ): Promise<Activity> {
    const activity: Activity = {
      id: this.generateId(),
      userId: this.store.getCurrentUsername(),
      type,
      title,
      metadata,
      visible: true,
      timestamp: this.now(),
      createdAt: this.now(),
      updatedAt: this.now()
    };
    
    // Add branch info if available
    if (metadata.branch) {
      activity.branch = metadata.branch;
    }
    
    // Add commit info if available
    if (metadata.commit) {
      activity.commit = metadata.commit;
    }
    
    // Get current activities
    const activities = this.getMyItems('activity');
    activities.push(activity);
    
    // Keep only last 100 activities per user
    if (activities.length > 100) {
      activities.splice(0, activities.length - 100);
    }
    
    await this.save('activity', activities);
    return activity;
  }
  
  /**
   * Get combined activity feed from all users
   */
  async getFeed(limit: number = 50): Promise<Activity[]> {
    const allActivities = this.getAllUsersItems('activity');
    
    // Filter out hidden activities
    const visibleActivities = allActivities.filter(a => a.visible);
    
    // Sort by timestamp (newest first)
    visibleActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Return limited set
    return visibleActivities.slice(0, limit);
  }
  
  /**
   * Get activities by a specific user
   */
  async getByUser(username: string, limit: number = 20): Promise<Activity[]> {
    const activities = this.getUserItems(username, 'activity');
    
    // Sort by timestamp (newest first)
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return activities.slice(0, limit);
  }
  
  /**
   * Get activities for a branch
   */
  async getByBranch(branchName: string): Promise<Activity[]> {
    const allActivities = this.getAllUsersItems('activity');
    
    return allActivities
      .filter(a => a.branch === branchName && a.visible)
      .sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }
  
  /**
   * Get activities by type
   */
  async getByType(type: ActivityType): Promise<Activity[]> {
    const allActivities = this.getAllUsersItems('activity');
    
    return allActivities
      .filter(a => a.type === type && a.visible)
      .sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }
  
  /**
   * Hide an activity (soft delete)
   */
  async hide(activityId: string): Promise<void> {
    const activities = this.getMyItems('activity');
    const activity = activities.find(a => a.id === activityId);
    
    if (activity) {
      activity.visible = false;
      activity.updatedAt = this.now();
      await this.save('activity', activities);
    }
  }
  
  /**
   * Get today's activities
   */
  async getToday(): Promise<Activity[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allActivities = this.getAllUsersItems('activity');
    
    return allActivities
      .filter(a => {
        const activityDate = new Date(a.timestamp);
        return activityDate >= today && a.visible;
      })
      .sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }
  
  /**
   * Quick helpers for common activities
   */
  async logCommit(branch: string, message: string, hash: string): Promise<void> {
    await this.log('commit', message, { branch, commit: hash });
  }
  
  async logBranchCreate(branchName: string): Promise<void> {
    await this.log('branch-create', `Created branch ${branchName}`, { branch: branchName });
  }
  
  async logTaskComplete(taskTitle: string): Promise<void> {
    await this.log('task-complete', `Completed: ${taskTitle}`, { task: taskTitle });
  }
}