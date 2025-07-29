import { BaseTable } from './BaseTable';
import { Task, TaskStatus, TaskPriority } from '../types/Task';

/**
 * TASK TABLE - Manages todo items and assignments
 * 
 * This table handles tasks/todos for the team.
 * Each user can create tasks and assign them to others.
 * 
 * USAGE:
 * - Create task: await tasks.create('Fix the bug', 'high')
 * - Assign task: await tasks.assign(taskId, 'partner')
 * - Update status: await tasks.updateStatus(taskId, 'done')
 * - Get my tasks: const myTasks = await tasks.getMine()
 * 
 * FEATURES:
 * - Tasks can be assigned to anyone
 * - Tasks can be linked to branches
 * - Tasks can have subtasks
 * - Tasks can be blocked by other tasks
 */
export class TaskTable extends BaseTable<Task> {
  
  /**
   * Create a new task
   */
  async create(
    title: string,
    priority: TaskPriority = 'medium',
    assignee?: string
  ): Promise<Task> {
    const task: Task = {
      id: this.generateId(),
      userId: this.store.getCurrentUsername(),
      title,
      status: 'todo',
      priority,
      assignee: assignee || this.store.getCurrentUsername(),
      creator: this.store.getCurrentUsername(),
      tags: [],
      createdAt: this.now(),
      updatedAt: this.now()
    };
    
    // Get current tasks
    const tasks = this.getMyItems('tasks');
    tasks.push(task);
    
    // Save
    await this.save('tasks', tasks);
    
    return task;
  }
  
  /**
   * Get all tasks assigned to current user
   */
  async getMine(): Promise<Task[]> {
    const myUsername = this.store.getCurrentUsername();
    const allTasks = this.getAllUsersItems('tasks');
    
    return allTasks.filter(task => task.assignee === myUsername);
  }
  
  /**
   * Get all tasks created by current user
   */
  async getCreatedByMe(): Promise<Task[]> {
    return this.getMyItems('tasks');
  }
  
  /**
   * Get tasks by status
   */
  async getByStatus(status: TaskStatus): Promise<Task[]> {
    const allTasks = this.getAllUsersItems('tasks');
    return allTasks.filter(task => task.status === status);
  }
  
  /**
   * Get tasks assigned to a specific user
   */
  async getAssignedTo(username: string): Promise<Task[]> {
    const allTasks = this.getAllUsersItems('tasks');
    return allTasks.filter(task => task.assignee === username);
  }
  
  /**
   * Update task status
   */
  async updateStatus(taskId: string, status: TaskStatus): Promise<void> {
    const tasks = this.getMyItems('tasks');
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      task.status = status;
      task.updatedAt = this.now();
      await this.save('tasks', tasks);
    }
  }
  
  /**
   * Assign task to someone
   */
  async assign(taskId: string, assignee: string): Promise<void> {
    const tasks = this.getMyItems('tasks');
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      task.assignee = assignee;
      task.updatedAt = this.now();
      await this.save('tasks', tasks);
    }
  }
  
  /**
   * Update task details
   */
  async update(taskId: string, updates: Partial<Task>): Promise<void> {
    const tasks = this.getMyItems('tasks');
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        ...updates,
        updatedAt: this.now()
      };
      await this.save('tasks', tasks);
    }
  }
  
  /**
   * Add a comment to a task
   */
  async addComment(taskId: string, text: string): Promise<void> {
    const tasks = this.getMyItems('tasks');
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      if (!task.comments) task.comments = [];
      
      task.comments.push({
        id: this.generateId(),
        userId: this.store.getCurrentUsername(),
        text,
        timestamp: this.now()
      });
      
      task.updatedAt = this.now();
      await this.save('tasks', tasks);
    }
  }
  
  /**
   * Get tasks for a specific branch
   */
  async getByBranch(branchName: string): Promise<Task[]> {
    const allTasks = this.getAllUsersItems('tasks');
    return allTasks.filter(task => task.branch === branchName);
  }
  
  /**
   * Link task to a branch
   */
  async linkToBranch(taskId: string, branchName: string): Promise<void> {
    const tasks = this.getMyItems('tasks');
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      task.branch = branchName;
      task.updatedAt = this.now();
      await this.save('tasks', tasks);
    }
  }
}