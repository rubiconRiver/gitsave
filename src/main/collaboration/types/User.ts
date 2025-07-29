import { BaseRecord } from './Base';

export interface UserProfile extends BaseRecord {
  username: string;
  email: string;
  displayName: string;
  status: 'online' | 'away' | 'offline' | 'busy';
  statusMessage?: string;
  lastSeen: string;
  avatar?: string;
  timezone?: string;
  workingHours?: {
    start: string; // "09:00"
    end: string;   // "17:00"
    days: number[]; // 0-6, where 0 is Sunday
  };
}