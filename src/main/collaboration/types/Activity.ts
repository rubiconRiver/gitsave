import { BaseRecord, UserSpecific, Timestamped } from './Base';

export type ActivityType = 
  | 'commit'
  | 'branch-create'
  | 'branch-merge'
  | 'task-create'
  | 'task-update'
  | 'task-complete'
  | 'message-sent'
  | 'pr-create'
  | 'pr-merge'
  | 'code-review'
  | 'status-update';

export interface Activity extends BaseRecord, UserSpecific, Timestamped {
  type: ActivityType;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  branch?: string;
  commit?: string;
  visible: boolean; // Allow users to hide certain activities
}