import { BaseRecord, UserSpecific, Timestamped } from './Base';

export interface Message extends BaseRecord, UserSpecific, Timestamped {
  to: string;
  from: string;
  text: string;
  threadId?: string;
  read: boolean;
  edited?: boolean;
  editedAt?: string;
}

export interface MessageThread {
  id: string;
  participants: string[];
  lastMessage: Message;
  unreadCount: number;
}