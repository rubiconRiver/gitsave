import { BaseRecord, UserSpecific, Timestamped } from './Base';

export interface BranchInfo extends BaseRecord, UserSpecific, Timestamped {
  branchName: string;
  owner: string;
  ownerEmail: string;
  status: 'active' | 'merged' | 'abandoned' | 'review';
  description?: string;
  parentBranch: string;
  lastCommit?: {
    hash: string;
    message: string;
    timestamp: string;
  };
  metadata?: {
    purpose?: string;
    jiraTicket?: string;
    prNumber?: number;
  };
}