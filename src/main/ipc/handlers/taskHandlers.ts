import { IPCHandler, IPCContext } from '../IPCRouter';
import { CollaborationStore } from '../../collaboration/CollaborationStore';

export const taskHandlers: { [key: string]: IPCHandler } = {
  'tasks:create': async function(this: IPCContext, _, title: string, priority?: 'low' | 'medium' | 'high' | 'urgent') {
    try {
      const store = this.getCollaborationStore?.();
      if (!store) {
        return { error: 'Collaboration not initialized' };
      }
      
      const task = await store.tasks.create(title, priority || 'medium');
      return { success: true, task };
    } catch (error: any) {
      return { error: error.message || 'Failed to create task' };
    }
  },

  'tasks:getMine': async function(this: IPCContext) {
    try {
      const store = this.getCollaborationStore?.();
      if (!store) {
        return { error: 'Collaboration not initialized' };
      }
      
      const tasks = await store.tasks.getMine();
      return { success: true, tasks };
    } catch (error: any) {
      return { error: error.message || 'Failed to get tasks' };
    }
  },

  'tasks:updateStatus': async function(this: IPCContext, _, taskId: string, status: string) {
    try {
      const store = this.getCollaborationStore?.();
      if (!store) {
        return { error: 'Collaboration not initialized' };
      }
      
      await store.tasks.updateStatus(taskId, status as any);
      return { success: true };
    } catch (error: any) {
      return { error: error.message || 'Failed to update task' };
    }
  },

  'tasks:getAll': async function(this: IPCContext) {
    try {
      const store = this.getCollaborationStore?.();
      if (!store) {
        return { error: 'Collaboration not initialized' };
      }
      
      // Get tasks from all users
      const myTasks = await store.tasks.getCreatedByMe();
      const assignedToMe = await store.tasks.getMine();
      
      return { 
        success: true, 
        myTasks,
        assignedToMe,
        allTasks: [...myTasks, ...assignedToMe].filter((task, index, self) => 
          index === self.findIndex((t) => t.id === task.id)
        )
      };
    } catch (error: any) {
      return { error: error.message || 'Failed to get all tasks' };
    }
  }
};