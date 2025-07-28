export interface CollaborationTask {
  id: string;
  title: string;
  description?: string;
  assignee: string;
  assignedBy: string;
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface ProjectGoal {
  id: string;
  title: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  status: 'active' | 'completed' | 'archived';
}

export interface BuildInfo {
  id: string;
  version: string;
  branch: string;
  author: string;
  timestamp: string;
  status: 'success' | 'failed' | 'in-progress';
  notes?: string;
}

export interface CollaborationData {
  tasks: CollaborationTask[];
  goals: ProjectGoal[];
  builds: BuildInfo[];
  lastUpdated: string;
}

export interface TeamMemberData {
  username: string;
  email: string;
  branch: string;
  data: CollaborationData;
}