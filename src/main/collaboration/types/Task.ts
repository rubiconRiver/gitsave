import { BaseRecord, UserSpecific } from './Base';

export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task extends BaseRecord, UserSpecific {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  creator: string;
  dueDate?: string;
  tags: string[];
  branch?: string;
  blockedBy?: string[];
  subtasks?: string[]; // IDs of subtasks
  parentTask?: string; // ID of parent task
  comments?: TaskComment[];
}

export interface TaskComment {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
}